import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/paymentService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { txnId, merchantTxnId, amount, status, paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId is required" },
        { status: 400 }
      );
    }

    if (status === "success") {
      // Payment successful
      await paymentService.onPaymentSuccess(paymentId, {
        transactionId: txnId,
        amount: parseFloat(amount) * 100, // Convert to paisa
        gateway: "easypaisa",
        metadata: body,
      });

      // Redirect to success page
      return NextResponse.redirect(
        new URL("/dashboard/payments/success", request.url)
      );
    } else {
      // Payment failed
      await paymentService.onPaymentFailed(paymentId, "Payment failed or cancelled");

      // Redirect to cancel page
      return NextResponse.redirect(
        new URL("/dashboard/payments/cancel", request.url)
      );
    }
  } catch (error: any) {
    console.error("EasyPaisa callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/payments/cancel", request.url)
    );
  }
}
