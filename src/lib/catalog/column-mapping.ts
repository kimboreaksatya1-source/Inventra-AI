// Inventra AI — smart column mapping.
// Detects which spreadsheet column feeds each internal field, from a wide alias
// set (English + Khmer). Pure rules — instant, no AI.

import type { ColumnDetection, ColumnMapping, InternalField } from "../types";

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
  name: string;
  productCode: string | null;
  brand: string | null;
  category: string | null;
  stock: number;
  dailySales: number | null;
  sellingPrice: number;
  costPrice: number | null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).trim().replace(/[$,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string {
  return String(v ?? "").trim();
}

export function applyMapping(rows: unknown[][], mapping: ColumnMapping): MappedRow[] {
  const get = (row: unknown[], field: InternalField) => {
    const i = mapping[field];
    return i === null || i === undefined ? undefined : row[i];
  };
  const out: MappedRow[] = [];
  for (const row of rows) {
    const name = str(get(row, "productName"));
    if (!name) continue;
    const stock = num(get(row, "stock"));
    const sellingPrice = num(get(row, "sellingPrice"));
    if (stock === null || sellingPrice === null) continue;
    out.push({
      name,
      productCode: str(get(row, "productCode")) || null,
      brand: str(get(row, "brand")) || null,
      category: str(get(row, "category")) || null,
      stock: Math.max(0, Math.round(stock)),
      dailySales: num(get(row, "dailySales")),
      sellingPrice,
      costPrice: num(get(row, "costPrice")),
    });
  }
  return out;
}
