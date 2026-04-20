import { ParsedCSVRow, ValidationError } from "./types";

export function validateRow(
  row: ParsedCSVRow,
  rowIndex: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!row.userId || row.userId === "") {
    errors.push({
      row: rowIndex,
      field: "User ID",
      message: "User ID is required",
    });
  }

  if (!row.fullName || row.fullName === "") {
    errors.push({
      row: rowIndex,
      field: "Full Name",
      message: "Full Name is required",
    });
  }

  if (!row.package || row.package === "") {
    errors.push({
      row: rowIndex,
      field: "Package",
      message: "Package is required",
    });
  }

  if (row.userId && row.userId.length > 50) {
    errors.push({
      row: rowIndex,
      field: "User ID",
      message: "User ID exceeds maximum length of 50 characters",
    });
  }

  if (row.fullName && row.fullName.length > 100) {
    errors.push({
      row: rowIndex,
      field: "Full Name",
      message: "Full Name exceeds maximum length of 100 characters",
    });
  }

  return errors;
}

export function validateAllRows(
  rows: ParsedCSVRow[]
): Map<number, ValidationError[]> {
  const errorMap = new Map<number, ValidationError[]>();

  rows.forEach((row, index) => {
    const rowNum = index + 2;
    const errors = validateRow(row, rowNum);
    if (errors.length > 0) {
      errorMap.set(rowNum, errors);
    }
  });

  return errorMap;
}