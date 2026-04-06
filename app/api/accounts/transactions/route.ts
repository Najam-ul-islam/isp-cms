import { NextRequest, NextResponse } from "next/server";
import { getAllTransactions } from "@/lib/accounting/accountingService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const ledgerId = searchParams.get("ledgerId") || undefined;
    const transactionType = searchParams.get("transactionType") || undefined;
    const referenceType = searchParams.get("referenceType") || undefined;

    if (!companyId) {
      return NextResponse.json(
        { error: "companyId is required" },
        { status: 400 }
      );
    }

    const result = await getAllTransactions(companyId, {
      page,
      limit,
      startDate,
      endDate,
      ledgerId,
      transactionType,
      referenceType,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Transactions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
