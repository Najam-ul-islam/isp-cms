import { NextRequest, NextResponse } from "next/server";
import { getBalanceSheetWithBreakdown } from "@/lib/accounting/reportService";

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

    const report = await getBalanceSheetWithBreakdown(companyId);

    return NextResponse.json(report);
  } catch (error) {
    console.error("Balance Sheet Report Error:", error);
    return NextResponse.json(
      { error: "Failed to generate balance sheet report" },
      { status: 500 }
    );
  }
}
