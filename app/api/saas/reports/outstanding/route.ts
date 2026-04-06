import { NextResponse } from "next/server";
import { getOutstandingReport } from "@/lib/saas/reportService";

export async function GET() {
  try {
    const report = await getOutstandingReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("Outstanding Report Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch outstanding report" },
      { status: 500 }
    );
  }
}
