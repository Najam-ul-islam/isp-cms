import { NextRequest, NextResponse } from "next/server";
import {
  updateAdmin,
  deleteAdmin,
  resetAdminPassword,
  getAdminById,
} from "@/lib/saas/adminService";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = await getAdminById(id);

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error("Get Admin Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin" },
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
    const { name, email, role, action, newPassword } = body;

    // Handle password reset
    if (action === "resetPassword" && newPassword) {
      await resetAdminPassword(id, newPassword);
      return NextResponse.json({ message: "Password reset successfully" });
    }

    // Handle regular update
    const admin = await updateAdmin(id, {
      name,
      email,
      role: role as Role,
    });

    return NextResponse.json(admin);
  } catch (error: any) {
    console.error("Update Admin Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update admin" },
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
    await deleteAdmin(id);
    return NextResponse.json({ message: "Admin deleted successfully" });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    return NextResponse.json(
      { error: "Failed to delete admin" },
      { status: 500 }
    );
  }
}
