import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminFromToken } from "@/lib/jwt";
import { parseFile } from "@/lib/client-import/parser";
import { validateAllRows } from "@/lib/client-import/validator";
import { buildCaches, transformAllRows, ensurePackagesExist, ensureAreasExist, ensureProvidersExist } from "@/lib/client-import/transformer";
import { insertClientsBatch, getImportedClientsWithoutPhone, updateClientPhoneCnic } from "@/lib/client-import/uploader";
import { generateErrorCSV } from "@/lib/client-import/error-csv";
import { ValidationError, ParsedCSVRow } from "@/lib/client-import/types";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromToken(req);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (admin.role !== "SUPER_ADMIN" && admin.role !== "ADMIN" && admin.role !== "EMPLOYEE") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    const isCsv = fileName.endsWith(".csv");

    if (!isCsv && !isExcel) {
      return NextResponse.json({ error: "File must be a CSV or Excel file (.csv, .xlsx, .xls)" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 10MB limit" }, { status: 400 });
    }

    let parsedRows;
    let parseErrors: string[] = [];

    if (isExcel) {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseFile(arrayBuffer, file.name);
      parsedRows = result.data;
      parseErrors = result.errors;
    } else {
      const text = await file.text();
      const result = parseFile(text, file.name);
      parsedRows = result.data;
      parseErrors = result.errors;
    }

    if (parseErrors.length > 0 && parsedRows.length === 0) {
      return NextResponse.json(
        { error: "File parsing failed", details: parseErrors },
        { status: 400 }
      );
    }

    const companyId = admin.companyId;
    const adminId = admin.id;

    const validationErrors = validateAllRows(parsedRows);
    const validationErrorList: ValidationError[] = [];
    validationErrors.forEach((errors, row) => {
      errors.forEach((err) => validationErrorList.push(err));
    });

    const validRowsWithErrors = parsedRows.filter((_, idx) => {
      const rowNum = idx + 2;
      return !validationErrors.has(rowNum);
    });

     // Extract unique package, area, and provider names for auto-creation
     const uniquePackages = [...new Set(validRowsWithErrors.map(r => r.package).filter((p): p is string => p != null))];
     const uniqueAreas = [...new Set(validRowsWithErrors.map(r => r.area).filter((a): a is string => a != null))];
     const uniqueProviders = [...new Set(validRowsWithErrors.map(r => r.serviceProvider).filter((p): p is string => p != null))];

    // Auto-create missing packages, areas, and providers
    console.log(`[IMPORT] Auto-creating ${uniquePackages.length} packages, ${uniqueAreas.length} areas, ${uniqueProviders.length} providers`);
    await Promise.all([
      ensurePackagesExist(companyId, adminId, uniquePackages),
      ensureAreasExist(companyId, uniqueAreas),
      ensureProvidersExist(companyId, uniqueProviders),
    ]);

    const caches = await buildCaches(companyId, adminId);
    const { valid: transformedData, errors: transformErrors } = transformAllRows(
      validRowsWithErrors,
      caches,
      companyId,
      adminId
    );

    const allErrors = [...validationErrorList, ...transformErrors];
    const validData = transformedData.map((t) => t.data);

    if (dryRun) {
      return NextResponse.json({
        total: parsedRows.length,
        valid: validData.length,
        failed: allErrors.length,
        errors: allErrors,
        warnings: transformedData.flatMap((t) => t.warnings),
      });
    }

    if (validData.length === 0) {
      const errorCSV = allErrors.length > 0 ? generateErrorCSV(allErrors) : undefined;
      return NextResponse.json({
        total: parsedRows.length,
        valid: 0,
        inserted: 0,
        failed: allErrors.length,
        errors: allErrors,
        errorCSV,
      });
    }

    const insertResult = await insertClientsBatch(validData);

    const finalErrors: ValidationError[] = [
      ...allErrors,
      ...insertResult.errors.map((e) => ({
        row: e.row,
        field: "insert",
        message: e.message,
      })),
    ];

    const errorCSV = finalErrors.length > 0 ? generateErrorCSV(finalErrors) : undefined;

    return NextResponse.json({
      total: parsedRows.length,
      valid: validData.length,
      inserted: insertResult.inserted,
      failed: finalErrors.length,
      skipped: insertResult.skipped,
      errors: finalErrors,
      errorCSV,
    });
  } catch (err: any) {
    console.error("CSV import error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromToken(req);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pendingClients = await getImportedClientsWithoutPhone(admin.companyId);

    return NextResponse.json({
      count: pendingClients.length,
      clients: pendingClients,
    });
  } catch (err: any) {
    console.error("Get pending clients error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getAdminFromToken(req);

    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, phone, cnic } = body;

    if (!clientId || !phone || !cnic) {
      return NextResponse.json(
        { error: "clientId, phone, and cnic are required" },
        { status: 400 }
      );
    }

    const success = await updateClientPhoneCnic(clientId, phone, cnic);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update client phone/CNIC - may already exist" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Update client phone error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}