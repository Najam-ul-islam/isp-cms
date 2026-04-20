let zod: typeof import('zod') | null = null;

async function getZod() {
  if (!zod) {
    try {
      zod = await import('zod');
    } catch {
      throw new Error('zod is required but not installed. Run: npm install zod');
    }
  }
  return zod!;
}

export interface ClientImportRow {
  username?: string | null;
  name?: string | null;
  area?: string | null;
  package?: string | null;
  salesprice?: string | number | null;
  service_provider?: string | null;
  purchaseprice?: string | number | null;
}

export interface ValidatedClientData {
  username: string | null;
  name: string;
  phone: string;
  cnic: string;
  email: null;
  city: string;
  areaName: string | null;
  country: string;
  packageId: string;
  price: number;
  startDate: Date;
  expiryDate: Date;
  paymentStatus: 'unpaid';
  status: 'active';
  notes: string | null;
  createdBy: string;
  companyId: string;
  serviceProviderId?: string;
  importHash: string;
}

export interface ClientValidationError {
  field: string;
  message: string;
}

export interface ClientValidationResult {
  success: boolean;
  data?: ValidatedClientData;
  errors: ClientValidationError[];
}

function generateDeterministicPlaceholder(
  prefix: string,
  rowIndex: number,
  companyId: string
): string {
  if (!companyId) {
    throw new Error('companyId is required for deterministic placeholder generation');
  }
  return `${prefix}-${companyId.slice(0, 4).toUpperCase()}-${rowIndex.toString().padStart(4, '0')}`;
}

export function parsePrice(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

export function normalizeString(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function generateImportHash(
  companyId: string,
  username: string | null,
  packageId: string,
  phone: string,
  cnic: string
): string {
  const input = `${companyId}|${username || ''}|${packageId}|${phone}|${cnic}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `IMP_${Math.abs(hash).toString(36).toUpperCase()}`;
}

export async function validateClientRow(
  row: ClientImportRow,
  rowIndex: number,
  companyId: string,
  adminId: string,
  packageLookup: Map<string, string>
): Promise<ClientValidationResult> {
  const Zod = await getZod();
  const errors: ClientValidationError[] = [];

  const name = normalizeString(row.name);
  if (!name) {
    errors.push({ field: 'name', message: 'Name is required' });
  }

  const rawPackage = normalizeString(row.package);
  if (!rawPackage) {
    errors.push({ field: 'package', message: 'Package is required' });
  }

  let packageId: string | undefined;
  if (rawPackage) {
    const normalizedPackage = rawPackage.toLowerCase();
    packageId = packageLookup.get(normalizedPackage);

    if (!packageId) {
      errors.push({
        field: 'package',
        message: `Package not found: ${rawPackage}`,
      });
    }
  }

  const rawPrice = row.salesprice;
  const price = parsePrice(rawPrice);

  const phone = generateDeterministicPlaceholder('PHONE', rowIndex, companyId);
  const cnic = generateDeterministicPlaceholder('CNIC', rowIndex, companyId);

  const city = 'Unknown';
  const country = 'Pakistan';
  const areaName = normalizeString(row.area);

  const username = normalizeString(row.username) || null;

  const now = new Date();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  const importHash = generateImportHash(companyId, username, packageId!, phone, cnic);

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const clientSchema = Zod.z.object({
    username: Zod.z.string().nullable(),
    name: Zod.z.string().min(1, 'Name is required'),
    phone: Zod.z.string().min(1, 'Phone is required'),
    cnic: Zod.z.string().min(1, 'CNIC is required'),
    packageId: Zod.z.string().min(1, 'Package ID is required'),
    price: Zod.z.number().min(0, 'Price must be non-negative'),
    importHash: Zod.z.string().min(1, 'Import hash is required'),
  });

  const validated = clientSchema.safeParse({
    username,
    name,
    phone,
    cnic,
    packageId,
    price,
    importHash,
  });

  if (!validated.success) {
    const fieldErrors = validated.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    return { success: false, errors: fieldErrors };
  }

  const data: ValidatedClientData = {
    username,
    name,
    phone,
    cnic,
    email: null,
    city,
    areaName,
    country,
    packageId: packageId!,
    price,
    startDate: now,
    expiryDate: expiry,
    paymentStatus: 'unpaid',
    status: 'active',
    notes: null,
    createdBy: adminId,
    companyId,
    importHash,
  };

  return { success: true, data, errors: [] };
}

export const clientSchema = {
  name: '',
  username: '',
  phone: '',
  cnic: '',
  email: null,
  city: 'Unknown',
  areaName: '',
  country: 'Pakistan',
  packageId: '',
  price: 0,
  startDate: new Date(),
  expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  paymentStatus: 'unpaid' as const,
  status: 'active' as const,
  notes: null,
};

export function getClientCreateInput(
  validated: ValidatedClientData,
  areaId?: string | null,
  serviceProviderId?: string | null
) {
  return {
    username: validated.username,
    name: validated.name,
    phone: validated.phone,
    cnic: validated.cnic,
    email: validated.email,
    city: validated.city,
    areaName: validated.areaName,
    country: validated.country,
    packageId: validated.packageId,
    price: validated.price,
    startDate: validated.startDate,
    expiryDate: validated.expiryDate,
    paymentStatus: validated.paymentStatus,
    status: validated.status,
    notes: validated.notes,
    createdBy: validated.createdBy,
    companyId: validated.companyId,
    areaId: areaId || null,
    serviceProviderId: serviceProviderId || validated.serviceProviderId || null,
    importHash: validated.importHash,
  };
}