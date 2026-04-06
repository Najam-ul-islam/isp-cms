import { NextRequest, NextResponse } from "next/server";
import { getCashFlowWithBreakdown } from "@/lib/accounting/reportService";

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

    const report = await getCashFlowWithBreakdown(companyId, {
      startDate: from,
      endDate: to,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Cash Flow Report Error:", error);
    return NextResponse.json(
      { error: "Failed to generate cash flow report" },
      { status: 500 }
    );
  }
}
