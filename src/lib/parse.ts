// Inventra AI — spreadsheet parsing (CSV + Excel), runs in the browser.
// Feeds validation.ts which turns raw rows into import-ready products.

import * as XLSX from "xlsx";
import type { ParsePreview, RawRow } from "./types";
import { validateRows } from "./validation";

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

/** Column aliases → canonical field. Compared case/space/underscore-insensitive. */
const HEADER_ALIASES: Record<string, keyof Omit<RawRow, "rowNumber">> = {
  product: "name",
  productname: "name",
  name: "name",
  item: "name",
  category: "category",
  type: "category",
  stock: "stock",
  quantity: "stock",
  stockquantity: "stock",
  qty: "stock",
  onhand: "stock",
  dailysales: "dailySales",
  dailysale: "dailySales",
  salesperday: "dailySales",
  avgdailysales: "dailySales",
  velocity: "dailySales",
  sellingprice: "sellingPrice",
  price: "sellingPrice",
  retailprice: "sellingPrice",
  unitprice: "sellingPrice",
  costprice: "costPrice",
  cost: "costPrice",
  buyprice: "costPrice",
  wholesaleprice: "costPrice",
};

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_\-./]/g, "");
}

export function fileExtension(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function isAcceptedFile(file: File): boolean {
  return ACCEPTED_EXTENSIONS.includes(fileExtension(file.name));
}

export class ParseError extends Error {}

export interface ParsedWorkbook {
  fileName: string;
  headers: string[];
  rows: unknown[][]; // data rows only, aligned to `headers`
  rowNumbers: number[]; // 1-based source spreadsheet row for rows[i]
  blankRowNumbers: number[]; // data rows skipped because every cell was empty
  totalDataRows: number; // rows below the header in the file (incl. blank)
}

/** Parse a spreadsheet into its raw header row + data rows — no mapping, no validation. */
export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  if (!isAcceptedFile(file)) {
    throw new ParseError(
      `Unsupported file type “${fileExtension(file.name) || file.name}”. Upload a .csv or .xlsx file.`
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ParseError("File is larger than 5 MB. Split it into smaller files.");
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ParseError("Could not read this file. Make sure it is a valid CSV or Excel file.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ParseError("The file has no sheets.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    blankrows: false,
    defval: null,
  });
  if (matrix.length < 2) {
    throw new ParseError("The file needs a header row and at least one product row.");
  }

  const headers = (matrix[0] as unknown[]).map((c) => String(c ?? "").trim());
  const width = headers.length;
  const rows: unknown[][] = [];
  const rowNumbers: number[] = [];
  const blankRowNumbers: number[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] as unknown[];
    const srcRow = i + 1; // header is spreadsheet row 1
    if (row.every((c) => c === null || String(c).trim() === "")) {
      blankRowNumbers.push(srcRow);
      continue;
    }
    const padded = Array.from({ length: width }, (_, j) => row[j] ?? null);
    rows.push(padded);
    rowNumbers.push(srcRow);
  }
  if (rows.length === 0) throw new ParseError("No product rows found in the file.");
  return {
    fileName: file.name,
    headers,
    rows,
    rowNumbers,
    blankRowNumbers,
    totalDataRows: matrix.length - 1,
  };
}

/** Parse a File into raw rows, mapping arbitrary header names to canonical fields. */
export async function parseSpreadsheet(file: File): Promise<RawRow[]> {
  if (!isAcceptedFile(file)) {
    throw new ParseError(
      `Unsupported file type “${fileExtension(file.name) || file.name}”. Upload a .csv or .xlsx file.`
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ParseError("File is larger than 5 MB. Split it into smaller files.");
  }

  const buffer = await file.arrayBuffer();
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ParseError("Could not read this file. Make sure it is a valid CSV or Excel file.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new ParseError("The file has no sheets.");
  const sheet = workbook.Sheets[sheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    defval: null,
  });
  if (matrix.length < 2) {
    throw new ParseError("The file needs a header row and at least one product row.");
  }

  const headerRow = (matrix[0] as unknown[]).map((c) => normalizeHeader(String(c ?? "")));
  const colMap = new Map<keyof Omit<RawRow, "rowNumber">, number>();
  headerRow.forEach((h, idx) => {
    const field = HEADER_ALIASES[h];
    if (field && !colMap.has(field)) colMap.set(field, idx);
  });

  const required: (keyof Omit<RawRow, "rowNumber">)[] = [
    "name",
    "stock",
    "dailySales",
    "sellingPrice",
    "costPrice",
  ];
  const missing = required.filter((f) => !colMap.has(f));
  if (missing.length) {
    throw new ParseError(
      `Missing required column(s): ${missing.join(", ")}. Expected headers like Product, Category, Stock, DailySales, SellingPrice, CostPrice.`
    );
  }

  const cell = (row: unknown[], field: keyof Omit<RawRow, "rowNumber">) => {
    const idx = colMap.get(field);
    return idx === undefined ? null : ((row[idx] ?? null) as RawRow["stock"]);
  };

  const rows: RawRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const row = matrix[i] as unknown[];
    const allEmpty = row.every((c) => c === null || String(c).trim() === "");
    if (allEmpty) continue;
    rows.push({
      rowNumber: i + 1, // 1-indexed, header is row 1
      name: String(cell(row, "name") ?? "").trim(),
      category: String(cell(row, "category") ?? "").trim(),
      stock: cell(row, "stock"),
      dailySales: cell(row, "dailySales"),
      sellingPrice: cell(row, "sellingPrice"),
      costPrice: cell(row, "costPrice"),
    });
  }

  if (rows.length === 0) throw new ParseError("No product rows found in the file.");
  return rows;
}

/** Full client-side pipeline: parse + validate + build a preview. */
export async function buildParsePreview(file: File): Promise<ParsePreview> {
  const raw = await parseSpreadsheet(file);
  const validations = validateRows(raw);
  const validRows = validations.flatMap((v) => (v.data ? [v.data] : []));
  return {
    fileName: file.name,
    totalRows: raw.length,
    validRows,
    validations,
    errorCount: validations.filter((v) => v.errors.length > 0).length,
    warningCount: validations.reduce((s, v) => s + v.warnings.length, 0),
  };
}
