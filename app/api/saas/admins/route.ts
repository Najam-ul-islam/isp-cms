import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import { getAdmins, createAdmin } from "@/lib/saas/adminService";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const companyId = searchParams.get("companyId") || undefined;

    const result = await getAdmins({ page, limit, search, companyId });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get Admins Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admins" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, password, role, companyId } = body;

    if (!name || !email || !password || !companyId) {
      return NextResponse.json(
        { error: "Name, email, password, and companyId are required" },
        { status: 400 }
      );
    }

    if (!["ADMIN", "EMPLOYEE"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN or EMPLOYEE" },
        { status: 400 }
      );
    }

    const newAdmin = await createAdmin({
      name,
      email,
      password,
      role: role as Role,
      companyId,
    });

    return NextResponse.json(newAdmin, { status: 201 });
  } catch (error: any) {
    console.error("Create Admin Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create admin" },
      { status: 500 }
    );
  }
}
