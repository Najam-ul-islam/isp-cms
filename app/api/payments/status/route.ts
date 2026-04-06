import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");
    const transactionId = searchParams.get("transactionId");

    if (!paymentId && !transactionId) {
      return NextResponse.json(
        { error: "paymentId or transactionId is required" },
        { status: 400 }
      );
    }

    let payment;

    if (paymentId) {
      payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: true,
        },
      });
    } else if (transactionId) {
      payment = await prisma.payment.findFirst({
        where: { transactionId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: true,
        },
      });
    }

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error("Payment status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    );
  }
}
