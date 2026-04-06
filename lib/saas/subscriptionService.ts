import { prisma } from "@/lib/prisma";

export interface CreateSubscriptionInput {
  companyId: string;
  planId: string;
  startDate?: Date;
}

export interface UpdateSubscriptionInput {
  planId?: string;
  status?: string;
  endDate?: Date;
}

export async function getAllSubscriptions() {
  return prisma.subscription.findMany({
    include: {
      company: {
        select: { name: true },
      },
      plan: {
        select: { name: true, price: true, duration: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubscriptionByCompanyId(companyId: string) {
  return prisma.subscription.findUnique({
    where: { companyId },
    include: {
      plan: true,
      company: {
        select: { name: true },
      },
    },
  });
}

export async function createOrUpdateSubscription(input: CreateSubscriptionInput) {
  const { companyId, planId, startDate = new Date() } = input;

  // Get plan details
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    throw new Error("Plan not found");
  }

  // Calculate end date
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.duration);

  // Upsert subscription
  const subscription = await prisma.subscription.upsert({
    where: { companyId },
    update: {
      planId,
      startDate,
      endDate,
      status: "active",
    },
    create: {
      companyId,
      planId,
      startDate,
      endDate,
      status: "active",
    },
    include: {
      plan: true,
    },
  });

  // Update company's modulesEnabled based on plan features
  await prisma.company.update({
    where: { id: companyId },
    data: {
      modulesEnabled: plan.features as any,
    },
  });

  return subscription;
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput) {
  return prisma.subscription.update({
    where: { id },
    data: {
      ...(input.planId !== undefined && { planId: input.planId }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
    },
    include: {
      plan: true,
    },
  });
}

export async function expireSubscription(id: string) {
  return prisma.subscription.update({
    where: { id },
    data: { status: "expired" },
  });
}

export async function checkAndExpireExpiredSubscriptions() {
  const now = new Date();

  // Find active subscriptions that have ended
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "active",
      endDate: {
        lt: now,
      },
    },
  });

  // Update status to expired
  for (const sub of expiredSubscriptions) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: "expired" },
    });

    // Reset company modules to basic (billing only)
    await prisma.company.update({
      where: { id: sub.companyId },
      data: {
        modulesEnabled: { billing: true, inventory: false, employees: false },
      },
    });
  }

  return expiredSubscriptions.length;
}

export async function getSubscriptionStats() {
  const [total, active, expired, cancelled] = await Promise.all([
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: "active" } }),
    prisma.subscription.count({ where: { status: "expired" } }),
    prisma.subscription.count({ where: { status: "cancelled" } }),
  ]);

  return { total, active, expired, cancelled };
}

export async function getActiveSubscriptionByCompanyId(companyId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { companyId },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    return null;
  }

  // Check if subscription is expired
  if (subscription.status === "active" && subscription.endDate < new Date()) {
    await expireSubscription(subscription.id);
    return {
      ...subscription,
      status: "expired",
    };
  }

  return subscription;
}

export async function isModuleEnabled(companyId: string, module: string): Promise<boolean> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { modulesEnabled: true },
  });

  if (!company) {
    return false;
  }

  const modules = company.modulesEnabled as Record<string, boolean>;
  return modules[module] === true;
}

export async function getClientCount(companyId: string): Promise<number> {
  return prisma.client.count({
    where: { companyId },
  });
}

export async function canAddClient(companyId: string): Promise<{ canAdd: boolean; current: number; max: number }> {
  const subscription = await getActiveSubscriptionByCompanyId(companyId);

  if (!subscription) {
    // No subscription, default to unlimited
    return { canAdd: true, current: 0, max: -1 };
  }

  const features = subscription.plan.features as Record<string, any>;
  const maxClients = features.maxClients || -1; // -1 means unlimited
  const currentClients = await getClientCount(companyId);

  return {
    canAdd: maxClients === -1 || currentClients < maxClients,
    current: currentClients,
    max: maxClients,
  };
}
