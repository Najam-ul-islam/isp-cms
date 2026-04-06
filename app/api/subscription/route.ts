import { NextRequest, NextResponse } from "next/server";
import { getActiveSubscriptionByCompanyId, canAddClient } from "@/lib/saas/subscriptionService";

// Client API - Company-scoped
export async function GET(request: NextRequest) {
  try {
    // Get companyId from headers (set by middleware)
    const companyId = request.headers.get("x-company-id");

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const subscription = await getActiveSubscriptionByCompanyId(companyId);
    const clientLimit = await canAddClient(companyId);

    return NextResponse.json({
      subscription: subscription || null,
      clientLimit,
    });
  } catch (error) {
    console.error("Get Subscription Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}
