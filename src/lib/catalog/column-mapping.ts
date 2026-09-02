// Inventra AI — smart column mapping.
// Detects which spreadsheet column feeds each internal field, from a wide alias
// set (English + Khmer). Pure rules — instant, no AI.

import type {
  ColumnDetection,
  ColumnMapping,
  ImportAuditRow,
  InternalField,
} from "../types";

export const INTERNAL_FIELDS: InternalField[] = [
  "productCode",
  "productName",
  "brand",
  "category",
  "stock",
  "dailySales",
  "sellingPrice",
  "costPrice",
];

export const REQUIRED_FIELDS: InternalField[] = ["productName", "stock", "sellingPrice"];

export const FIELD_LABELS: Record<InternalField, string> = {
  productCode: "Product Code",
  productName: "Product Name",
  brand: "Brand",
  category: "Category",
  stock: "Stock",
  dailySales: "Daily Sales",
  sellingPrice: "Selling Price",
  costPrice: "Cost Price",
};

/** Aliases, already normalised (lower-case, punctuation/space stripped). */
const FIELD_ALIASES: Record<InternalField, string[]> = {
  productCode: [
    "productcode", "sku", "productid", "id", "itemcode", "code", "barcode",
    "articlecode", "artnr", "itemno", "itemnumber", "ref", "reference",
    "លេខកូដ", "កូដ", "លេខសម្គាល់",
  ],
  productName: [
    "productname", "name", "description", "itemname", "product", "item",
    "particulars", "details", "goods", "descr", "productdescription",
    "ឈ្មោះទំនិញ", "ឈ្មោះ", "ទំនិញ", "ផលិតផល", "បរិយាយ",
  ],
  brand: ["brand", "make", "manufacturer", "company", "supplier", "ម៉ាក", "ក្រុមហ៊ុន"],
  category: [
    "category", "type", "group", "class", "department", "dept", "productgroup",
    "categories", "ប្រភេទ", "ក្រុម",
  ],
  stock: [
    "stock", "qty", "quantity", "balance", "onhand", "inventory", "stockonhand",
    "stocklevel", "stockqty", "currentstock", "availableqty", "instock", "count",
    "ស្តុក", "បរិមាណ", "ចំនួន", "នៅសល់",
  ],
  dailySales: [
    "dailysales", "salesperday", "avgdailysales", "ads", "dailysale", "perday",
    "unitsperday", "dailydemand", "avgsales", "velocity", "dailyunits",
    "លក់ក្នុងមួយថ្ងៃ", "លក់ប្រចាំថ្ងៃ",
  ],
  sellingPrice: [
    "sellingprice", "saleprice", "retailprice", "price", "unitprice", "rrp",
    "sellprice", "sp", "listprice", "priceout", "outprice",
    "តម្លៃលក់", "តម្លៃ", "តម្លៃរាយ",
  ],
  costPrice: [
    "costprice", "cost", "purchaseprice", "buyprice", "wholesaleprice", "cp",
    "buyingprice", "unitcost", "landedcost", "pricein", "inprice",
    "តម្លៃដើម", "តម្លៃទិញ", "ថ្លៃដើម",
  ],
};

export function normalizeHeader(h: string): string {
  return String(h ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-./\\()[\]#:]+/g, "");
}

/** Map arbitrary headers onto the internal schema. */
export function detectColumnMapping(headers: string[]): ColumnDetection {
  const norm = headers.map(normalizeHeader);
  const mapping = Object.fromEntries(INTERNAL_FIELDS.map((f) => [f, null])) as ColumnMapping;
  const usedColumns = new Set<number>();

  // pass 1 — exact alias match
  for (const field of INTERNAL_FIELDS) {
    const aliases = FIELD_ALIASES[field];
    const idx = norm.findIndex((h, i) => !usedColumns.has(i) && h !== "" && aliases.includes(h));
    if (idx !== -1) {
      mapping[field] = idx;
      usedColumns.add(idx);
    }
  }

  // pass 2 — fuzzy "contains" match for still-empty fields
  for (const field of INTERNAL_FIELDS) {
    if (mapping[field] !== null) continue;
    const aliases = FIELD_ALIASES[field];
    const idx = norm.findIndex(
      (h, i) =>
        !usedColumns.has(i) &&
        h.length >= 3 &&
        aliases.some((a) => a.length >= 3 && (h.includes(a) || a.includes(h)))
    );
    if (idx !== -1) {
      mapping[field] = idx;
      usedColumns.add(idx);
    }
  }

  const mappedCount = INTERNAL_FIELDS.filter((f) => mapping[f] !== null).length;
  const unmapped = headers.filter((_, i) => !usedColumns.has(i) && headers[i]?.trim());

  return {
    mapping,
    confidence: mappedCount / INTERNAL_FIELDS.length,
    unmapped,
  };
}

export function isMappingComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_FIELDS.every((f) => mapping[f] !== null);
}

/** Apply a mapping to a matrix of raw rows → the shape /api/catalog/recognize wants. */
export interface MappedRow {
  sourceRow: number; // 1-based spreadsheet row this came from
  name: string;
  productCode: string | null;
  brand: string | null;
  category: string | null;
  stock: number;
  dailySales: number | null;
  sellingPrice: number;
  costPrice: number | null;
}

export const MAX_IMPORT_ROWS = 3000;

/** Hard ceilings — a single SKU realistically never exceeds these. Values above
 *  the cap are clamped (never overflow the DB) and flagged. Values above the
 *  "sane" band are kept but flagged as "double-check". */
export const FIELD_LIMITS = {
  stockCap: 100_000_000,
  stockSane: 1_000_000,
  salesCap: 1_000_000,
  salesSane: 10_000,
  priceCap: 10_000_000,
  priceSane: 100_000,
} as const;

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown, maxLen = 300): string {
  return String(v ?? "").trim().slice(0, maxLen);
}

export interface ApplyMappingResult {
  rows: MappedRow[];
  audit: ImportAuditRow[]; // one entry per source row that was NOT imported cleanly
}

/**
 * Turn mapped spreadsheet rows into import-ready rows AND account for every one.
 * Only genuinely invalid rows are skipped; missing sales/cost are kept with a
 * warning; nothing is dropped without an audit entry.
 */
export function applyMapping(
  rows: unknown[][],
  mapping: ColumnMapping,
  rowNumbers?: number[],
  blankRowNumbers?: number[]
): ApplyMappingResult {
  const get = (row: unknown[], field: InternalField) => {
    const i = mapping[field];
    return i === null || i === undefined ? undefined : row[i];
  };
  const out: MappedRow[] = [];
  const audit: ImportAuditRow[] = [];

  for (const r of blankRowNumbers ?? []) {
    audit.push({ row: r, name: "", status: "skipped", reason: "empty-row", detail: "Empty row — no data." });
  }

  rows.forEach((row, idx) => {
    const srcRow = rowNumbers?.[idx] ?? idx + 2; // +2: header is row 1, data starts at 2
    let name = str(get(row, "productName"));
    const warnings: ImportAuditRow[] = [];

    if (!name) {
      audit.push({ row: srcRow, name: "", status: "skipped", reason: "missing-name", detail: "No product name." });
      return;
    }
    if (name.length > 200) {
      name = name.slice(0, 200);
      warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-name", detail: "Product name over 200 characters — truncated." });
    }

    const rawStock = num(get(row, "stock"));
    if (rawStock === null) {
      audit.push({ row: srcRow, name, status: "skipped", reason: "invalid-stock", detail: "Stock is missing or not a number." });
      return;
    }
    let stock = Math.round(rawStock);
    if (stock < 0) {
      warnings.push({ row: srcRow, name, status: "warning", reason: "negative-stock", detail: `Negative stock (${rawStock}) — treated as 0.` });
      stock = 0;
    } else if (stock > FIELD_LIMITS.stockCap) {
      warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-stock", detail: `Stock ${rawStock.toLocaleString()} exceeds the ${FIELD_LIMITS.stockCap.toLocaleString()} limit — capped.` });
      stock = FIELD_LIMITS.stockCap;
    } else if (stock > FIELD_LIMITS.stockSane) {
      warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-stock", detail: `Stock ${stock.toLocaleString()} is unusually large — imported as-is, please double-check.` });
    }

    const sellingPrice = num(get(row, "sellingPrice"));
    if (sellingPrice === null) {
      audit.push({ row: srcRow, name, status: "skipped", reason: "invalid-price", detail: "Selling price is missing or not a number." });
      return;
    }
    if (sellingPrice <= 0) {
      audit.push({ row: srcRow, name, status: "skipped", reason: "invalid-price", detail: `Selling price must be greater than 0 (got ${sellingPrice}).` });
      return;
    }
    if (sellingPrice > FIELD_LIMITS.priceCap) {
      audit.push({ row: srcRow, name, status: "skipped", reason: "invalid-price", detail: `Selling price ${sellingPrice.toLocaleString()} is implausibly large — check the row.` });
      return;
    }
    if (sellingPrice > FIELD_LIMITS.priceSane) {
      warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-price", detail: `Selling price ${sellingPrice.toLocaleString()} is unusually large — imported as-is, please double-check.` });
    }

    let dailySales = num(get(row, "dailySales"));
    if (mapping.dailySales !== null) {
      if (dailySales === null) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "missing-sales", detail: "No daily-sales value — imported, sales-based features limited." });
      } else if (dailySales < 0) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-sales", detail: `Negative daily sales (${dailySales}) — treated as 0.` });
        dailySales = 0;
      } else if (dailySales > FIELD_LIMITS.salesCap) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-sales", detail: `Daily sales ${dailySales.toLocaleString()} exceeds the limit — capped.` });
        dailySales = FIELD_LIMITS.salesCap;
      } else if (dailySales > FIELD_LIMITS.salesSane) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-sales", detail: `Daily sales ${dailySales.toLocaleString()} is unusually large — imported as-is, please double-check.` });
      }
    }

    let costPrice = num(get(row, "costPrice"));
    if (mapping.costPrice !== null) {
      if (costPrice === null) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "missing-cost", detail: "No cost price — value/margin/purchase-cost shown as n/a." });
      } else if (costPrice < 0) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-cost", detail: `Negative cost price (${costPrice}) — treated as missing.` });
        costPrice = null;
      } else if (costPrice > FIELD_LIMITS.priceCap) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-cost", detail: `Cost price ${costPrice.toLocaleString()} is implausibly large — treated as missing.` });
        costPrice = null;
      } else if (costPrice > sellingPrice) {
        warnings.push({ row: srcRow, name, status: "warning", reason: "invalid-cost", detail: `Cost price (${costPrice}) is above the selling price (${sellingPrice}) — negative margin. Imported as-is; check the figures.` });
      }
    }

    audit.push(...warnings);
    out.push({
      sourceRow: srcRow,
      name,
      productCode: str(get(row, "productCode"), 64) || null,
      brand: str(get(row, "brand"), 60) || null,
      category: str(get(row, "category"), 60) || null,
      stock,
      dailySales,
      sellingPrice,
      costPrice,
    });
  });

  // Hard row cap — surface the overflow instead of failing the whole import.
  if (out.length > MAX_IMPORT_ROWS) {
    for (const dropped of out.slice(MAX_IMPORT_ROWS)) {
      audit.push({
        row: dropped.sourceRow,
        name: dropped.name,
        status: "skipped",
        reason: "row-limit",
        detail: `Over the ${MAX_IMPORT_ROWS.toLocaleString()}-row limit for a single import.`,
      });
    }
    out.length = MAX_IMPORT_ROWS;
  }

  return { rows: out, audit };
}
