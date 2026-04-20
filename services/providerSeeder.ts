import { prisma } from '../lib/prisma';
import { getTenantPrisma } from '../prisma/tenant';

export interface ServiceProviderData {
  name: string;
  contactInfo?: string;
  address?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
}

export function normalizeProviderName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    return '';
  }
  return name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

export async function seedServiceProviders(
  companyId: string,
  providers: ServiceProviderData[]
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for seeding service providers');
  }

  const tenantPrisma = getTenantPrisma(companyId);
  const result = new Map<string, string>();
  const batchSize = 50;

  for (let i = 0; i < providers.length; i += batchSize) {
    const batch = providers.slice(i, i + batchSize);
    
    const existingProviders = await tenantPrisma.serviceProvider.findMany({
      where: {
        name: { in: batch.map(p => p.name) },
      },
      select: { id: true, name: true },
    });

    const existingMap = new Map(existingProviders.map((p: { name: string; id: string }) => [p.name.toLowerCase(), p.id]));
    
    for (const existing of existingProviders) {
      result.set(existing.name.toLowerCase(), existing.id);
    }

    const toCreate = batch.filter(p => !existingMap.has(p.name.toLowerCase()));

    if (toCreate.length > 0) {
      try {
        await tenantPrisma.serviceProvider.createMany({
          data: toCreate.map(p => ({
            name: normalizeProviderName(p.name),
            contactInfo: p.contactInfo || null,
            address: p.address || null,
            email: p.email || null,
            phone: p.phone || null,
            isActive: p.isActive ?? true,
          })),
          skipDuplicates: true,
        });

        const newlyCreated = await tenantPrisma.serviceProvider.findMany({
          where: {
            name: { in: toCreate.map(p => normalizeProviderName(p.name)) },
          },
          select: { id: true, name: true },
        });

        for (const provider of newlyCreated) {
          result.set(provider.name.toLowerCase(), provider.id);
          console.log(`[PROVIDER SEEDER] Created provider: ${provider.name}`);
        }
      } catch (error: any) {
        console.error(`[PROVIDER SEEDER] Batch insert failed:`, error.message);
      }
    }
  }

  return result;
}

export async function seedServiceProvidersFromUniqueNames(
  companyId: string,
  uniqueNames: string[]
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for seeding service providers');
  }

  const providers: ServiceProviderData[] = uniqueNames
    .filter(name => name && name.trim())
    .map(name => ({
      name: normalizeProviderName(name),
      isActive: true,
    }));

  return seedServiceProviders(companyId, providers);
}

export async function createProviderLookupMap(
  companyId: string
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for provider lookup');
  }

  const tenantPrisma = getTenantPrisma(companyId);
  const providers = await tenantPrisma.serviceProvider.findMany({
    select: { id: true, name: true },
  });

  const result = new Map<string, string>();
  for (const provider of providers) {
    result.set(provider.name.toLowerCase(), provider.id);
  }

  console.log(`[PROVIDER LOOKUP] Built map with ${result.size} providers`);
  return result;
}

export async function ensureProviderExists(
  companyId: string,
  providerName: string
): Promise<string> {
  if (!companyId) {
    throw new Error('🚫 companyId is required');
  }

  const normalizedName = normalizeProviderName(providerName);
  if (!normalizedName) {
    throw new Error('Provider name is required');
  }

  const tenantPrisma = getTenantPrisma(companyId);

  const existing = await tenantPrisma.serviceProvider.findFirst({
    where: { name: normalizedName },
  });

  if (existing) {
    return existing.id;
  }

  const created = await tenantPrisma.serviceProvider.create({
    data: {
      name: normalizedName,
      isActive: true,
    },
  });

  console.log(`[PROVIDER] Auto-created missing provider: ${normalizedName} (${created.id})`);
  return created.id;
}

export function buildProviderLookup(providers: { id: string; name: string }[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const provider of providers) {
    result.set(provider.name.toLowerCase(), provider.id);
  }
  return result;
}