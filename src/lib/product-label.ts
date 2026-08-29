// Inventra AI — how every module names a product to the user / the model.
// "Buldak Carbonara · Samyang (SKU NDL-001)"

export interface Labelled {
  name: string;
  brand?: string | null;
  sku?: string | null;
}

export function productLabel(p: Labelled): string {
  const name = (p.name || "").trim();
  const brand = (p.brand || "").trim();
  const sku = (p.sku || "").trim();

  let label = name;
  if (brand && !name.toLowerCase().includes(brand.toLowerCase())) {
    label += ` · ${brand}`;
  }
  if (sku) label += ` (SKU ${sku})`;
  return label;
}

/** Shorter form for tight UI: name + SKU only. */
export function shortLabel(p: Labelled): string {
  const name = (p.name || "").trim();
  const sku = (p.sku || "").trim();
  return sku ? `${name} (SKU ${sku})` : name;
}
