import { NextRequest, NextResponse } from "next/server";
import { getProfitLossWithBreakdown } from "@/lib/accounting/reportService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const report = await getProfitLossWithBreakdown(companyId, {
      startDate: from,
      endDate: to,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Profit & Loss Report Error:", error);
    return NextResponse.json(
      { error: "Failed to generate profit and loss report" },
      { status: 500 }
    );
  }
}
