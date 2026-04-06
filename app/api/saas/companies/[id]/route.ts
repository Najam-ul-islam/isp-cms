import { NextRequest, NextResponse } from "next/server";
import {
  updateCompany,
  deleteCompany,
  toggleCompanyStatus,
  updateCompanyModules,
  getCompanyWithStats,
} from "@/lib/saas/companyService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    const { id } = await params;
    const company = await deleteCompany(id);
    return NextResponse.json(company);
  } catch (error) {
    console.error("Delete Company Error:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 }
    );
  }
}
