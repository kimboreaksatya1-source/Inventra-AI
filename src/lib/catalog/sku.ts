// Inventra AI — auto SKU assignment. Category-prefixed sequential: BEV-001, NDL-001…
// Honours a usable SKU already present in the source file.

import { CATEGORY_CODES, type Category } from "./knowledge-base";

const VALID_CATEGORY = new Set(Object.keys(CATEGORY_CODES));

function codeFor(category: string): string {
  return VALID_CATEGORY.has(category) ? CATEGORY_CODES[category as Category] : CATEGORY_CODES.Other;
}

export interface SkuAssignable {
  category: string;
  productCode: string | null;
}

/** Returns the SKU for each input, in order. Mutates nothing. */
export function assignSkus<T extends SkuAssignable>(items: T[]): string[] {
  const seq: Record<string, number> = {};
  const taken = new Set<string>();

  // reserve well-formed codes that came from the file
  for (const it of items) {
    const c = (it.productCode ?? "").trim().toUpperCase();
    if (/^[A-Z]{2,4}-?\d{2,}$/.test(c)) taken.add(c);
  }

  return items.map((it) => {
    const existing = (it.productCode ?? "").trim().toUpperCase();
    if (/^[A-Z]{2,4}-?\d{2,}$/.test(existing)) return existing;

    const prefix = codeFor(it.category);
    let n = (seq[prefix] ?? 0) + 1;
    let sku = `${prefix}-${String(n).padStart(3, "0")}`;
    while (taken.has(sku)) {
      n += 1;
      sku = `${prefix}-${String(n).padStart(3, "0")}`;
    }
    seq[prefix] = n;
    taken.add(sku);
    return sku;
  });
}
