import { NextRequest, NextResponse } from "next/server";
import { getPlanById, updatePlan, deletePlan } from "@/lib/saas/planService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plan = await getPlanById(id);

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(plan);
  } catch (error) {
    console.error("Get Plan Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
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

    const plan = await updatePlan(id, body);
    return NextResponse.json(plan);
  } catch (error: any) {
    console.error("Update Plan Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Plan name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update plan" },
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
    const plan = await deletePlan(id);
    return NextResponse.json(plan);
  } catch (error) {
    console.error("Delete Plan Error:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
