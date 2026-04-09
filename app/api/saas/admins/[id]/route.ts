import { NextRequest, NextResponse } from "next/server";
import { getAdminFromToken } from "@/lib/jwt";
import {
  updateAdmin,
  resetAdminPassword,
  getAdminById,
} from "@/lib/saas/adminService";
import { Role } from "@prisma/client";
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
    const adminData = await getAdminById(id);

    if (!adminData) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(adminData);
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
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email, role, action, newPassword } = body;

    // Handle password reset
    if (action === "resetPassword" && newPassword) {
      await resetAdminPassword(id, newPassword);
      return NextResponse.json({ message: "Password reset successfully" });
    }

    // Handle regular update
    const updatedAdmin = await updateAdmin(id, {
      name,
      email,
      role: role as Role,
    });

    return NextResponse.json(updatedAdmin);
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
    const admin = await getAdminFromToken(request);
    if (!admin || admin.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Prevent deleting yourself
    if (id === admin.id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check if admin exists
    const adminToDelete = await prisma.admin.findUnique({
      where: { id }
    });

    if (!adminToDelete) {
      return NextResponse.json(
        { error: "Admin not found" },
        { status: 404 }
      );
    }

    // Delete related data first to avoid foreign key constraints
    await prisma.auditLog.deleteMany({ where: { userId: id } });
    await prisma.refreshToken.deleteMany({ where: { userId: id } });
    await prisma.session.deleteMany({ where: { userId: id } });

    // Hard delete the admin
    await prisma.admin.delete({ where: { id } });

    return NextResponse.json({ message: "Admin deleted successfully" });
  } catch (error: any) {
    console.error("Delete Admin Error:", error);
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete admin" },
      { status: 500 }
    );
  }
}
