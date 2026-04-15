import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";
import {
  getClientPaymentSummary,
  getInvoicePaymentSummary,
} from "@/lib/payment-calculator";
import { emitEvent } from "@/lib/sse-service";

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to read payments
    if (
      admin.role !== "SUPER_ADMIN" &&
      admin.role !== "ADMIN" &&
      admin.role !== "EMPLOYEE"
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const method = searchParams.get("method");

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
        ...((startDate || endDate) && {
          paymentDate: {
            ...(startDate && { gte: startDate }),
            ...(endDate && { lte: endDate }),
          },
        }),
        ...(method && { method }),
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            username: true,
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
              },
            },
          },
        },
        invoice: {
          select: {
            id: true,
            amount: true,
            additionalCharges: true,
            carryForwardAmount: true,
          }
        }
      },
      orderBy: {
        paymentDate: "desc",
      },
    });

    // Enhance payments with invoice-specific data
    const paymentsWithSummary = await Promise.all(
      payments.map(async (payment) => {
        try {
          const clientSummary = await getClientPaymentSummary(payment.clientId);

          // ✅ Calculate the SPECIFIC invoice total that this payment is linked to
          let invoiceTotal = 0;
          if (payment.invoice) {
            const chargesTotal = payment.invoice.additionalCharges
              ? (typeof payment.invoice.additionalCharges === 'string'
                  ? JSON.parse(payment.invoice.additionalCharges)
                  : payment.invoice.additionalCharges
                ).reduce((sum: number, c: any) => sum + (c.amount || 0), 0)
              : 0;
            invoiceTotal = payment.invoice.amount + chargesTotal + (payment.invoice.carryForwardAmount || 0);
          }

          return {
            ...payment,
            totalAmount: invoiceTotal > 0 ? invoiceTotal : clientSummary.total, // Show specific invoice total, fallback to client total
            totalPaid: clientSummary.totalPaid,
            remainingAmount: clientSummary.remainingAmount,
            overpaidAmount: clientSummary.overpaidAmount,
            effectivePaymentStatus: clientSummary.effectivePaymentStatus,
          };
        } catch (error) {
          console.error(
            `Error getting client summary for client ${payment.clientId}:`,
            error,
          );
          return {
            ...payment,
            totalAmount: 0,
            totalPaid: 0,
            remainingAmount: 0,
            overpaidAmount: 0,
            effectivePaymentStatus: "unpaid" as const,
          };
        }
      }),
    );

    return NextResponse.json(paymentsWithSummary);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to create payments
    if (
      admin.role !== "SUPER_ADMIN" &&
      admin.role !== "ADMIN" &&
      admin.role !== "EMPLOYEE"
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { clientId, amount, method, notes, invoiceId } = body;

    // 🔒 ENFORCE INVOICE-ONLY PAYMENTS
    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required for all payments. Payments must be linked to an invoice." },
        { status: 400 },
      );
    }

    if (!clientId || !amount) {
      return NextResponse.json(
        { error: "Client ID and amount are required" },
        { status: 400 },
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );
    }

    // 🛑 PREVENT OVERPAYMENT: Check invoice remaining before creating payment
    const invoiceSummary = await getInvoicePaymentSummary(invoiceId);
    if (parseFloat(amount) > invoiceSummary.remainingAmount) {
      return NextResponse.json(
        { 
          error: `Payment amount exceeds remaining invoice amount. Remaining: Rs. ${invoiceSummary.remainingAmount.toLocaleString('en-PK')}`,
          remainingAmount: invoiceSummary.remainingAmount
        },
        { status: 400 },
      );
    }

    // Verify invoice belongs to client
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, clientId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found or does not belong to client" },
        { status: 404 },
      );
    }

    // Start a transaction for critical operations only
    const { payment, targetInvoiceId, totalPaid, invoiceAmount } =
      await prisma.$transaction(
        async (tx) => {
          // Get additional charges for this invoice
          let invoiceAdditionalCharges = 0;
          if (invoice.additionalCharges) {
            try {
              const charges =
                typeof invoice.additionalCharges === "string"
                  ? JSON.parse(invoice.additionalCharges)
                  : invoice.additionalCharges;
              if (Array.isArray(charges)) {
                invoiceAdditionalCharges = charges.reduce(
                  (sum: number, charge: any) => sum + (charge.amount || 0),
                  0,
                );
              }
            } catch (error) {
              console.error("Error parsing additional charges:", error);
            }
          }

          const targetInvoiceId = invoice.id;
          const invoiceAmount = invoice.amount + invoiceAdditionalCharges;

          // Create the payment
          const newPayment = await tx.payment.create({
            data: {
              clientId,
              invoiceId: targetInvoiceId,
              amount: parseFloat(amount),
              method: method || "CASH",
              notes: notes || "",
              status: "success", // Set status to success for manual payments
              companyId: admin.companyId,
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
                    },
                  },
                },
              },
            },
          });

          // Get all payments for this invoice to calculate status
          const payments = await tx.payment.findMany({
            where: { invoiceId: targetInvoiceId },
            select: { amount: true },
          });

          const actualPaymentsTotal = payments.reduce(
            (sum, p) => sum + p.amount,
            0,
          );

          // ✅ ONLY real payments count
          const totalPaidAmount = actualPaymentsTotal;

          // ✅ Correct status logic
          let status: "unpaid" | "partial" | "paid";

          if (totalPaidAmount >= invoiceAmount) {
            status = "paid";
          } else if (totalPaidAmount > 0) {
            status = "partial";
          } else {
            status = "unpaid";
          }

          await tx.invoice.update({
            where: { id: targetInvoiceId },
            data: { status },
          });

          return {
            payment: newPayment,
            targetInvoiceId,
            totalPaid: totalPaidAmount,
            invoiceAmount,
          };
        },
        {
          timeout: 10000, // 10 seconds timeout
        },
      );

    // Post-transaction operations (outside transaction to avoid timeout)
    try {
      // 🛍️ FIX PRODUCT SALES SETTLEMENT: Use client summary to determine if all dues are paid
      const clientSummary = await getClientPaymentSummary(clientId);

      // Update client's payment status
      await prisma.client.update({
        where: { id: clientId },
        data: {
          paymentStatus: clientSummary.effectivePaymentStatus,
        },
      });

      // ✅ Mark product sales as "paid" when client has no remaining balance
      if (clientSummary.remainingAmount <= 0) {
        await prisma.productSale.updateMany({
          where: {
            clientId,
            status: 'unpaid'
          },
          data: { status: 'paid' }
        });
      }

      // If the invoice is now fully paid, extend expiry date
      if (targetInvoiceId && totalPaid >= invoiceAmount) {
        const client = await prisma.client.findUnique({
          where: { id: clientId },
        });

        if (client) {
          const packageInfo = await prisma.package.findUnique({
            where: { id: client.packageId },
          });

          if (packageInfo) {
            const baseDate =
              client.expiryDate > new Date() ? client.expiryDate : new Date();
            const newExpiryDate = new Date(baseDate);
            newExpiryDate.setDate(
              newExpiryDate.getDate() + packageInfo.durationDays,
            );

            await prisma.client.update({
              where: { id: clientId },
              data: {
                expiryDate: newExpiryDate,
              },
            });
          }
        }
      }

      // Create accounting entries (outside transaction, using fresh prisma instance)
      const { recordPayment } =
        await import("@/lib/accounting/accountingService");
      const { initializeLedgers, getLedgerByName } =
        await import("@/lib/accounting/ledgerService");

      // Only create accounting entries if we have valid clientId
      if (clientId) {
        try {
          // Auto-initialize ledgers if they don't exist
          await initializeLedgers(admin.companyId);

          await recordPayment({
            companyId: admin.companyId,
            amount: parseFloat(amount),
            clientId,
            invoiceId: targetInvoiceId || undefined,
            paymentId: payment.id,
            method: method || "CASH",
            useBank: method === "BANK_TRANSFER",
          });
        } catch (accountingError: any) {
          // If account not found, force re-initialize and retry
          if (accountingError.message?.includes("not found")) {
            console.log("Account not found, forcing ledger re-initialization...");
            
            // Force create ledgers by checking each one
            const requiredLedgers = ["Cash", "Bank", "Accounts Receivable", "Revenue", "Expense"];
            for (const ledgerName of requiredLedgers) {
              const existing = await getLedgerByName(admin.companyId, ledgerName);
              if (!existing) {
                console.log(`Creating missing ledger: ${ledgerName}`);
                await prisma.accountLedger.create({
                  data: {
                    name: ledgerName,
                    type: ledgerName === "Cash" || ledgerName === "Bank" ? "ASSET" :
                          ledgerName === "Accounts Receivable" ? "ASSET" :
                          ledgerName === "Revenue" ? "INCOME" : "EXPENSE",
                    description: `${ledgerName} account`,
                    companyId: admin.companyId,
                    balance: 0,
                  }
                });
              }
            }

            // Small delay to ensure writes complete
            await new Promise(resolve => setTimeout(resolve, 200));

            try {
              await recordPayment({
                companyId: admin.companyId,
                amount: parseFloat(amount),
                clientId,
                invoiceId: targetInvoiceId || undefined,
                paymentId: payment.id,
                method: method || "CASH",
                useBank: method === "BANK_TRANSFER",
              });
            } catch (retryError: any) {
              console.error("Accounting retry error:", retryError);
            }
          } else {
            // Log other accounting errors but don't fail the payment
            console.error("Accounting error:", accountingError);
          }
        }
      }
    } catch (postError) {
      console.error("Post-payment operations error:", postError);
      // Don't fail the payment if post-operations fail
    }

    // Fetch the payment with full summary data to return
    const paymentWithSummary = await prisma.payment.findUnique({
      where: { id: payment.id },
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
              },
            },
          },
        },
      },
    });

    // Enhance with payment summary
    if (!paymentWithSummary) {
      return NextResponse.json(
        { error: "Payment created but failed to fetch" },
        { status: 500 },
      );
    }

    // Get client summary for totalPaid calculation
    const clientSummary = await getClientPaymentSummary(clientId);

    const enhancedPayment = {
      ...paymentWithSummary,
      totalAmount: clientSummary.total,
      totalPaid: clientSummary.totalPaid,
      remainingAmount: clientSummary.remainingAmount,
      overpaidAmount: clientSummary.overpaidAmount,
      effectivePaymentStatus: clientSummary.effectivePaymentStatus,
    };

    // Emit real-time event for payment creation
    try {
      await emitEvent("payment_created", {
        paymentId: payment.id,
        clientId,
        amount: parseFloat(amount),
        method: method || "CASH",
        clientName: paymentWithSummary.client?.name,
        totalPaidToday: clientSummary.totalPaid,
      });
    } catch (sseError) {
      // Don't fail payment if SSE fails
      console.error("SSE event emission failed:", sseError);
    }

    return NextResponse.json(enhancedPayment);
  } catch (error: any) {
    console.error("Error creating payment:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create payment" },
      { status: 500 },
    );
  }
}
