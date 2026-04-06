import { NextRequest, NextResponse } from "next/server";
import {
  getAllSubscriptions,
  createOrUpdateSubscription,
  updateSubscription,
  getSubscriptionStats,
  checkAndExpireExpiredSubscriptions,
} from "@/lib/saas/subscriptionService";

export async function GET() {
  try {
    // Check and expire any expired subscriptions
    await checkAndExpireExpiredSubscriptions();

    const [subscriptions, stats] = await Promise.all([
      getAllSubscriptions(),
      getSubscriptionStats(),
    ]);

    return NextResponse.json({ subscriptions, stats });
  } catch (error) {
    console.error("Get Subscriptions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, planId, startDate } = body;

    if (!companyId || !planId) {
      return NextResponse.json(
        { error: "companyId and planId are required" },
        { status: 400 }
      );
    }

    const subscription = await createOrUpdateSubscription({
      companyId,
      planId,
      startDate: startDate ? new Date(startDate) : undefined,
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error: any) {
    console.error("Create Subscription Error:", error);
    if (error.message === "Plan not found") {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
