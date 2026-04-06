import { NextRequest, NextResponse } from "next/server";
import { getProfitLoss } from "@/lib/accounting/reportService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const profitLoss = await getProfitLoss(companyId, {
      startDate,
      endDate,
    });

    return NextResponse.json(profitLoss);
  } catch (error) {
    console.error("Profit Loss Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit and loss report" },
      { status: 500 }
    );
  }
}
