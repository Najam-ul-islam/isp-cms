import { NextResponse } from "next/server";
import { getRevenueReport } from "@/lib/saas/reportService";

export async function GET() {
  try {
    const report = await getRevenueReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("Revenue Report Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue report" },
      { status: 500 }
    );
  }
}
