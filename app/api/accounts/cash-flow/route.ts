import { NextRequest, NextResponse } from "next/server";
import { getCashFlow } from "@/lib/accounting/reportService";

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

    const cashFlow = await getCashFlow(companyId, {
      startDate,
      endDate,
    });

    return NextResponse.json(cashFlow);
  } catch (error) {
    console.error("Cash Flow Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch cash flow report" },
      { status: 500 }
    );
  }
}
