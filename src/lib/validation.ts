// Inventra AI — import validation
// Turns raw parsed spreadsheet rows into validated, import-ready product rows.

import { z } from "zod";
import type { ImportRow, RawRow, RowValidation } from "./types";

/** Parse a spreadsheet cell that should hold a number. Returns null when unusable. */
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Validate one raw row. Never throws — returns a structured result. */
export function validateRow(raw: RawRow): RowValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  const name = String(raw.name ?? "").trim();
  const category = String(raw.category ?? "").trim();
  const stock = toNumber(raw.stock);
  const dailySales = toNumber(raw.dailySales);
  const sellingPrice = toNumber(raw.sellingPrice);
  const costPrice = toNumber(raw.costPrice);

  if (!name) errors.push("Product name is required");
  if (!category) warnings.push("Category is empty — defaulting to “Uncategorized”");

  if (stock === null) errors.push("Stock must be a number");
  else if (stock < 0) errors.push("Stock cannot be negative");
  else if (!Number.isInteger(stock)) warnings.push("Stock is not a whole number — rounding");

  if (dailySales === null) errors.push("DailySales must be a number");
  else if (dailySales < 0) errors.push("DailySales cannot be negative");

  if (sellingPrice === null) errors.push("SellingPrice must be a number");
  else if (sellingPrice <= 0) errors.push("SellingPrice must be greater than 0");

  if (costPrice === null) errors.push("CostPrice must be a number");
  else if (costPrice < 0) errors.push("CostPrice cannot be negative");

  if (
    sellingPrice !== null &&
    costPrice !== null &&
    costPrice > sellingPrice
  ) {
    warnings.push("Cost price is higher than selling price — negative margin");
  }

  const data: ImportRow | null =
    errors.length === 0
      ? {
          name,
          category: category || "Uncategorized",
          stock: Math.round(stock as number),
          dailySales: dailySales as number,
          sellingPrice: sellingPrice as number,
          costPrice: costPrice as number,
        }
      : null;

  return { rowNumber: raw.rowNumber, raw, data, errors, warnings };
}

export function validateRows(rows: RawRow[]): RowValidation[] {
  return rows.map(validateRow);
}

/** Zod schema for the POST /api/import payload (defensive server-side check). */
export const importRowSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(120),
  stock: z.number().int().min(0),
  dailySales: z.number().min(0),
  sellingPrice: z.number().positive(),
  costPrice: z.number().min(0),
});

export const importPayloadSchema = z.object({
  fileName: z.string().min(1).max(260),
  rows: z.array(importRowSchema).min(1).max(5000),
});

export type ImportPayload = z.infer<typeof importPayloadSchema>;
