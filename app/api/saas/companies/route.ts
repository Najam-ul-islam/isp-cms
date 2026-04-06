import { NextRequest, NextResponse } from "next/server";
import {
  getCompanies,
  createCompany,
} from "@/lib/saas/companyService";

export async function GET() {
  try {
    const companies = await getCompanies();
    return NextResponse.json(companies);
  } catch (error) {
    console.error("Companies API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, modulesEnabled } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 }
      );
    }

    const company = await createCompany({ name, modulesEnabled });
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Create Company Error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 }
    );
  }
}
