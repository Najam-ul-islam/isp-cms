import { NextResponse } from "next/server";
import { getAuditActions } from "@/lib/saas/auditService";

export async function GET() {
  try {
    const actions = await getAuditActions();
    return NextResponse.json(actions);
  } catch (error) {
    console.error("Get Audit Actions Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit actions" },
      { status: 500 }
    );
  }
}
