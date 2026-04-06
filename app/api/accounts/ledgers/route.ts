import { NextRequest, NextResponse } from "next/server";
import { getLedgersByCompanyId } from "@/lib/accounting/ledgerService";

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

    const ledgers = await getLedgersByCompanyId(companyId, false);

    return NextResponse.json(ledgers);
  } catch (error) {
    console.error("Ledgers Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledgers" },
      { status: 500 }
    );
  }
}
