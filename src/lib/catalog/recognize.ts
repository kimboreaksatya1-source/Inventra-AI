// Inventra AI — hybrid product recognition.
// 1) local knowledge base  2) rules engine  3) batched DeepSeek fallback (low-confidence only).
// Preserves the user's ORIGINAL name; produces a CANONICAL name for internal matching.

import { AI_MODEL, getAIClient, isAIConfigured } from "../ai";
import type { RecognizedProduct } from "../types";
import {
  CATEGORIES,
  CATEGORY_KEYWORDS,
  KB_PRODUCTS,
  KNOWN_BRANDS,
  type Category,
} from "./knowledge-base";

const AI_THRESHOLD = 0.7;
const KHMER = /[ក-៿]/;

function norm(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9ក-៿\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(s: string): string[] {
  return norm(s).split(" ").filter((t) => t.length > 1);
}

function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function uniqAliases(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = String(raw ?? "").trim();
    if (!v) continue;
    const key = norm(v);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

/* --------------------------- knowledge base --------------------------- */

interface KbMatch {
  name: string;
  brand: string;
  category: Category;
  aliases: string[];
  confidence: number;
}

function matchKb(rawName: string): KbMatch | null {
  const n = norm(rawName);
  if (!n) return null;

  for (const p of KB_PRODUCTS) {
    if (norm(p.name) === n || p.aliases?.some((a) => norm(a) === n)) {
      return { name: p.name, brand: p.brand, category: p.category, aliases: [p.name, ...(p.aliases ?? [])], confidence: 0.97 };
    }
  }
  for (const p of KB_PRODUCTS) {
    const cands = [p.name, ...(p.aliases ?? [])].map(norm);
    if (cands.some((c) => c.length >= 5 && (n.includes(c) || c.includes(n)))) {
      return { name: p.name, brand: p.brand, category: p.category, aliases: [p.name, ...(p.aliases ?? [])], confidence: 0.9 };
    }
  }
  const nt = new Set(tokens(rawName));
  if (nt.size > 0) {
    let best: { p: (typeof KB_PRODUCTS)[number]; score: number } | null = null;
    for (const p of KB_PRODUCTS) {
      const pt = new Set(tokens(`${p.name} ${p.brand}`));
      if (pt.size === 0) continue;
      const sharedTokens = [...pt].filter((t) => nt.has(t));
      const strong = sharedTokens.length >= 2 || sharedTokens.some((t) => t.length >= 6);
      if (!strong) continue;
      const score = sharedTokens.length / Math.max(pt.size, nt.size);
      if (score >= 0.5 && (!best || score > best.score)) best = { p, score };
    }
    if (best) {
      return {
        name: best.p.name,
        brand: best.p.brand,
        category: best.p.category,
        aliases: [best.p.name, ...(best.p.aliases ?? [])],
        confidence: 0.78 + Math.min(0.14, (best.score - 0.5) * 0.3),
      };
    }
  }
  return null;
}

/* ------------------------------- rules -------------------------------- */

function extractBrand(rawName: string): string {
  const n = ` ${norm(rawName)} `;
  for (const b of KNOWN_BRANDS) {
    if (n.includes(` ${norm(b)} `) || n.includes(`${norm(b)} `) || n.startsWith(` ${norm(b)}`)) return b;
  }
  return "";
}

function inferCategory(rawName: string): Category | null {
  const n = ` ${norm(rawName)} `;
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => n.includes(norm(k)))) return cat;
  }
  return null;
}

function isBarcode(code: string | null | undefined): boolean {
  return !!code && /^\d{8,14}$/.test(code.trim());
}

/* ---------------------------- local pass ------------------------------ */

export function recognizeLocally(rawName: string, rawCode?: string | null): RecognizedProduct {
  const originalName = String(rawName ?? "").trim();
  const code = (rawCode ?? "").trim() || null;
  const base = {
    originalName,
    productCode: code,
    barcode: isBarcode(code) ? code : null,
  };

  const kb = matchKb(originalName);
  if (kb) {
    return {
      ...base,
      canonicalName: kb.name,
      brand: kb.brand,
      category: kb.category,
      aliases: uniqAliases([originalName, ...kb.aliases]),
      confidence: kb.confidence,
      source: "kb",
    };
  }

  const brand = extractBrand(originalName);
  const category = inferCategory(originalName);
  // Latin script → we can produce a tidy canonical; Khmer with no KB hit → leave to AI / fallback
  const canonicalName = KHMER.test(originalName) ? "" : titleCase(originalName);

  let confidence = 0.42;
  if (brand && category) confidence = 0.72;
  else if (brand) confidence = 0.6;
  else if (category) confidence = 0.55;

  return {
    ...base,
    canonicalName,
    brand,
    category: category ?? "Other",
    aliases: uniqAliases([originalName, canonicalName]),
    confidence,
    source: "rules",
  };
}

export interface RecognizeItem {
  name: string; // raw uploaded string
  productCode?: string | null;
  brand?: string | null;
  category?: string | null;
}

export function recognizeBatchLocal(items: RecognizeItem[]): {
  results: RecognizedProduct[];
  lowConfidenceIndexes: number[];
} {
  const results = items.map((it) => {
    const r = recognizeLocally(it.name, it.productCode);
    if (it.brand && it.brand.trim()) {
      r.brand = it.brand.trim();
      r.confidence = Math.max(r.confidence, 0.85);
    }
    if (it.category && it.category.trim()) {
      r.category = normalizeCategory(it.category.trim());
      r.confidence = Math.max(r.confidence, 0.85);
    }
    return r;
  });
  const lowConfidenceIndexes = results
    .map((r, i) => (r.confidence < AI_THRESHOLD ? i : -1))
    .filter((i) => i !== -1);
  return { results, lowConfidenceIndexes };
}

function normalizeCategory(c: string): Category {
  const hit = CATEGORIES.find((cat) => norm(cat) === norm(c));
  if (hit) return hit;
  const map: Record<string, Category> = {
    beverages: "Beverage",
    drink: "Beverage",
    drinks: "Beverage",
    softdrink: "Beverage",
    noodles: "Instant Noodles",
    noodle: "Instant Noodles",
    instantnoodle: "Instant Noodles",
    snack: "Snacks",
    chips: "Snacks",
    milk: "Dairy",
    cleaning: "Household",
    home: "Household",
    hygiene: "Personal Care",
    cosmetics: "Personal Care",
  };
  return map[norm(c).replace(/\s/g, "")] ?? "Other";
}

/* ------------------------------- AI ---------------------------------- */

const AI_SYSTEM = `You classify FMCG products for a Cambodian distributor / mini-mart / grocery store.
For each item you get an index and a raw product string. The string MAY be in Khmer.
Return ONLY a JSON array (no prose, no code fences) of objects:
{"index": number, "canonicalName": string, "brand": string, "category": string}.
- "canonicalName": the standard ENGLISH product name (translate/transliterate from Khmer if needed;
  fix casing; keep size like "330ml"). e.g. "កូកាកូឡា 330ml" -> "Coca-Cola Original 330ml".
- "brand": the manufacturer/brand, or "" if genuinely unknown.
- "category": EXACTLY one of: Beverage, Water, Instant Noodles, Dairy, Snacks, Confectionery, Cooking,
  Canned & Packaged, Coffee & Tea, Personal Care, Baby Care, Household, Health, Tobacco, Other.`;

export async function enrichWithAI(
  items: { index: number; rawName: string }[]
): Promise<Map<number, { canonicalName: string; brand: string; category: Category }>> {
  const out = new Map<number, { canonicalName: string; brand: string; category: Category }>();
  if (!isAIConfigured() || items.length === 0) return out;

  try {
    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: AI_SYSTEM },
        { role: "user", content: items.map((it) => `${it.index}. ${it.rawName}`).join("\n") },
      ],
    });
    const text = completion.choices[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return out;
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as unknown[];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const idx = Number(r.index);
      if (!Number.isInteger(idx)) continue;
      out.set(idx, {
        canonicalName: String(r.canonicalName ?? r.name ?? "").trim(),
        brand: String(r.brand ?? "").trim(),
        category: normalizeCategory(String(r.category ?? "Other")),
      });
    }
  } catch (err) {
    console.error("[recognize.enrichWithAI] error", err);
  }
  return out;
}

/** Full pipeline: local pass + one batched AI call for the low-confidence tail. */
export async function recognizeProducts(items: RecognizeItem[]): Promise<{
  results: RecognizedProduct[];
  aiUsed: boolean;
}> {
  const { results, lowConfidenceIndexes } = recognizeBatchLocal(items);

  if (lowConfidenceIndexes.length > 0) {
    const aiMap = await enrichWithAI(
      lowConfidenceIndexes.map((i) => ({ index: i, rawName: items[i].name }))
    );
    for (const [idx, ai] of aiMap) {
      const r = results[idx];
      if (!r) continue;
      if (ai.canonicalName) r.canonicalName = ai.canonicalName;
      if (ai.brand) r.brand = ai.brand;
      r.category = ai.category;
      r.confidence = Math.max(r.confidence, 0.75);
      r.source = "ai";
      r.aliases = uniqAliases([...r.aliases, r.canonicalName]);
    }
    return { results: finalizeNames(results), aiUsed: aiMap.size > 0 };
  }

  return { results: finalizeNames(results), aiUsed: false };
}

/** Guarantee canonicalName is populated (falls back to the original). */
function finalizeNames(list: RecognizedProduct[]): RecognizedProduct[] {
  return list.map((r) => ({
    ...r,
    canonicalName: r.canonicalName || r.originalName,
    aliases: uniqAliases([r.originalName, r.canonicalName || r.originalName, ...r.aliases]),
  }));
}

/* --------------------------- deduplication --------------------------- */

interface Mergeable {
  originalName: string;
  canonicalName: string;
  aliases: string[];
  brand: string;
  category: string;
  confidence: number;
  source: RecognizedProduct["source"];
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
}

/**
 * Collapse rows that resolve to the same product (same canonical name, or one's
 * original name appearing in another's aliases). Keeps the first original name,
 * sums stock + daily sales, stock-weights prices, unions aliases.
 */
export function mergeDuplicates<T extends Mergeable>(rows: T[]): T[] {
  const groups: T[][] = [];
  const keyOf = (r: T) => norm(r.canonicalName || r.originalName);

  for (const row of rows) {
    const k = keyOf(row);
    const aliasKeys = new Set(row.aliases.map(norm));
    const g = groups.find((grp) => {
      const head = grp[0];
      if (keyOf(head) === k && k) return true;
      // alias cross-match
      if (aliasKeys.has(norm(head.originalName)) || aliasKeys.has(norm(head.canonicalName))) return true;
      if (head.aliases.some((a) => norm(a) === norm(row.originalName))) return true;
      return false;
    });
    if (g) g.push(row);
    else groups.push([row]);
  }

  return groups.map((grp) => {
    if (grp.length === 1) return grp[0];
    const first = grp[0];
    const stock = grp.reduce((s, r) => s + r.stock, 0);
    const dailySales = grp.reduce((s, r) => s + r.dailySales, 0);
    const wsum = grp.reduce((s, r) => s + Math.max(r.stock, 1), 0);
    const sellingPrice =
      Math.round((grp.reduce((s, r) => s + r.sellingPrice * Math.max(r.stock, 1), 0) / wsum) * 100) / 100;
    const costPrice =
      Math.round((grp.reduce((s, r) => s + r.costPrice * Math.max(r.stock, 1), 0) / wsum) * 100) / 100;
    const best = grp.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    return {
      ...first,
      canonicalName: best.canonicalName || first.canonicalName,
      brand: best.brand || first.brand,
      category: best.category || first.category,
      confidence: best.confidence,
      aliases: uniqAliases(grp.flatMap((r) => [r.originalName, r.canonicalName, ...r.aliases])),
      stock,
      dailySales,
      sellingPrice,
      costPrice,
      mergedCount: grp.length,
    } as T;
  });
}
