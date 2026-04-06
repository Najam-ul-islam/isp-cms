import { NextRequest, NextResponse } from "next/server";
import { getPlans, createPlan, updatePlan, deletePlan } from "@/lib/saas/planService";

export async function GET() {
  try {
    const plans = await getPlans();
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Get Plans Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, price, duration, description, features } = body;

    if (!name || price === undefined || duration === undefined) {
      return NextResponse.json(
        { error: "Name, price, and duration are required" },
        { status: 400 }
      );
    }

    const plan = await createPlan({
      name,
      price,
      duration,
      description,
      features: features || { billing: true, inventory: false, employees: false },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    console.error("Create Plan Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Plan name already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}
