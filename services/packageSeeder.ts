import { prisma } from '../lib/prisma';
import { Prisma } from '@prisma/client';
import { getTenantPrisma } from '../prisma/tenant';

export interface PackageData {
  name: string;
  speed: number;
  price: number;
  durationDays: number;
  description?: string;
  purchasePrice?: number;
}

export function normalizePackageName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Package name is required');
  }

  const trimmed = name.trim();
  const lowercased = trimmed.toLowerCase();

  const speedMatch = lowercased.match(/(\d+)\s*(mbps|gbps|kbps)?/i);
  if (!speedMatch) {
    return trimmed;
  }

  const speed = parseInt(speedMatch[1], 10);
  const unit = speedMatch[2]?.toLowerCase() || 'mbps';

  if (unit === 'gbps') {
    return `${speed * 1000} Mbps`;
  } else if (unit === 'kbps') {
    return `${Math.round(speed / 1000)} Mbps`;
  }
  return `${speed} Mbps`;
}

export function extractSpeedFromPackageName(name: string): number {
  const match = name.match(/(\d+)\s*(mbps|gbps|kbps)?/i);
  if (!match) return 0;

  const speed = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase() || 'mbps';

  if (unit === 'gbps') return speed * 1000;
  if (unit === 'kbps') return Math.round(speed / 1000);
  return speed;
}

export function parseDefaultDuration(name: string): number {
  const lowercased = name.toLowerCase();
  if (lowercased.includes('monthly')) return 30;
  if (lowercased.includes('yearly') || lowercased.includes('annual')) return 365;
  if (lowercased.includes('weekly')) return 7;
  if (lowercased.includes('daily')) return 1;
  return 30;
}

export async function seedPackages(
  companyId: string,
  adminId: string,
  packages: PackageData[]
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for seeding packages');
  }

  if (!adminId) {
    throw new Error('🚫 adminId is required for seeding packages');
  }

  const tenantPrisma = getTenantPrisma(companyId);
  const result = new Map<string, string>();
  const batchSize = 50;

  for (let i = 0; i < packages.length; i += batchSize) {
    const batch = packages.slice(i, i + batchSize);
    
    const existingPackages = await tenantPrisma.package.findMany({
      where: {
        name: { in: batch.map(p => p.name) },
      },
      select: { id: true, name: true },
    });

    const existingMap = new Map(existingPackages.map((p: { name: string; id: string }) => [p.name, p.id]));
    
    const toCreate = batch.filter(p => !existingMap.has(p.name));
    
    for (const existing of existingPackages) {
      result.set(existing.name, existing.id);
    }

    if (toCreate.length > 0) {
      try {
        await tenantPrisma.package.createMany({
          data: toCreate.map(p => ({
            name: p.name,
            speed: p.speed,
            price: p.price,
            durationDays: p.durationDays,
            description: p.description || '',
            purchasePrice: p.purchasePrice,
            createdBy: adminId,
          })),
          skipDuplicates: true,
        });

        const newlyCreated = await tenantPrisma.package.findMany({
          where: {
            name: { in: toCreate.map(p => p.name) },
          },
          select: { id: true, name: true },
        });

        for (const pkg of newlyCreated) {
          result.set(pkg.name, pkg.id);
          console.log(`[PACKAGE SEEDER] Created package: ${pkg.name}`);
        }
      } catch (error: any) {
        console.error(`[PACKAGE SEEDER] Batch insert failed:`, error.message);
      }
    }
  }

  return result;
}

export async function seedPackagesFromUniqueNames(
  companyId: string,
  adminId: string,
  uniqueNames: string[]
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for seeding packages');
  }

  const packages: PackageData[] = uniqueNames.map(name => {
    const normalized = normalizePackageName(name);
    const speed = extractSpeedFromPackageName(normalized);
    const duration = parseDefaultDuration(normalized);

    return {
      name: normalized,
      speed,
      price: 0,
      durationDays: duration,
      description: `Auto-seeded package: ${normalized}`,
    };
  });

  return seedPackages(companyId, adminId, packages);
}

export async function createPackageLookupMap(
  companyId: string
): Promise<Map<string, string>> {
  if (!companyId) {
    throw new Error('🚫 companyId is required for package lookup');
  }

  const tenantPrisma = getTenantPrisma(companyId);
  const packages = await tenantPrisma.package.findMany({
    select: { id: true, name: true },
  });

  const result = new Map<string, string>();
  for (const pkg of packages) {
    const normalizedName = normalizePackageName(pkg.name);
    result.set(normalizedName.toLowerCase(), pkg.id);
  }

  console.log(`[PACKAGE LOOKUP] Built map with ${result.size} packages`);
  return result;
}

export async function ensurePackageExists(
  companyId: string,
  adminId: string,
  packageName: string,
  defaultPrice: number = 0,
  defaultDuration: number = 30
): Promise<string> {
  if (!companyId) {
    throw new Error('🚫 companyId is required');
  }

  if (!adminId) {
    throw new Error('🚫 adminId is required');
  }

  const normalizedName = normalizePackageName(packageName);
  const tenantPrisma = getTenantPrisma(companyId);

  const existing = await tenantPrisma.package.findFirst({
    where: { name: normalizedName },
  });

  if (existing) {
    return existing.id;
  }

  const speed = extractSpeedFromPackageName(normalizedName);

  const created = await tenantPrisma.package.create({
    data: {
      name: normalizedName,
      speed,
      price: defaultPrice,
      durationDays: defaultDuration,
      description: `Auto-created package: ${normalizedName}`,
      createdBy: adminId,
    },
  });

  console.log(`[PACKAGE] Auto-created missing package: ${normalizedName} (${created.id})`);
  return created.id;
}

export function buildPackageLookup(packages: { id: string; name: string }[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const pkg of packages) {
    const normalizedName = normalizePackageName(pkg.name);
    result.set(normalizedName.toLowerCase(), pkg.id);
  }
  return result;
}