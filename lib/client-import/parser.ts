import Papa from "papaparse";
import * as XLSX from "xlsx";
import { RawCSVRow, ParsedCSVRow } from "./types";

export interface ParseResult {
  data: ParsedCSVRow[];
  errors: string[];
}

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
}

function createColumnMapper(headers: string[]): (row: RawCSVRow, ...possibleNames: string[]) => string {
  const columnMap: Record<string, string> = {};
  headers.forEach((col) => {
    columnMap[normalizeColumnName(col)] = col;
  });

  return (row: RawCSVRow, ...possibleNames: readonly string[]): string => {
    for (const name of possibleNames) {
      const normalized = normalizeColumnName(name);
      const actualCol = columnMap[normalized];
      if (actualCol && row[actualCol] !== undefined) {
        const val = row[actualCol];
        if (val === null || val === undefined) return "";
        return String(val).trim();
      }
    }
    return "";
  };
}

function parseExcel(buffer: ArrayBuffer): ParseResult {
  const errors: string[] = [];
  
  try {
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json<RawCSVRow>(sheet, { defval: "" });
    
    if (jsonData.length === 0) {
      return { data: [], errors: ["Excel file is empty"] };
    }

    const headers = Object.keys(jsonData[0]);
    const getColumnValue = createColumnMapper(headers);

    const data: ParsedCSVRow[] = jsonData
      .filter((row) => row && Object.keys(row).length > 0)
      .map((row) => ({
        userId: getColumnValue(row as RawCSVRow, "username", "userid", "user_id", "User ID", "id"),
        fullName: getColumnValue(row as RawCSVRow, "name", "fullname", "full_name", "full name", "clientname", "client_name", "Full Name"),
        area: getColumnValue(row as RawCSVRow, "area", "areaName", "area_name", "area name", "Area") || null,
        package: getColumnValue(row as RawCSVRow, "package", "packagename", "package_name", "package name", "plan", "service", "speed", "Package"),
        monthlyFee: getColumnValue(row as RawCSVRow, "salesprice", "sales_price", "sales price", "monthlyfee", "monthly fee", "Monthly Fee", "price", "amount", "fee", "charges") || null,
        purchasePrice: getColumnValue(row as RawCSVRow, "purchaseprice", "purchase_price", "purchase price", "cost", "costprice", "cost_price") || null,
        serviceProvider: getColumnValue(row as RawCSVRow, "serviceprovider", "service_provider", "service provider", "provider", "isp", "Service Provider") || null,
      }));
    
    return { data, errors };
  } catch (err: any) {
    errors.push(`Excel parsing error: ${err.message}`);
    return { data: [], errors };
  }
}

function parseCSVData(text: string): ParseResult {
  const parsed = Papa.parse<RawCSVRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header: string) => header.trim(),
  });

  const errors: string[] = [];

  if (parsed.errors.length) {
    parsed.errors.forEach((err) => {
      errors.push(`Row ${err.row}: ${err.message}`);
    });
  }

  if (parsed.data.length === 0) {
    return { data: [], errors };
  }

  const headers = Object.keys(parsed.data[0]);
  const getColumnValue = createColumnMapper(headers);

  const data: ParsedCSVRow[] = parsed.data
    .filter((row) => row && Object.keys(row).length > 0)
    .map((row) => ({
      userId: getColumnValue(row, "username", "userid", "user_id", "User ID", "id"),
      fullName: getColumnValue(row, "name", "fullname", "full_name", "full name", "clientname", "client_name", "Full Name"),
      area: getColumnValue(row, "area", "areaName", "area_name", "area name", "Area") || null,
      package: getColumnValue(row, "package", "packagename", "package_name", "package name", "plan", "service", "speed", "Package"),
      monthlyFee: getColumnValue(row, "salesprice", "sales_price", "sales price", "monthlyfee", "monthly fee", "Monthly Fee", "price", "amount", "fee", "charges") || null,
      purchasePrice: getColumnValue(row, "purchaseprice", "purchase_price", "purchase price", "cost", "costprice", "cost_price") || null,
      serviceProvider: getColumnValue(row, "serviceprovider", "service_provider", "service provider", "provider", "isp", "Service Provider") || null,
    }));

  return { data, errors };
}

export function parseCSV(text: string): ParseResult {
  return parseCSVData(text);
}

export function parseFile(content: string | ArrayBuffer, fileName: string): ParseResult {
  const ext = fileName.toLowerCase().split(".").pop();
  
  if (ext === "xlsx" || ext === "xls") {
    if (typeof content === "string") {
      return { data: [], errors: ["Excel files must be passed as ArrayBuffer"] };
    }
    return parseExcel(content);
  }
  
  return parseCSV(content as string);
}