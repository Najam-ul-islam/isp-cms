import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import {
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
  updateCompanyModules,
  getCompanyWithStats,
} from "@/lib/saas/companyService";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const company = await getCompanyWithStats(id);

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Get Company Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, isActive, modulesEnabled, action } = body;

    // Handle toggle status action
    if (action === "toggleStatus") {
      const company = await toggleCompanyStatus(id);
      if (!company) {
        return NextResponse.json(
          { error: "Company not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(company);
    }

    // Handle modules update
    if (modulesEnabled !== undefined) {
      const company = await updateCompanyModules(id, modulesEnabled);
      return NextResponse.json(company);
    }

    // Handle regular update
    const company = await updateCompany(id, { name, isActive, modulesEnabled });
    return NextResponse.json(company);
  } catch (error) {
    console.error("Update Company Error:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete related data first to avoid foreign key constraints
    await prisma.accountTransaction.deleteMany({
      where: { company: { id } }
    });
    await prisma.accountLedger.deleteMany({ where: { companyId: id } });

    // Hard delete the company
    await prisma.company.delete({ where: { id } });

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error: any) {
    console.error("Delete Company Error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete company" },
      { status: 500 }
    );
  }
}
