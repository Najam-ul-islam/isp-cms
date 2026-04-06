import { prisma } from "@/lib/prisma";

export interface CreatePlanInput {
  name: string;
  price: number;
  duration: number; // Duration in days
  description?: string;
  features: Record<string, any>;
}

export interface UpdatePlanInput {
  name?: string;
  price?: number;
  duration?: number;
  description?: string;
  features?: Record<string, any>;
  isActive?: boolean;
}

export async function getPlans() {
  return prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getPlanById(id: string) {
  return prisma.plan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { subscriptions: true },
      },
    },
  });
}

export async function createPlan(input: CreatePlanInput) {
  return prisma.plan.create({
    data: {
      name: input.name,
      price: input.price,
      duration: input.duration,
      description: input.description,
      features: input.features as any,
    },
  });
}

export async function updatePlan(id: string, input: UpdatePlanInput) {
  return prisma.plan.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.price !== undefined && { price: input.price }),
      ...(input.duration !== undefined && { duration: input.duration }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.features !== undefined && { features: input.features as any }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deletePlan(id: string) {
  return prisma.plan.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getActivePlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { price: "asc" },
  });
}
