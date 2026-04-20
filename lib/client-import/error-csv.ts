import { ValidationError } from "./types";

export function generateErrorCSV(errors: ValidationError[]): string {
  const headers = ["row", "field", "error"];
  const rows = errors.map((e) =>
    [e.row, `"${(e.field || "").replace(/"/g, '""')}"`, `"${(e.message || "").replace(/"/g, '""')}"`].join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function generateErrorCSVBase64(errors: ValidationError[]): string {
  const csv = generateErrorCSV(errors);
  return Buffer.from(csv).toString("base64");
}