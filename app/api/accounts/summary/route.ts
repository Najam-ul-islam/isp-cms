import { NextRequest, NextResponse } from "next/server";
import { getAccountSummary } from "@/lib/accounting/reportService";

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

    const summary = await getAccountSummary(companyId);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Account Summary Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch account summary" },
      { status: 500 }
    );
  }
}
