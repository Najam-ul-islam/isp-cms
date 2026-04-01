import { prisma } from './prisma';

export interface PaymentSummary {
  total: number;
  totalPaid: number;
  remaining: number;
  effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
}

export async function getClientPaymentSummary(clientId: string): Promise<PaymentSummary> {
  // Fetch client to get their price (total amount due)
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { price: true }
  });

  if (!client) {
    throw new Error(`Client with id ${clientId} not found`);
  }

  // Fetch all payments for this client
  const payments = await prisma.payment.findMany({
    where: { clientId },
    select: { amount: true }
  });

  // Calculate total paid
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // Calculate total and remaining
  const total = client.price;
  const remaining = Math.max(total - totalPaid, 0);

  // Derive payment status
  let effectivePaymentStatus: 'unpaid' | 'partial' | 'paid';
  if (totalPaid === 0) {
    effectivePaymentStatus = 'unpaid';
  } else if (totalPaid > 0 && totalPaid < total) {
    effectivePaymentStatus = 'partial';
  } else {
    effectivePaymentStatus = 'paid';
  }

  return {
    total,
    totalPaid,
    remaining,
    effectivePaymentStatus
  };
}