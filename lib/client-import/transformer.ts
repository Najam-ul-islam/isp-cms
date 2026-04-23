import { prisma } from "@/lib/prisma";
import { ParsedCSVRow, CacheData, ValidationError } from "./types";

interface PackageData {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  speed: number;
}

function normalizePackageName(name: string): string {
  const trimmed = name.trim().toLowerCase();
  const match = trimmed.match(/(\d+)\s*(mbps|gbps|kbps)?/i);
  if (!match) return trimmed;
  
  const speed = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase() || 'mbps';
  
  if (unit === 'gbps') return `${speed * 1000} Mbps`;
  if (unit === 'kbps') return `${Math.round(speed / 1000)} Mbps`;
  return `${speed} Mbps`;
}

function normalizeAreaName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

function extractSpeed(packageName: string): number {
  const match = packageName.match(/(\d+)\s*(mbps|gbps|kbps)?/i);
  if (!match) return 0;
  
  const speed = parseInt(match[1], 10);
  const unit = match[2]?.toLowerCase() || 'mbps';
  
  if (unit === 'gbps') return speed * 1000;
  if (unit === 'kbps') return Math.round(speed / 1000);
  return speed;
}

export async function buildCaches(companyId: string, adminId: string): Promise<CacheData> {
  const [packages, areas, serviceProviders] = await Promise.all([
    prisma.package.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true, price: true, durationDays: true, speed: true },
    }),
    prisma.area.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
    prisma.serviceProvider.findMany({
      where: { companyId },
      select: { id: true, name: true },
    }),
  ]);

  const packageMap = new Map<string, PackageData>();
  const packageBySpeed = new Map<string, PackageData[]>();

  packages.forEach((pkg) => {
    const normalizedName = normalizePackageName(pkg.name);
    if (!packageMap.has(normalizedName)) {
      const pkgData: PackageData = {
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        durationDays: pkg.durationDays,
        speed: pkg.speed,
      };
      packageMap.set(normalizedName, pkgData);

      const speedKey = String(pkg.speed);
      if (!packageBySpeed.has(speedKey)) {
        packageBySpeed.set(speedKey, []);
      }
      packageBySpeed.get(speedKey)!.push(pkgData);
    }
  });

  const areaMap = new Map<string, any>();
  areas.forEach((area) => {
    const normalizedName = normalizeAreaName(area.name);
    if (!areaMap.has(normalizedName)) {
      areaMap.set(normalizedName, {
        id: area.id,
        name: area.name,
      });
    }
  });

  const providerMap = new Map<string, any>();
  serviceProviders.forEach((provider) => {
    const normalizedName = provider.name.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    if (!providerMap.has(normalizedName)) {
      providerMap.set(normalizedName, {
        id: provider.id,
        name: provider.name,
      });
    }
  });

  return { packageMap, areaMap, packageBySpeed, providerMap };
}

export interface PackageImportMeta {
  salePrice: number | null;
  purchasePrice: number | null;
  serviceProviderId: string | null;
}

export async function ensurePackagesExist(
  companyId: string,
  adminId: string,
  packageNames: string[],
  packageMeta?: Map<string, PackageImportMeta>
): Promise<Map<string, PackageData>> {
  const normalizedNames = [...new Set(packageNames.map(normalizePackageName))];

  const existingPackages = await prisma.package.findMany({
    where: { companyId, name: { in: normalizedNames } },
    select: { id: true, name: true, price: true, durationDays: true, speed: true, purchasePrice: true, serviceProviderId: true },
  });

  const packageMap = new Map<string, PackageData>();
  const packagesToUpdate: { id: string; data: Record<string, unknown> }[] = [];

  existingPackages.forEach(pkg => {
    const normalized = normalizePackageName(pkg.name);
    packageMap.set(normalized, {
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      durationDays: pkg.durationDays,
      speed: pkg.speed,
    });

    if (packageMeta) {
      const meta = packageMeta.get(normalized);
      if (meta) {
        const updates: Record<string, unknown> = {};
        if (meta.salePrice !== null && pkg.price === 0) {
          updates.price = meta.salePrice;
        }
        if (meta.purchasePrice !== null && pkg.purchasePrice == null) {
          updates.purchasePrice = meta.purchasePrice;
        }
        if (meta.serviceProviderId && !pkg.serviceProviderId) {
          updates.serviceProviderId = meta.serviceProviderId;
        }
        if (Object.keys(updates).length > 0) {
          packagesToUpdate.push({ id: pkg.id, data: updates });
        }
      }
    }
  });

  if (packagesToUpdate.length > 0) {
    await Promise.all(
      packagesToUpdate.map(({ id, data }) =>
        prisma.package.update({ where: { id }, data })
      )
    );
    console.log(`[IMPORT] Updated ${packagesToUpdate.length} existing packages with missing price/provider data`);
  }

  const missingPackages = normalizedNames.filter(name => !packageMap.has(name));

  if (missingPackages.length > 0) {
    const packagesToCreate = missingPackages.map(name => {
      const meta = packageMeta?.get(name);
      return {
        name,
        speed: extractSpeed(name),
        price: meta?.salePrice ?? 0,
        purchasePrice: meta?.purchasePrice ?? undefined,
        serviceProviderId: meta?.serviceProviderId ?? undefined,
        durationDays: 30,
        description: `Auto-created during import: ${name}`,
        createdBy: adminId,
        isActive: true,
        companyId,
      };
    });

    await prisma.package.createMany({
      data: packagesToCreate,
      skipDuplicates: true,
    });

    const newlyCreated = await prisma.package.findMany({
      where: { companyId, name: { in: missingPackages } },
      select: { id: true, name: true, price: true, durationDays: true, speed: true },
    });

    newlyCreated.forEach(pkg => {
      const normalized = normalizePackageName(pkg.name);
      packageMap.set(normalized, {
        id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        durationDays: pkg.durationDays,
        speed: pkg.speed,
      });
    });

    console.log(`[IMPORT] Auto-created ${missingPackages.length} packages`);
  }

  return packageMap;
}

export async function ensureAreasExist(
  companyId: string,
  areaNames: string[]
): Promise<Map<string, any>> {
  const normalizedToOriginal = new Map<string, string>();
  for (const name of areaNames) {
    if (!name) continue;
    const normalized = normalizeAreaName(name);
    if (!normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, name.trim());
    }
  }

  const originalNames = Array.from(normalizedToOriginal.values());
  
  const existingAreas = await prisma.area.findMany({
    where: { companyId, name: { in: originalNames } },
    select: { id: true, name: true },
  });

  const areaMap = new Map<string, any>();
  existingAreas.forEach(area => {
    const normalized = normalizeAreaName(area.name);
    areaMap.set(normalized, { id: area.id, name: area.name });
  });

  const missingNormalized = [...normalizedToOriginal.keys()].filter(n => !areaMap.has(n));

  if (missingNormalized.length > 0) {
    const areasToCreate = missingNormalized.map(normalized => ({
      name: normalizedToOriginal.get(normalized)!,
      companyId,
    }));

    await prisma.area.createMany({
      data: areasToCreate,
      skipDuplicates: true,
    });

    const newlyCreated = await prisma.area.findMany({
      where: { companyId, name: { in: areasToCreate.map(a => a.name) } },
      select: { id: true, name: true },
    });

    newlyCreated.forEach(area => {
      const normalized = normalizeAreaName(area.name);
      areaMap.set(normalized, { id: area.id, name: area.name });
    });

    console.log(`[IMPORT] Auto-created ${missingNormalized.length} areas`);
  }

  return areaMap;
}

export async function ensureProvidersExist(
  companyId: string,
  providerNames: string[]
): Promise<Map<string, any>> {
  const normalizedToOriginal = new Map<string, string>();
  for (const name of providerNames) {
    if (!name) continue;
    const normalized = name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    if (!normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, name.trim());
    }
  }

  const originalNames = Array.from(normalizedToOriginal.values());
  
  const existingProviders = await prisma.serviceProvider.findMany({
    where: { companyId, name: { in: originalNames } },
    select: { id: true, name: true },
  });

  const providerMap = new Map<string, any>();
  existingProviders.forEach(provider => {
    const normalized = provider.name.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    providerMap.set(normalized, { id: provider.id, name: provider.name });
  });

  const missingNormalized = [...normalizedToOriginal.keys()].filter(n => !providerMap.has(n));

  if (missingNormalized.length > 0) {
    const providersToCreate = missingNormalized.map(normalized => ({
      name: normalizedToOriginal.get(normalized)!,
      companyId,
      isActive: true,
    }));

    await prisma.serviceProvider.createMany({
      data: providersToCreate,
      skipDuplicates: true,
    });

    const newlyCreated = await prisma.serviceProvider.findMany({
      where: { companyId, name: { in: providersToCreate.map(p => p.name) } },
      select: { id: true, name: true },
    });

    newlyCreated.forEach(provider => {
      const normalized = provider.name.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
      providerMap.set(normalized, { id: provider.id, name: provider.name });
    });

    console.log(`[IMPORT] Auto-created ${missingNormalized.length} providers`);
  }

  return providerMap;
}

export function transformRow(
  row: ParsedCSVRow,
  caches: CacheData,
  companyId: string,
  adminId: string,
  rowNum: number
): { data: any; warnings: string[] } {
  const warnings: string[] = [];

  const normalizedPackage = normalizePackageName(row.package);
  let pkg = caches.packageMap.get(normalizedPackage);
  
  if (!pkg) {
    const csvSpeed = extractSpeed(row.package);
    if (csvSpeed > 0) {
      const packagesBySpeed = caches.packageBySpeed?.get(String(csvSpeed));
      if (packagesBySpeed && packagesBySpeed.length >= 1) {
        pkg = packagesBySpeed[0];
      }
    }
  }

  if (!pkg) {
    const availablePackages = Array.from(caches.packageMap.values());
    const suggestion = availablePackages.length > 0 
      ? `. Available packages: ${availablePackages.map(p => p.name).slice(0, 5).join(", ")}`
      : "";
    throw new Error(`Package not found: "${row.package}"${suggestion}`);
  }

  let areaId: string | null = null;
  if (row.area) {
    const normalizedArea = normalizeAreaName(row.area);
    const area = caches.areaMap.get(normalizedArea);
    if (area) {
      areaId = area.id;
    }
  }

  let providerId: string | null = null;
  if (row.serviceProvider) {
    const normalizedProvider = row.serviceProvider.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    const provider = caches.providerMap?.get(normalizedProvider);
    if (provider) {
      providerId = provider.id;
    }
  }

  let price: number;
  if (row.monthlyFee && row.monthlyFee !== "") {
    const parsedPrice = parseFloat(row.monthlyFee);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      warnings.push(`Invalid monthly fee "${row.monthlyFee}", using package price instead`);
      price = pkg.price;
    } else {
      price = parsedPrice;
    }
  } else {
    price = pkg.price;
  }

  const now = new Date();
  const expiryDate = new Date(now);
  expiryDate.setDate(now.getDate() + pkg.durationDays);

  return {
    data: {
      name: row.fullName,
      username: row.userId,
      phone: `TEMP_${rowNum}_${Date.now()}`,
      cnic: `TEMP_${rowNum}_${Date.now()}`,
      email: null,
      city: "Rawalpindi",
      country: "Pakistan",
      areaName: row.area,
      areaId: areaId,
      packageId: pkg.id,
      serviceProviderId: providerId,
      price: price,
      startDate: now,
      expiryDate: expiryDate,
      paymentStatus: "unpaid",
      status: "active",
      createdBy: adminId,
      companyId: companyId,
    },
    warnings,
  };
}

export function transformAllRows(
  rows: ParsedCSVRow[],
  caches: CacheData,
  companyId: string,
  adminId: string
): {
  valid: { data: any; warnings: string[] }[];
  errors: ValidationError[];
} {
  const valid: { data: any; warnings: string[] }[] = [];
  const errors: ValidationError[] = [];

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    try {
      const result = transformRow(row, caches, companyId, adminId, rowNum);
      valid.push(result);
    } catch (err: any) {
      errors.push({
        row: rowNum,
        field: "transform",
        message: err.message,
      });
    }
  });

  return { valid, errors };
}