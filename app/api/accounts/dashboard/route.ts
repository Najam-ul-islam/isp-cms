import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics, getMonthlyRevenueTrend, getTopExpenses } from "@/lib/accounting/reportService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const [metrics, revenueTrend, topExpenses] = await Promise.all([
      getDashboardMetrics(companyId),
      getMonthlyRevenueTrend(companyId, 6),
      getTopExpenses(companyId, 5),
    ]);

    return NextResponse.json({
      ...metrics,
      revenueTrend,
      topExpenses,
    });
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard metrics" },
      { status: 500 }
    );
  }
}
