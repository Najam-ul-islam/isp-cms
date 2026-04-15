import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import {
  getSaaSInvoicesByCompany,
  getSaaSInvoiceStats,
  createSaaSInvoice,
  recordSaaSPayment,
  getSaaSInvoiceById,
} from "@/lib/saas/invoiceService";

// GET all SaaS invoices for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";

    // SUPER_ADMIN can access any company, ADMIN can only access their own company
    if (admin.role !== "SUPER_ADMIN" && admin.companyId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [invoices, stats] = await Promise.all([
      getSaaSInvoicesByCompany(id, status),
      getSaaSInvoiceStats(id),
    ]);

    return NextResponse.json({ invoices, stats });
  } catch (error) {
    console.error("Get SaaS Invoices Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST - Create SaaS invoice or record payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, ...data } = body;

    // Check permissions
    if (admin.role !== "SUPER_ADMIN" && admin.companyId !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle payment recording
    if (action === "recordPayment") {
      const payment = await recordSaaSPayment({
        invoiceId: data.invoiceId,
        amount: data.amount,
        method: data.method,
        notes: data.notes,
        gateway: data.gateway,
        transactionId: data.transactionId,
      });

      return NextResponse.json(payment, { status: 201 });
    }

    // Handle invoice creation
    const invoice = await createSaaSInvoice({
      companyId: id,
      amount: data.amount,
      dueDate: data.dueDate,
      description: data.description,
      billingPeriod: data.billingPeriod,
      planId: data.planId,
      additionalCharges: data.additionalCharges,
    });

    if ((invoice as any).error) {
      return NextResponse.json(invoice, { status: 409 });
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error("Create SaaS Invoice Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
