import { NextRequest, NextResponse } from "next/server";
import { initializeLedgers } from "@/lib/accounting/ledgerService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId } = body;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const ledgers = await initializeLedgers(companyId);

    return NextResponse.json({
      message: "Ledgers initialized successfully",
      ledgers,
    });
  } catch (error) {
    console.error("Initialize Ledgers Error:", error);
    return NextResponse.json(
      { error: "Failed to initialize ledgers" },
      { status: 500 }
    );
  }
}
