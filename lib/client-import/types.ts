export interface RawCSVRow {
  [key: string]: unknown;
}

export interface ParsedCSVRow {
  userId: string;
  fullName: string;
  area: string | null;
  package: string;
  monthlyFee: string | null;
  serviceProvider: string | null;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface TransformResult {
  data: any;
  warnings: string[];
}

export interface ImportResult {
  total: number;
  valid: number;
  inserted: number;
  failed: number;
  errors: ValidationError[];
  errorCSV?: string;
}

export interface CacheData {
  packageMap: Map<string, any>;
  areaMap: Map<string, any>;
  packageBySpeed?: Map<string, any>;
  providerMap?: Map<string, any>;
}