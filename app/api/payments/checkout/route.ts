import { NextRequest, NextResponse } from "next/server";
import { paymentService, PaymentGateway } from "@/lib/paymentService";
import { getAdminFromToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      gateway,
      amount,
      description,
      referenceType,
      referenceId,
      clientId,
      invoiceId,
    } = body;

    // Validate required fields
    if (!gateway || !amount) {
      return NextResponse.json(
        { error: "gateway and amount are required" },
        { status: 400 }
      );
    }

    // Validate gateway
    if (!["stripe", "jazzcash", "easypaisa"].includes(gateway)) {
      return NextResponse.json(
        { error: "Unsupported payment gateway" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await paymentService.createCheckoutSession({
      gateway: gateway as PaymentGateway,
      amount: amount * 100, // Convert to smallest unit (cents/paisa)
      currency: "pkr",
      description: description || `Payment for ${referenceType || "subscription"}`,
      metadata: {
        referenceType: referenceType || "invoice",
        referenceId: referenceId || "",
        companyId: admin.companyId,
        clientId: clientId || "",
        invoiceId: invoiceId || "",
      },
      successUrl: `${baseUrl}/dashboard/payments/success`,
      cancelUrl: `${baseUrl}/dashboard/payments/cancel`,
    });

    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
