import { NextRequest, NextResponse } from "next/server";
import { getBalanceSheet } from "@/lib/accounting/reportService";

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

    const balanceSheet = await getBalanceSheet(companyId);

    return NextResponse.json(balanceSheet);
  } catch (error) {
    console.error("Balance Sheet Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance sheet" },
      { status: 500 }
    );
  }
}
