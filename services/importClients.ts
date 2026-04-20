import * as XLSX from 'xlsx';
import { prisma } from '../lib/prisma';
import { getTenantPrisma } from '../prisma/tenant';
import { normalizePackageName, buildPackageLookup } from './packageSeeder';
import { normalizeProviderName, buildProviderLookup, seedServiceProvidersFromUniqueNames } from './providerSeeder';
import {
  ClientImportRow,
  ValidatedClientData,
  validateClientRow,
  getClientCreateInput,
} from '../validators/client.schema';

export interface ImportResult {
  totalRows: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  errors: ImportError[];
}

export interface ImportError {
  rowIndex: number;
  type: 'VALIDATION' | 'DUPLICATE' | 'FK_ERROR' | 'IDEMPOTENCY';
  field?: string;
  reason: string;
  rawData: Record<string, unknown>;
}

export interface ImportOptions {
  companyId: string;
  adminId: string;
  excelFilePath: string;
  sheetName?: string;
  createPackagesIfMissing?: boolean;
  createProvidersIfMissing?: boolean;
  createAreasIfMissing?: boolean;
  defaultPackagePrice?: number;
  defaultPackageDuration?: number;
  defaultProviderPrice?: number;
}

const BATCH_SIZE = 50;

function parseExcelFile(
  filePath: string,
  sheetName: string
): ClientImportRow[] {
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  
  const sheetNames = workbook.SheetNames;
  if (!sheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found. Available: ${sheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rawData.map(row => ({
    username: row.username as string | null | undefined,
    name: row.name as string | null | undefined,
    area: row.area as string | null | undefined,
    package: row.package as string | null | undefined,
    salesprice: row.salesprice as string | number | null | undefined,
    service_provider: row['service provider'] as string | null | undefined,
    purchaseprice: row.purchaseprice as string | number | null | undefined,
  }));
}

function extractUniquePackages(rows: ClientImportRow[]): string[] {
  const packageSet = new Set<string>();
  
  for (const row of rows) {
    const pkg = row.package;
    if (pkg && typeof pkg === 'string' && pkg.trim()) {
      const normalized = normalizePackageName(pkg);
      packageSet.add(normalized);
    }
  }

  return Array.from(packageSet);
}

function extractUniqueProviders(rows: ClientImportRow[]): string[] {
  const providerSet = new Set<string>();
  
  for (const row of rows) {
    const provider = row.service_provider;
    if (provider && typeof provider === 'string' && provider.trim()) {
      const normalized = normalizeProviderName(provider);
      if (normalized) {
        providerSet.add(normalized);
      }
    }
  }

  return Array.from(providerSet);
}

function extractUniqueAreas(rows: ClientImportRow[]): string[] {
  const areaSet = new Set<string>();
  
  for (const row of rows) {
    const area = row.area;
    if (area && typeof area === 'string' && area.trim()) {
      areaSet.add(normalizeArea(area));
    }
  }

  return Array.from(areaSet);
}

export function normalizeArea(name: string): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
}

async function ensurePackagesExist(
  companyId: string,
  adminId: string,
  packageNames: string[],
  createIfMissing: boolean,
  defaultPrice: number,
  defaultDuration: number
): Promise<Map<string, string>> {
  const tenantPrisma = getTenantPrisma(companyId);

  const normalizedNames = packageNames.map(name => normalizePackageName(name));
  const uniqueNormalizedNames = [...new Set(normalizedNames)];

  const existingPackages = await tenantPrisma.package.findMany({
    where: {
      name: { in: uniqueNormalizedNames },
    },
    select: { id: true, name: true },
  });

  const lookupMap = buildPackageLookup(existingPackages);

  const missingPackages = uniqueNormalizedNames.filter(name => !lookupMap.has(name.toLowerCase()));

  if (missingPackages.length > 0 && createIfMissing) {
    const packagesToCreate = missingPackages.map(name => {
      const speed = parseInt(name.match(/\d+/)?.[0] || '0', 10);
      
      return {
        name: name,
        speed: speed || 0,
        price: defaultPrice,
        durationDays: defaultDuration,
        description: `Auto-created during import: ${name}`,
        createdBy: adminId,
      };
    });

    try {
      await tenantPrisma.package.createMany({
        data: packagesToCreate,
        skipDuplicates: true,
      });

      const newlyCreated = await tenantPrisma.package.findMany({
        where: {
          name: { in: missingPackages },
        },
        select: { id: true, name: true },
      });

      for (const pkg of newlyCreated) {
        lookupMap.set(pkg.name.toLowerCase(), pkg.id);
        console.log(`[IMPORT] Auto-created package: ${pkg.name}`);
      }
    } catch (error: any) {
      console.error(`[IMPORT] Failed to create packages:`, error.message);
    }
  }

  return lookupMap;
}

async function ensureProvidersExist(
  companyId: string,
  providerNames: string[],
  createIfMissing: boolean
): Promise<Map<string, string>> {
  const tenantPrisma = getTenantPrisma(companyId);

  const normalizedToOriginal = new Map<string, string>();
  for (const name of providerNames) {
    if (!name) continue;
    const normalized = normalizeProviderName(name);
    if (normalized && !normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, name.trim());
    }
  }

  const normalizedNames = Array.from(normalizedToOriginal.keys());
  const originalNames = Array.from(normalizedToOriginal.values());

  const existingProviders = await tenantPrisma.serviceProvider.findMany({
    where: {
      companyId,
      name: { in: originalNames },
    },
    select: { id: true, name: true },
  });

  const lookupMap = buildProviderLookup(existingProviders);

  const missingNormalized = normalizedNames.filter(name => !lookupMap.has(name.toLowerCase()));

  if (missingNormalized.length > 0 && createIfMissing) {
    try {
      const providersToCreate = missingNormalized.map(normalized => ({
        name: normalizedToOriginal.get(normalized)!,
        isActive: true,
      }));

      await tenantPrisma.serviceProvider.createMany({
        data: providersToCreate,
        skipDuplicates: true,
      });

      const newlyCreated = await tenantPrisma.serviceProvider.findMany({
        where: {
          companyId,
          name: { in: providersToCreate.map(p => p.name) },
        },
        select: { id: true, name: true },
      });

      for (const provider of newlyCreated) {
        lookupMap.set(normalizeProviderName(provider.name), provider.id);
        console.log(`[IMPORT] Auto-created provider: ${provider.name}`);
      }
    } catch (error: any) {
      console.error(`[IMPORT] Failed to create providers:`, error.message);
    }
  }

  return lookupMap;
}

async function ensureAreasExist(
  companyId: string,
  areaNames: string[],
  createIfMissing: boolean
): Promise<Map<string, string>> {
  const tenantPrisma = getTenantPrisma(companyId);
  const areaMap = new Map<string, string>();

  if (areaNames.length === 0) {
    return areaMap;
  }

  const normalizedToOriginal = new Map<string, string>();
  for (const name of areaNames) {
    if (!name) continue;
    const normalized = normalizeArea(name);
    if (normalized && !normalizedToOriginal.has(normalized)) {
      normalizedToOriginal.set(normalized, name.trim());
    }
  }

  const normalizedAreaNames = Array.from(normalizedToOriginal.keys());
  const originalAreaNames = Array.from(normalizedToOriginal.values());

  const existingAreas = await tenantPrisma.area.findMany({
    where: {
      companyId,
      name: { in: originalAreaNames },
    },
    select: { id: true, name: true },
  });

  for (const area of existingAreas) {
    areaMap.set(normalizeArea(area.name), area.id);
  }

  const missingNormalized = normalizedAreaNames.filter(name => !areaMap.has(name));

  if (missingNormalized.length > 0 && createIfMissing) {
    try {
      const areasToCreate = missingNormalized.map(normalized => ({
        name: normalizedToOriginal.get(normalized)!,
        companyId,
      }));

      await tenantPrisma.area.createMany({
        data: areasToCreate,
        skipDuplicates: true,
      });

      const newlyCreated = await tenantPrisma.area.findMany({
        where: {
          companyId,
          name: { in: areasToCreate.map(a => a.name) },
        },
        select: { id: true, name: true },
      });

      for (const area of newlyCreated) {
        areaMap.set(normalizeArea(area.name), area.id);
        console.log(`[IMPORT] Auto-created area: ${area.name}`);
      }
    } catch (error: any) {
      console.error(`[IMPORT] Failed to create areas:`, error.message);
    }
  }

  return areaMap;
}

async function checkExistingRecords(
  companyId: string,
  importHashes: string[]
): Promise<Set<string>> {
  const tenantPrisma = getTenantPrisma(companyId);
  
  const existing = await tenantPrisma.client.findMany({
    where: {
      companyId,
      importHash: { in: importHashes },
    },
    select: { importHash: true },
  });

  return new Set(existing.map((c: { importHash: string | null }) => c.importHash!));
}

async function processBatch(
  rows: ClientImportRow[],
  companyId: string,
  adminId: string,
  packageLookup: Map<string, string>,
  providerLookup: Map<string, string>,
  areaLookup: Map<string, string>,
  startIndex: number
): Promise<{ success: number; errors: ImportError[] }> {
  const tenantPrisma = getTenantPrisma(companyId);
  const validClients: any[] = [];
  let successCount = 0;
  const errors: ImportError[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = startIndex + i + 2;

    try {
      const validation = await validateClientRow(
        row,
        startIndex + i,
        companyId,
        adminId,
        packageLookup
      );

      if (!validation.success) {
        errors.push({
          rowIndex,
          type: 'VALIDATION',
          reason: validation.errors.map(e => `${e.field}: ${e.message}`).join('; '),
          rawData: row as unknown as Record<string, unknown>,
        });
        continue;
      }

      const areaId = row.area ? areaLookup.get(normalizeArea(row.area)) || null : null;
      const providerName = row.service_provider;
      
      if (providerName && !providerLookup.has(normalizeProviderName(providerName))) {
        errors.push({
          rowIndex,
          type: 'FK_ERROR',
          field: 'service_provider',
          reason: `Service provider not found: ${providerName}`,
          rawData: row as unknown as Record<string, unknown>,
        });
        continue;
      }
      
      const providerId = providerName ? providerLookup.get(normalizeProviderName(providerName)) || null : null;
      const clientData = getClientCreateInput(validation.data!, areaId, providerId);

      validClients.push(clientData);
      successCount++;

    } catch (error: any) {
      errors.push({
        rowIndex,
        type: 'VALIDATION',
        reason: error.message || 'Unknown error',
        rawData: row as unknown as Record<string, unknown>,
      });
    }
  }

  if (validClients.length > 0) {
    try {
      const importHashes = validClients.map(c => c.importHash).filter((h): h is string => !!h);
      const existingHashes = await checkExistingRecords(companyId, importHashes);
      
      const toInsert = validClients.filter(c => !existingHashes.has(c.importHash!));
      const skipped = validClients.length - toInsert.length;

      if (skipped > 0) {
        errors.push({
          rowIndex: -1,
          type: 'IDEMPOTENCY',
          reason: `${skipped} duplicate(s) skipped (import hash already exists)`,
          rawData: {},
        });
      }

      if (toInsert.length > 0) {
        try {
          await prisma.$transaction(async (tx) => {
            await tx.client.createMany({
              data: toInsert as any,
              skipDuplicates: true,
            });
          });
          console.log(`[IMPORT] Batch inserted ${toInsert.length} clients`);
        } catch (error: any) {
          const errorMessage = error.message || '';
          if (errorMessage.includes('Unique constraint') || errorMessage.includes('duplicate key')) {
            errors.push({
              rowIndex: -1,
              type: 'IDEMPOTENCY',
              reason: `Race condition: duplicate detected during concurrent import`,
              rawData: {},
            });
          } else {
            errors.push({
              rowIndex: -1,
              type: 'FK_ERROR',
              reason: `Batch insert failed: ${error.message}`,
              rawData: {},
            });
          }
        }
      }
    } catch (error: any) {
      console.error(`[IMPORT] Batch insert failed:`, error.message);
      errors.push({
        rowIndex: -1,
        type: 'FK_ERROR',
        reason: `Batch insert failed: ${error.message}`,
        rawData: {},
      });
    }
  }

  return { success: successCount, errors };
}

export async function importClientsFromExcel(
  options: ImportOptions
): Promise<ImportResult> {
  const {
    companyId,
    adminId,
    excelFilePath,
    sheetName = 'Sheet1',
    createPackagesIfMissing = true,
    createProvidersIfMissing = true,
    createAreasIfMissing = true,
    defaultPackagePrice = 0,
    defaultPackageDuration = 30,
    defaultProviderPrice = 0,
  } = options;

  if (!companyId) {
    throw new Error('🚫 companyId is required for client import');
  }

  if (!adminId) {
    throw new Error('🚫 adminId is required for client import');
  }

  console.log(`[IMPORT] Starting import from ${excelFilePath}, sheet: ${sheetName}`);

  const rows = parseExcelFile(excelFilePath, sheetName);
  const totalRows = rows.length;
  console.log(`[IMPORT] Found ${totalRows} rows in sheet "${sheetName}"`);

  const uniquePackages = extractUniquePackages(rows);
  console.log(`[IMPORT] Found ${uniquePackages.length} unique packages`);

  const uniqueProviders = extractUniqueProviders(rows);
  console.log(`[IMPORT] Found ${uniqueProviders.length} unique providers`);

  const uniqueAreas = extractUniqueAreas(rows);
  console.log(`[IMPORT] Found ${uniqueAreas.length} unique areas`);

  const packageLookup = await ensurePackagesExist(
    companyId,
    adminId,
    uniquePackages,
    createPackagesIfMissing,
    defaultPackagePrice,
    defaultPackageDuration
  );

  const providerLookup = await ensureProvidersExist(
    companyId,
    uniqueProviders,
    createProvidersIfMissing
  );

  const areaLookup = await ensureAreasExist(
    companyId,
    uniqueAreas,
    createAreasIfMissing
  );

  const result: ImportResult = {
    totalRows,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const batchResult = await processBatch(
      batch,
      companyId,
      adminId,
      packageLookup,
      providerLookup,
      areaLookup,
      i
    );

    result.successCount += batchResult.success;
    result.skippedCount += batchResult.errors.filter(e => e.type !== 'FK_ERROR').length;
    result.failedCount += batchResult.errors.filter(e => e.type === 'FK_ERROR').length;
    result.errors.push(...batchResult.errors);

    console.log(`[IMPORT] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(totalRows / BATCH_SIZE)}`);
  }

  console.log(`[IMPORT] Summary: ${result.successCount} success, ${result.skippedCount} skipped, ${result.failedCount} failed`);

  return result;
}

export async function importClientsFromBuffer(
  companyId: string,
  adminId: string,
  buffer: Buffer,
  options?: {
    sheetName?: string;
    createPackagesIfMissing?: boolean;
    createProvidersIfMissing?: boolean;
    createAreasIfMissing?: boolean;
    defaultPackagePrice?: number;
    defaultPackageDuration?: number;
    defaultProviderPrice?: number;
  }
): Promise<ImportResult> {
  const createPackagesIfMissing = options?.createPackagesIfMissing ?? true;
  const createProvidersIfMissing = options?.createProvidersIfMissing ?? true;
  const createAreasIfMissing = options?.createAreasIfMissing ?? true;
  const defaultPackagePrice = options?.defaultPackagePrice ?? 0;
  const defaultPackageDuration = options?.defaultPackageDuration ?? 30;

  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const sheetName = options?.sheetName || 'Sheet1';
  const sheetNames = workbook.SheetNames;
  
  if (!sheetNames.includes(sheetName)) {
    throw new Error(`Sheet "${sheetName}" not found. Available: ${sheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  const importRows: ClientImportRow[] = rows.map(row => ({
    username: row.username as string | null | undefined,
    name: row.name as string | null | undefined,
    area: row.area as string | null | undefined,
    package: row.package as string | null | undefined,
    salesprice: row.salesprice as string | number | null | undefined,
    service_provider: row['service provider'] as string | null | undefined,
    purchaseprice: row.purchaseprice as string | number | null | undefined,
  }));

  const totalRows = importRows.length;
  console.log(`[IMPORT] Found ${totalRows} rows in sheet "${sheetName}"`);

  const uniquePackages = extractUniquePackages(importRows);
  const uniqueProviders = extractUniqueProviders(importRows);
  const uniqueAreas = extractUniqueAreas(importRows);

  const packageLookup = await ensurePackagesExist(
    companyId,
    adminId,
    uniquePackages,
    options?.createPackagesIfMissing ?? false,
    options?.defaultPackagePrice ?? 0,
    options?.defaultPackageDuration ?? 30
  );

  const providerLookup = await ensureProvidersExist(
    companyId,
    uniqueProviders,
    options?.createProvidersIfMissing ?? false
  );

  const areaLookup = await ensureAreasExist(
    companyId,
    uniqueAreas,
    options?.createAreasIfMissing ?? false
  );

  const result: ImportResult = {
    totalRows,
    successCount: 0,
    skippedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (let i = 0; i < importRows.length; i += BATCH_SIZE) {
    const batch = importRows.slice(i, i + BATCH_SIZE);
    const batchResult = await processBatch(
      batch,
      companyId,
      adminId,
      packageLookup,
      providerLookup,
      areaLookup,
      i
    );

    result.successCount += batchResult.success;
    result.skippedCount += batchResult.errors.filter(e => e.type !== 'FK_ERROR').length;
    result.failedCount += batchResult.errors.filter(e => e.type === 'FK_ERROR').length;
    result.errors.push(...batchResult.errors);
  }

  console.log(`[IMPORT] Summary: ${result.successCount} success, ${result.skippedCount} skipped, ${result.failedCount} failed`);

  return result;
}