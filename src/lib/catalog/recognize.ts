// Inventra AI — hybrid product recognition.
// 1) local knowledge base  2) rules engine  3) batched DeepSeek fallback (low-confidence only).

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

/* --------------------------- knowledge base --------------------------- */

interface KbMatch {
  name: string;
  brand: string;
  category: Category;
  confidence: number;
}

function matchKb(rawName: string): KbMatch | null {
  const n = norm(rawName);
  if (!n) return null;

  // exact name / alias
  for (const p of KB_PRODUCTS) {
    if (norm(p.name) === n || p.aliases?.some((a) => norm(a) === n)) {
      return { name: p.name, brand: p.brand, category: p.category, confidence: 0.97 };
    }
  }
  // alias contained in the raw string (or vice-versa)
  for (const p of KB_PRODUCTS) {
    const cands = [p.name, ...(p.aliases ?? [])].map(norm);
    if (cands.some((c) => c.length >= 5 && (n.includes(c) || c.includes(n)))) {
      return { name: p.name, brand: p.brand, category: p.category, confidence: 0.9 };
    }
  }
  // token overlap — needs 2+ distinct shared tokens (or one long, distinctive one)
  const nt = new Set(tokens(rawName));
  if (nt.size > 0) {
    let best: { p: (typeof KB_PRODUCTS)[number]; score: number; shared: number } | null = null;
    for (const p of KB_PRODUCTS) {
      const pt = new Set(tokens(`${p.name} ${p.brand}`));
      if (pt.size === 0) continue;
      const sharedTokens = [...pt].filter((t) => nt.has(t));
      const strong = sharedTokens.length >= 2 || sharedTokens.some((t) => t.length >= 6);
      if (!strong) continue;
      const score = sharedTokens.length / Math.max(pt.size, nt.size);
      if (score >= 0.5 && (!best || score > best.score)) {
        best = { p, score, shared: sharedTokens.length };
      }
    }
    if (best) {
      return {
        name: best.p.name,
        brand: best.p.brand,
        category: best.p.category,
        confidence: 0.78 + Math.min(0.14, (best.score - 0.5) * 0.3),
      };
    }
  }
  return null;
}

/* ------------------------------- rules -------------------------------- */

/** Returns a recognised brand only when it's a known brand; "" otherwise (no guessing). */
function extractBrand(rawName: string): string {
  const n = ` ${norm(rawName)} `;
  for (const b of KNOWN_BRANDS) {
    if (n.includes(` ${norm(b)} `) || n.includes(`${norm(b)} `) || n.startsWith(` ${norm(b)}`)) {
      return b;
    }
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
  const code = (rawCode ?? "").trim() || null;
  const base = {
    rawName,
    productCode: code,
    barcode: isBarcode(code) ? code : null,
  };

  const kb = matchKb(rawName);
  if (kb) {
    return {
      ...base,
      name: kb.name,
      brand: kb.brand,
      category: kb.category,
      confidence: kb.confidence,
      source: "kb",
      matchedKbName: kb.name,
    };
  }

  const brand = extractBrand(rawName); // "" unless a known brand
  const category = inferCategory(rawName);
  const name = titleCase(rawName);

  let confidence = 0.42;
  if (brand && category) confidence = 0.72;
  else if (brand) confidence = 0.6;
  else if (category) confidence = 0.55;

  return {
    ...base,
    name,
    brand,
    category: category ?? "Other",
    confidence,
    source: "rules",
  };
}

export interface RecognizeItem {
  name: string;
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
    // a brand / category explicitly present in the file always wins
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

const AI_SYSTEM = `You classify retail products for a Cambodian minimart / convenience store.
For each item you are given an index and a raw product string. Return ONLY a JSON array (no prose,
no code fences) of objects: {"index": number, "name": string, "brand": string, "category": string}.
- "name": a clean, complete product name (fix casing, expand obvious abbreviations, keep size like "330ml").
- "brand": the manufacturer/brand, or "" if genuinely unknown.
- "category": EXACTLY one of: Beverage, Water, Instant Noodles, Dairy, Snacks, Personal Care, Household, Other.`;

export async function enrichWithAI(
  items: { index: number; rawName: string }[]
): Promise<Map<number, { name: string; brand: string; category: Category }>> {
  const out = new Map<number, { name: string; brand: string; category: Category }>();
  if (!isAIConfigured() || items.length === 0) return out;

  try {
    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: AI_SYSTEM },
        {
          role: "user",
          content: items.map((it) => `${it.index}. ${it.rawName}`).join("\n"),
        },
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
        name: String(r.name ?? "").trim() || "",
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

  if (lowConfidenceIndexes.length === 0) return { results, aiUsed: false };

  const aiInput = lowConfidenceIndexes.map((i) => ({ index: i, rawName: items[i].name }));
  const aiMap = await enrichWithAI(aiInput);
  if (aiMap.size === 0) return { results, aiUsed: false };

  for (const [idx, ai] of aiMap) {
    const r = results[idx];
    if (!r) continue;
    if (ai.name) r.name = ai.name;
    if (ai.brand) r.brand = ai.brand;
    r.category = ai.category;
    r.confidence = Math.max(r.confidence, 0.75);
    r.source = "ai";
  }
  return { results, aiUsed: true };
}
