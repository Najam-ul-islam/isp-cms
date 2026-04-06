import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/paymentService";

export async function POST(request: NextRequest) {
  try {
    const event = await paymentService.handleWebhook("stripe", request);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const paymentId = session.metadata?.paymentId;

        if (paymentId) {
          await paymentService.onPaymentSuccess(paymentId, {
            transactionId: session.id,
            amount: session.amount_total || 0,
            gateway: "stripe",
            metadata: session.metadata,
          });
        }
        break;

      case "checkout.session.expired":
        const expiredSession = event.data.object;
        const expiredPaymentId = expiredSession.metadata?.paymentId;

        if (expiredPaymentId) {
          await paymentService.onPaymentFailed(
            expiredPaymentId,
            "Session expired"
          );
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
