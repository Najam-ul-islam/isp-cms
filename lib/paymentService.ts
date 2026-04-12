import { prisma } from "@/lib/prisma";

// Lazy imports to avoid build-time errors when env vars are missing
import type { StripeService } from "./stripeService";
import type { JazzCashService } from "./jazzcashService";
import type { EasyPaisaService } from "./easypaisaService";

export type PaymentGateway = "stripe" | "jazzcash" | "easypaisa";

export interface CheckoutSessionInput {
  gateway: PaymentGateway;
  amount: number; // Amount in smallest currency unit (cents/paisa)
  currency: string;
  description: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionOutput {
  sessionId: string;
  url: string;
  paymentId: string;
}

export interface VerifyPaymentInput {
  gateway: PaymentGateway;
  payload: any;
}

export interface VerifyPaymentOutput {
  success: boolean;
  transactionId: string;
  amount: number;
  metadata: Record<string, any>;
}

export class PaymentService {
  // Lazy-loaded services to avoid import-time initialization errors
  private get stripeService() {
    return require("./stripeService").stripeService as StripeService;
  }
  private get jazzcashService() {
    return require("./jazzcashService").jazzcashService as JazzCashService;
  }
  private get easypaisaService() {
    return require("./easypaisaService").easypaisaService as EasyPaisaService;
  }

  async createCheckoutSession(
    input: CheckoutSessionInput
  ): Promise<CheckoutSessionOutput> {
    const { gateway, amount, currency, description, metadata, successUrl, cancelUrl } = input;

    // Create pending payment record
    const payment = await prisma.payment.create({
      data: {
        amount: amount / 100, // Convert from smallest unit
        gateway,
        status: "pending",
        referenceType: metadata.referenceType || "invoice",
        referenceId: metadata.referenceId || null,
        companyId: metadata.companyId,
        clientId: metadata.clientId || "",
        invoiceId: metadata.invoiceId || "",
        notes: description,
      },
    });

    let session: { sessionId: string; url: string };

    switch (gateway) {
      case "stripe":
        session = await this.stripeService.createCheckoutSession({
          amount,
          currency,
          description,
          metadata: {
            ...metadata,
            paymentId: payment.id,
          },
          successUrl: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl,
        });
        break;

      case "jazzcash":
        session = await this.jazzcashService.initiatePayment({
          amount,
          currency,
          description,
          orderId: payment.id,
          returnUrl: successUrl,
          cancelUrl,
        });
        break;

      case "easypaisa":
        session = await this.easypaisaService.initiatePayment({
          amount,
          currency,
          description,
          orderId: payment.id,
          returnUrl: successUrl,
          cancelUrl,
        });
        break;

      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }

    // Update payment with session info
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        transactionId: session.sessionId,
      },
    });

    return {
      ...session,
      paymentId: payment.id,
    };
  }

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentOutput> {
    const { gateway, payload } = input;

    switch (gateway) {
      case "stripe":
        return this.stripeService.verifyPayment(payload);

      case "jazzcash":
        return this.jazzcashService.verifyPayment(payload);

      case "easypaisa":
        return this.easypaisaService.verifyPayment(payload);

      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  async handleWebhook(gateway: PaymentGateway, req: Request) {
    switch (gateway) {
      case "stripe":
        return this.stripeService.handleWebhook(req);

      case "jazzcash":
        return this.jazzcashService.handleWebhook(req);

      case "easypaisa":
        return this.easypaisaService.handleWebhook(req);

      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  async onPaymentSuccess(paymentId: string, transactionDetails: {
    transactionId: string;
    amount: number;
    gateway: string;
    metadata?: Record<string, any>;
  }) {
    const { transactionId, amount, gateway, metadata = {} } = transactionDetails;

    // Update payment record
    const payment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "success",
        transactionId,
        paymentDate: new Date(),
      },
      include: {
        client: true,
        invoice: true,
      },
    });

    // Handle subscription activation if referenceType is subscription
    if (payment.referenceType === "subscription" && payment.referenceId) {
      await this.activateSubscription(payment.referenceId, payment.id);
    }

    // Handle invoice payment if referenceType is invoice
    if (payment.referenceType === "invoice" && payment.invoiceId) {
      await this.updateInvoiceStatus(payment.invoiceId);
    }

    // Create accounting entries
    await this.recordAccountingEntry(payment);

    return payment;
  }

  async onPaymentFailed(paymentId: string, error: string) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "failed",
        notes: `Payment failed: ${error}`,
      },
    });
  }

  private async activateSubscription(subscriptionId: string, paymentId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    // Activate subscription
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + subscription.plan.duration * 24 * 60 * 60 * 1000),
      },
    });

    // Update company modules
    await prisma.company.update({
      where: { id: subscription.companyId },
      data: {
        modulesEnabled: subscription.plan.features as any,
      },
    });
  }

  private async updateInvoiceStatus(invoiceId: string) {
    // Get all payments for this invoice
    const payments = await prisma.payment.findMany({
      where: {
        invoiceId,
        status: "success",
      },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Get invoice amount
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    // Update invoice status
    let status: "unpaid" | "partial" | "paid";
    if (totalPaid >= invoice.amount) {
      status = "paid";
    } else if (totalPaid > 0) {
      status = "partial";
    } else {
      status = "unpaid";
    }

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
    });

    // Update client payment status
    const client = await prisma.client.findUnique({
      where: { id: invoice.clientId },
    });

    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: {
          paymentStatus: status === "paid" ? "paid" : status === "partial" ? "partial" : "unpaid",
        },
      });
    }
  }

  private async recordAccountingEntry(payment: any) {
    try {
      const { recordPayment } = await import("@/lib/accounting/accountingService");

      await recordPayment({
        companyId: payment.companyId,
        amount: payment.amount,
        clientId: payment.clientId,
        invoiceId: payment.invoiceId || undefined,
        paymentId: payment.id,
        method: payment.gateway || payment.method || "CASH",
        useBank: payment.gateway === "stripe", // Consider Stripe as bank transfer
      });
    } catch (error) {
      console.error("Failed to create accounting entry:", error);
      // Don't fail the payment if accounting fails
    }
  }
}

export const paymentService = new PaymentService();
