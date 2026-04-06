import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

export interface StripeCheckoutInput {
  amount: number; // In cents/smallest unit
  currency: string;
  description: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeVerifyInput {
  sessionId: string;
}

export class StripeService {
  async createCheckoutSession(input: StripeCheckoutInput) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: input.currency || "pkr",
            product_data: {
              name: input.description,
            },
            unit_amount: input.amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
    });

    return {
      sessionId: session.id,
      url: session.url || "",
    };
  }

  async verifyPayment(payload: StripeVerifyInput) {
    const session = await stripe.checkout.sessions.retrieve(payload.sessionId);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    return {
      success: true,
      transactionId: session.id,
      amount: session.amount_total || 0,
      metadata: session.metadata || {},
    };
  }

  async handleWebhook(req: Request) {
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      throw new Error("Missing Stripe signature");
    }

    const body = await req.text();

    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );

      return event;
    } catch (error: any) {
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  async createRefund(paymentIntentId: string, amount?: number) {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount,
    });

    return refund;
  }
}

export const stripeService = new StripeService();
