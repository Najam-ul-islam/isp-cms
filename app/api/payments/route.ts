import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import { getClientPaymentSummary, getInvoicePaymentSummary } from '@/lib/payment-calculator';

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to read payments
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const method = searchParams.get('method');

    const filters = {
      clientId: clientId || undefined,
      startDate,
      endDate,
      method: method || undefined,
    };

    // Get payments with client data
    const payments = await prisma.payment.findMany({
      where: {
        ...(clientId && { clientId }),
        ...(admin.companyId && { companyId: admin.companyId }),
        ...(startDate || endDate) && {
          paymentDate: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          }
        },
        ...(method && { method })
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            area: true, // Include area for client display
            packageId: true,
            price: true, // This is the price the client pays (might be different from package price)
            package: {
              select: {
                id: true,
                name: true,
                price: true, // This is the actual package price
              }
            }
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    });

    // Enhance payments with invoice and payment summary data
    const paymentsWithSummary = await Promise.all(
      payments.map(async (payment) => {
        // If the payment has an associated invoice, get its summary
        if (payment.invoiceId) {
          try {
            const invoiceSummary = await getInvoicePaymentSummary(payment.invoiceId);
            return {
              ...payment,
              totalAmount: invoiceSummary.total,
              totalPaid: invoiceSummary.totalPaid,
              remainingAmount: invoiceSummary.remainingAmount,
              overpaidAmount: invoiceSummary.overpaidAmount,
              effectivePaymentStatus: invoiceSummary.effectivePaymentStatus,
              invoice: {
                id: payment.invoiceId,
                ...invoiceSummary
              }
            };
          } catch (error) {
            console.error(`Error getting invoice summary for invoice ${payment.invoiceId}:`, error);
            // If invoice summary fails, fall back to client summary
            const clientSummary = await getClientPaymentSummary(payment.clientId);
            return {
              ...payment,
              totalAmount: clientSummary.total,
              totalPaid: clientSummary.totalPaid,
              remainingAmount: clientSummary.remainingAmount,
              overpaidAmount: clientSummary.overpaidAmount,
              effectivePaymentStatus: clientSummary.effectivePaymentStatus
            };
          }
        } else {
          // If no invoice is associated, use client summary
          const clientSummary = await getClientPaymentSummary(payment.clientId);
          return {
            ...payment,
            totalAmount: clientSummary.total,
            totalPaid: clientSummary.totalPaid,
            remainingAmount: clientSummary.remainingAmount,
            overpaidAmount: clientSummary.overpaidAmount,
            effectivePaymentStatus: clientSummary.effectivePaymentStatus
          };
        }
      })
    );

    return NextResponse.json(paymentsWithSummary);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to create payments
    if (admin.role !== 'SUPER_ADMIN' && admin.role !== 'ADMIN' && admin.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, amount, method, notes, invoiceId } = body; // Added invoiceId

    if (!clientId || !amount) {
      return NextResponse.json({ error: 'Client ID and amount are required' }, { status: 400 });
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    // Start a transaction to ensure consistency of core operations
    const { payment, targetInvoiceId } = await prisma.$transaction(async (tx) => {
      // First, get the client to check their details
      const client = await tx.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        throw new Error('Client not found');
      }

      let targetInvoiceId: string | null = null;

      // If invoiceId is provided, use that invoice
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId, clientId }
        });

        if (!invoice) {
          throw new Error('Invoice not found or does not belong to client');
        }

        targetInvoiceId = invoice.id;
      } else {
        // If no invoiceId is provided, find the latest unpaid or partially paid invoice
        const latestUnpaidInvoice = await tx.invoice.findFirst({
          where: {
            clientId,
            status: { in: ['unpaid', 'partial'] }
          },
          orderBy: {
            issuedDate: 'desc'
          }
        });

        if (latestUnpaidInvoice) {
          targetInvoiceId = latestUnpaidInvoice.id;
        } else {
          // If no unpaid/partial invoices exist, create a new one based on client price
          const newInvoice = await tx.invoice.create({
            data: {
              clientId,
              amount: client.price, // Use client price as invoice amount
              dueDate: new Date(), // Set due date to current date initially
              description: `Automatic invoice for client package`,
              companyId: admin.companyId
            }
          });
          targetInvoiceId = newInvoice.id;
        }
      }

      // Create the payment associated with the invoice
      const newPayment = await tx.payment.create({
        data: {
          clientId,
          invoiceId: targetInvoiceId,
          amount: parseFloat(amount),
          method: method || 'CASH',
          notes: notes || '',
          companyId: admin.companyId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              area: true,
              packageId: true,
              price: true,
              package: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                }
              }
            }
          }
        }
      });

      // Calculate and update invoice status based on the new payment
      // First get the invoice amount
      const invoice = await tx.invoice.findUnique({
        where: { id: targetInvoiceId },
        select: { amount: true }
      });

      let totalPaid = 0;
      if (invoice) {
        // Get all payments for this invoice to calculate status
        const payments = await tx.payment.findMany({
          where: { invoiceId: targetInvoiceId },
          select: { amount: true }
        });

        totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

        // Determine status based on payment amounts
        let status: 'unpaid' | 'partial' | 'paid';
        if (totalPaid >= invoice.amount) {
          status = 'paid';
        } else if (totalPaid > 0 && totalPaid < invoice.amount) {
          status = 'partial';
        } else {
          status = 'unpaid';
        }

        // Update the invoice status
        await tx.invoice.update({
          where: { id: targetInvoiceId },
          data: {
            status
          }
        });
      }

      // Recalculate client's overall payment status
      const updatedSummary = await getClientPaymentSummary(clientId);

      // Update client's payment status
      await tx.client.update({
        where: { id: clientId },
        data: {
          paymentStatus: updatedSummary.effectivePaymentStatus
        }
      });

      // If the invoice is now fully paid, check if we should extend expiry date
      if (invoice && totalPaid >= invoice.amount) {
        const packageInfo = await tx.package.findUnique({
          where: { id: client.packageId }
        });

        if (packageInfo) {
          // Extend expiry date safely: baseDate = max(client.expiryDate, currentDate)
          const baseDate = client.expiryDate > new Date() ? client.expiryDate : new Date();
          const newExpiryDate = new Date(baseDate);
          newExpiryDate.setDate(newExpiryDate.getDate() + packageInfo.durationDays);

          await tx.client.update({
            where: { id: clientId },
            data: {
              expiryDate: newExpiryDate
            }
          });
        }
      }

      // Create AccountTransaction for ledger integration
      // Find or create a cash/asset account for the company
      let cashAccount = await tx.accountLedger.findFirst({
        where: {
          name: 'Cash',
          companyId: admin.companyId
        }
      });

      if (!cashAccount) {
        cashAccount = await tx.accountLedger.create({
          data: {
            name: 'Cash',
            description: 'Cash account for daily transactions',
            type: 'ASSET',
            companyId: admin.companyId
          }
        });
      }

      await tx.accountTransaction.create({
        data: {
          accountId: cashAccount.id,
          amount: parseFloat(amount),
          description: `Client Payment for Invoice ${targetInvoiceId}`,
          reference: newPayment.id,
          date: new Date(),
          transactionType: 'CREDIT', // CREDIT for incoming payment
          companyId: admin.companyId
        }
      });

      // Also create a corresponding debit to Accounts Receivable or similar
      let receivableAccount = await tx.accountLedger.findFirst({
        where: {
          name: 'Accounts Receivable',
          companyId: admin.companyId
        }
      });

      if (!receivableAccount) {
        receivableAccount = await tx.accountLedger.create({
          data: {
            name: 'Accounts Receivable',
            description: 'Accounts Receivable for client payments',
            type: 'ASSET',
            companyId: admin.companyId
          }
        });
      }

      // Create a debit transaction to offset the credit (for accounting balance)
      await tx.accountTransaction.create({
        data: {
          accountId: receivableAccount.id,
          amount: parseFloat(amount),
          description: `Payment received reducing AR for Invoice ${targetInvoiceId}`,
          reference: newPayment.id,
          date: new Date(),
          transactionType: 'DEBIT', // DEBIT to reduce accounts receivable
          companyId: admin.companyId
        }
      });

      return {
        payment: newPayment,
        targetInvoiceId
      };
    });

    // Get updated invoice summary after transaction is complete
    const invoiceSummary = await getInvoicePaymentSummary(targetInvoiceId);

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Error creating payment:', error);
    return NextResponse.json({ error: error.message || 'Failed to create payment' }, { status: 500 });
  }
}