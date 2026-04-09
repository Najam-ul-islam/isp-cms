import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import { prisma } from "@/lib/prisma";

// GET all invoices for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SUPER_ADMIN can access any company, ADMIN can only access their own company
    const { id } = await params;

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check permissions: SUPER_ADMIN can access any company, ADMIN can only access their own
    if (admin.role !== "SUPER_ADMIN" && admin.companyId !== id) {
      return NextResponse.json({ error: "Forbidden: You can only access your own company's invoices" }, { status: 403 });
    }

    // Get invoices for this company
    const invoices = await prisma.invoice.findMany({
      where: { companyId: id },
      orderBy: { issuedDate: "desc" },
      take: 50,
    });

    // Get company stats for suggested invoice amount
    const companyStats = await prisma.client.aggregate({
      where: { companyId: id },
      _sum: { price: true },
      _count: true,
    });

    return NextResponse.json({
      invoices,
      stats: {
        totalClients: companyStats._count || 0,
        totalAmountDue: companyStats._sum.price || 0,
      },
    });
  } catch (error) {
    console.error("Get Company Invoices Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST - Create invoice for a company
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
    const { amount, description, dueDate } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check permissions: SUPER_ADMIN can create for any company, ADMIN can only create for their own
    if (admin.role !== "SUPER_ADMIN" && admin.companyId !== id) {
      return NextResponse.json({ error: "Forbidden: You can only create invoices for your own company" }, { status: 403 });
    }

    // Find first client for this company (invoices require clientId)
    const firstClient = await prisma.client.findFirst({
      where: { companyId: id },
      orderBy: { createdAt: "asc" },
    });

    if (!firstClient) {
      return NextResponse.json(
        { error: "Company must have at least one client to create invoices" },
        { status: 400 }
      );
    }

    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        clientId: firstClient.id,
        companyId: id,
        amount: parseFloat(amount),
        description: description || `Invoice for ${company.name}`,
        issuedDate: new Date(),
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "unpaid",
      },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    console.error("Create Company Invoice Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Duplicate invoice detected" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to create invoice" },
      { status: 500 }
    );
  }
}
