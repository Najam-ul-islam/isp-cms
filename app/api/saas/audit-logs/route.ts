import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, getAuditActions } from "@/lib/saas/auditService";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const companyId = searchParams.get("companyId") || undefined;
    const userId = searchParams.get("userId") || undefined;
    const action = searchParams.get("action") || undefined;

    const result = await getAuditLogs({
      page,
      limit,
      companyId,
      userId,
      action,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Get Audit Logs Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
