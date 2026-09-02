// Inventra AI — hybrid product recognition.
// 1) local knowledge base  2) rules engine  3) batched DeepSeek fallback (low-confidence only).
// Preserves the user's ORIGINAL name; produces a CANONICAL name for internal matching.

import { AI_MODEL, getAIClient, isAIConfigured } from "../ai";
import type {
  EvidenceConfidence,
  RecognitionEvidence,
  RecognitionMethod,
  RecognitionSource,
  RecognizedProduct,
} from "../types";
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

/* ------------------------ recognition evidence ------------------------ */

/** Confidence bands (STEP 4). Substring / token-overlap never present as "High"
 *  — those are fuzzy matches, not exact ones, regardless of the numeric score. */
export function confidenceLabel(c: number, method?: RecognitionMethod): EvidenceConfidence {
  const raw: EvidenceConfidence = c >= 0.9 ? "High" : c >= 0.7 ? "Medium" : "Low";
  if ((method === "substring" || method === "token-overlap") && raw === "High") return "Medium";
  return raw;
}

const pct = (c: number) => `${Math.round(c * 100)}%`;

/** Build the full evidence object, including the review-required decision (STEP 5). */
export function mkEvidence(e: {
  source: RecognitionSource;
  method: RecognitionMethod;
  confidence: number;
  reason: string;
  matchedAlias?: string;
  matchedCanonical?: string;
  category?: string;
  variantWarning?: string;
}): RecognitionEvidence {
  const label = confidenceLabel(e.confidence, e.method);
  let reviewReason: string | undefined;
  if (e.variantWarning) {
    reviewReason = "Possible duplicate of another line — confirm the pack size / variant before importing.";
  } else if (e.source === "ai") {
    reviewReason = "AI-generated canonical name — no exact knowledge-base match was found.";
  } else if (e.method === "unknown") {
    reviewReason = "No knowledge-base match and no brand or category could be detected.";
  } else if (e.method === "khmer-fallback") {
    reviewReason = "Khmer text with no knowledge-base match — a canonical English name could not be built.";
  } else if (label === "Low") {
    reviewReason = `Recognition confidence is Low (${pct(e.confidence)}).`;
  } else if (label !== "High") {
    reviewReason = `${e.method === "substring" ? "Partial (substring)" : "Word-overlap"} match, not an exact one — confidence ${label} (${pct(e.confidence)}).`;
  } else if (e.source === "rules" && e.method !== "brand-keyword" && (e.category ?? "Other") === "Other") {
    reviewReason = "Canonical name was generated without a knowledge-base match and the category is uncertain.";
  }
  return {
    source: e.source,
    method: e.method,
    confidence: Math.round(e.confidence * 1000) / 1000,
    confidenceLabel: label,
    reason: e.reason,
    matchedAlias: e.matchedAlias,
    matchedCanonical: e.matchedCanonical,
    reviewRequired: reviewReason !== undefined,
    reviewReason,
  };
}

/* --------------------------- knowledge base --------------------------- */

interface KbMatch {
  name: string;
  brand: string;
  category: Category;
  aliases: string[];
  confidence: number;
  method: "exact-name" | "exact-alias" | "substring" | "token-overlap";
  matchedAlias?: string;
  matchedCanonical: string;
}

function matchKb(rawName: string): KbMatch | null {
  const n = norm(rawName);
  if (!n) return null;

  for (const p of KB_PRODUCTS) {
    if (norm(p.name) === n) {
      return { name: p.name, brand: p.brand, category: p.category, aliases: [p.name, ...(p.aliases ?? [])], confidence: 0.97, method: "exact-name", matchedCanonical: p.name };
    }
    const hitAlias = p.aliases?.find((a) => norm(a) === n);
    if (hitAlias) {
      return { name: p.name, brand: p.brand, category: p.category, aliases: [p.name, ...(p.aliases ?? [])], confidence: 0.97, method: "exact-alias", matchedAlias: hitAlias, matchedCanonical: p.name };
    }
  }
  for (const p of KB_PRODUCTS) {
    const cands: [string, string][] = [p.name, ...(p.aliases ?? [])].map((c) => [c, norm(c)]);
    const hit = cands.find(([, c]) => c.length >= 5 && (n.includes(c) || c.includes(n)));
    if (hit) {
      return { name: p.name, brand: p.brand, category: p.category, aliases: [p.name, ...(p.aliases ?? [])], confidence: 0.9, method: "substring", matchedAlias: hit[0], matchedCanonical: p.name };
    }
  }
  const nt = new Set(tokens(rawName));
  if (nt.size > 0) {
    let best: { p: (typeof KB_PRODUCTS)[number]; score: number; shared: string[] } | null = null;
    for (const p of KB_PRODUCTS) {
      const pt = new Set(tokens(`${p.name} ${p.brand}`));
      if (pt.size === 0) continue;
      const sharedTokens = [...pt].filter((t) => nt.has(t));
      const strong = sharedTokens.length >= 2 || sharedTokens.some((t) => t.length >= 6);
      if (!strong) continue;
      const score = sharedTokens.length / Math.max(pt.size, nt.size);
      if (score >= 0.5 && (!best || score > best.score)) best = { p, score, shared: sharedTokens };
    }
    if (best) {
      return {
        name: best.p.name,
        brand: best.p.brand,
        category: best.p.category,
        aliases: [best.p.name, ...(best.p.aliases ?? [])],
        confidence: 0.78 + Math.min(0.14, (best.score - 0.5) * 0.3),
        method: "token-overlap",
        matchedAlias: best.shared.join(", "),
        matchedCanonical: best.p.name,
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

/* ----------------------- variant / pack-size safety ----------------------- */

const STOPWORDS = new Set([
  "the", "and", "with", "for", "new", "original", "pack", "size", "pcs", "pc", "piece", "pieces",
  "value", "family", "economy", "twin", "combo", "set", "each", "unit", "units",
]);

/** Packaging words that make two otherwise-similar rows different SKUs. */
const PACKAGING = ["can", "cans", "bottle", "bottles", "carton", "case", "box", "tray", "pouch",
  "sachet", "sachets", "tin", "jar", "bag", "bundle", "dozen", "crate", "pet", "glass", "draft"];

/** Extract a normalised pack-size token from a raw name, e.g. "1.5l", "330ml", "250g", "6x330ml". */
function extractSize(name: string): { norm: string; raw: string } | null {
  const s = String(name ?? "");
  // multipack: "6 x 330ml", "6x330ml", "24pk"
  const multi = s.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(ml|l|g|kg|cl|oz)\b/i);
  if (multi) {
    const raw = multi[0];
    return { norm: `${multi[1]}x${multi[2]}${multi[3].toLowerCase()}`.replace(/\s+/g, ""), raw };
  }
  const pk = s.match(/\b(\d+)\s*(?:pk|pack|s|'s|ct|count)\b/i);
  // a single size: "330 ml", "1.5L", "1 L", "250g", "1kg", "500 gm"
  const m = s.match(/\b(\d+(?:\.\d+)?)\s*(ml|l|litre|liter|g|gm|gr|grams?|kg|kilo|cl|mg|oz|lb)\b/i);
  if (m) {
    let val = parseFloat(m[1]);
    let unit = m[2].toLowerCase();
    if (unit === "litre" || unit === "liter" || unit === "kilo") unit = unit === "kilo" ? "kg" : "l";
    if (unit.startsWith("gr") || unit === "gm" || unit === "gram" || unit === "grams") unit = "g";
    // normalise 1500ml -> 1.5l, 1000g -> 1kg so equal sizes match
    if (unit === "ml" && val >= 1000 && val % 100 === 0) {
      val = val / 1000;
      unit = "l";
    }
    if (unit === "g" && val >= 1000 && val % 100 === 0) {
      val = val / 1000;
      unit = "kg";
    }
    return { norm: `${val}${unit}`, raw: m[0] };
  }
  if (pk) return { norm: `${pk[1]}pk`, raw: pk[0] };
  return null;
}

function packagingWord(name: string): string {
  const n = ` ${norm(name)} `;
  for (const p of PACKAGING) if (n.includes(` ${p} `)) return p.replace(/s$/, "");
  return "";
}

function distinctiveTokens(originalName: string, brand: string): Set<string> {
  const bt = new Set(tokens(brand));
  const out = new Set<string>();
  for (const t of tokens(originalName)) {
    if (bt.has(t) || STOPWORDS.has(t)) continue;
    if (/^\d/.test(t) || /(ml|l|g|kg|cl|mg|oz|lb|pk)$/.test(t)) continue; // size tokens
    if (PACKAGING.includes(t) || PACKAGING.includes(t + "s")) continue; // handled separately
    out.add(t);
  }
  return out;
}

/**
 * Would merging these two rows combine two genuinely different products?
 * Returns false (DO NOT MERGE) when they carry different barcodes, different
 * real SKUs, different pack sizes, different packaging, or each name carries a
 * distinguishing word the other lacks (variant / flavour).
 */
function sameProduct(a: MergeCandidate, b: MergeCandidate): boolean {
  const ba = (a.barcode ?? "").trim();
  const bb = (b.barcode ?? "").trim();
  if (ba && bb && ba !== bb) return false;

  const skuRe = /^[A-Za-z]{2,4}-?\d{2,}$/;
  const sa = (a.productCode ?? "").trim();
  const sb = (b.productCode ?? "").trim();
  if (sa && sb && skuRe.test(sa) && skuRe.test(sb) && sa.toUpperCase() !== sb.toUpperCase()) return false;

  const zA = extractSize(a.originalName);
  const zB = extractSize(b.originalName);
  if (zA && zB && zA.norm !== zB.norm) return false;

  const pA = packagingWord(a.originalName);
  const pB = packagingWord(b.originalName);
  if (pA && pB && pA !== pB) return false;
  if ((pA || pB) && pA !== pB) return false; // one says "Can", the other doesn't

  const dA = distinctiveTokens(a.originalName, a.brand);
  const dB = distinctiveTokens(b.originalName, b.brand);
  const aOnly = [...dA].filter((t) => !dB.has(t));
  const bOnly = [...dB].filter((t) => !dA.has(t));
  if (aOnly.length > 0 && bOnly.length > 0) return false; // each names a different variant

  return true;
}

/** Fix a KB/AI canonical whose pack size or packaging doesn't match this row. */
function reconcileCanonical(canonical: string, originalName: string): string {
  let out = String(canonical || originalName).trim();
  const inSize = extractSize(originalName);
  const canSize = extractSize(out);
  if (inSize && canSize && inSize.norm !== canSize.norm) {
    out = out.replace(canSize.raw, inSize.raw).replace(/\s+/g, " ").trim();
  } else if (inSize && !canSize) {
    out = `${out} ${inSize.raw.replace(/\s+/g, "")}`;
  }
  const inPack = packagingWord(originalName);
  if (inPack && packagingWord(out) !== inPack) {
    out = `${out} ${inPack[0].toUpperCase()}${inPack.slice(1)}`;
  }
  return out.replace(/\s+/g, " ").trim();
}

interface MergeCandidate {
  originalName: string;
  brand: string;
  barcode?: string | null;
  productCode?: string | null;
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
    const reason =
      kb.method === "exact-name"
        ? `Exact match to the knowledge-base product “${kb.matchedCanonical}”.`
        : kb.method === "exact-alias"
        ? `Matched the known alias “${kb.matchedAlias}” for “${kb.matchedCanonical}”.`
        : kb.method === "substring"
        ? `“${kb.matchedAlias}” appears inside your product name — matched to “${kb.matchedCanonical}”.`
        : `Shares the words “${kb.matchedAlias}” with the knowledge-base product “${kb.matchedCanonical}”.`;
    return {
      ...base,
      canonicalName: kb.name,
      brand: kb.brand,
      category: kb.category,
      aliases: uniqAliases([originalName, ...kb.aliases]),
      confidence: kb.confidence,
      source: "kb",
      evidence: mkEvidence({
        source: "kb",
        method: kb.method,
        confidence: kb.confidence,
        reason,
        matchedAlias: kb.matchedAlias,
        matchedCanonical: kb.matchedCanonical,
        category: kb.category,
      }),
    };
  }

  const brand = extractBrand(originalName);
  const category = inferCategory(originalName);
  const isKhmer = KHMER.test(originalName);
  // Latin script → we can produce a tidy canonical; Khmer with no KB hit → leave to AI / fallback
  const canonicalName = isKhmer ? "" : titleCase(originalName);

  let confidence = 0.42;
  if (brand && category) confidence = 0.72;
  else if (brand) confidence = 0.6;
  else if (category) confidence = 0.55;

  const method: RecognitionMethod = isKhmer
    ? "khmer-fallback"
    : brand
    ? "brand-keyword"
    : category
    ? "category-keyword"
    : "unknown";
  const reason = isKhmer
    ? "Khmer text with no knowledge-base match. Kept your original name; the AI or your review supplies an English canonical name."
    : brand && category
    ? `No knowledge-base match. Recognised the brand “${brand}” and inferred the category “${category}” from keywords; the canonical name is your name, tidied.`
    : brand
    ? `No knowledge-base match. Recognised the brand “${brand}”; the canonical name is your name, tidied.`
    : category
    ? `No knowledge-base match. Inferred the category “${category}” from a keyword; the canonical name is your name, tidied.`
    : "No knowledge-base match and no brand or category keyword found. The canonical name is just your name, tidied for display.";

  return {
    ...base,
    canonicalName,
    brand,
    category: category ?? "Other",
    aliases: uniqAliases([originalName, canonicalName]),
    confidence,
    source: "rules",
    evidence: mkEvidence({
      source: "rules",
      method,
      confidence,
      reason,
      category: category ?? "Other",
    }),
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
    const fileBrand = it.brand?.trim();
    const fileCat = it.category?.trim();
    if (fileBrand || fileCat) {
      if (fileBrand) r.brand = fileBrand;
      if (fileCat) r.category = normalizeCategory(fileCat);
      // The file itself supplied brand/category — stronger evidence than a rules guess,
      // but not a KB identity. Keep a KB match's method; only lift a rules result.
      if (r.source !== "kb") {
        r.confidence = Math.max(r.confidence, 0.85);
        r.source = "rules";
        r.evidence = mkEvidence({
          source: "rules",
          method: "provided-fields",
          confidence: r.confidence,
          reason: `Your file supplied the ${[fileBrand && "brand", fileCat && "category"].filter(Boolean).join(" and ")}. The canonical name is your product name, tidied.`,
          category: r.category,
        });
      } else {
        r.confidence = Math.max(r.confidence, 0.85);
      }
    }
    if (isBarcode(it.productCode)) {
      r.evidence = {
        ...(r.evidence ?? mkEvidence({ source: r.source, method: "provided-code", confidence: r.confidence, reason: "" })),
        reason: `${r.evidence?.reason ?? ""} Your file also carried a barcode (${it.productCode!.trim()}).`.trim(),
      };
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
      r.evidence = mkEvidence({
        source: "ai",
        method: "ai-suggestion",
        confidence: r.confidence,
        reason: `No knowledge-base match, so Inventra's AI proposed the canonical name${ai.canonicalName ? ` “${ai.canonicalName}”` : ""}${ai.brand ? `, brand “${ai.brand}”` : ""} and category “${ai.category}”. Please confirm it is correct.`,
        category: r.category,
      });
    }
    return { results: finalizeNames(results), aiUsed: aiMap.size > 0 };
  }

  return { results: finalizeNames(results), aiUsed: false };
}

/** Guarantee canonicalName is populated, and that it reflects THIS row's pack
 *  size / packaging (a KB or AI match to a differently-sized entry is corrected
 *  here so different pack sizes never collapse to one canonical). */
function finalizeNames(list: RecognizedProduct[]): RecognizedProduct[] {
  return list.map((r) => {
    const before = r.canonicalName || r.originalName;
    const canonical = reconcileCanonical(before, r.originalName);
    const adjusted = norm(canonical) !== norm(before);
    const evidence =
      adjusted && r.evidence
        ? {
            ...r.evidence,
            reason: `${r.evidence.reason} Canonical adjusted from “${before}” to “${canonical}” to match this row's pack size / packaging.`,
          }
        : r.evidence ??
          mkEvidence({
            source: r.source,
            method: r.source === "ai" ? "ai-suggestion" : "titlecase",
            confidence: r.confidence,
            reason: "Canonical name is your product name, tidied for display.",
            category: r.category,
          });
    return {
      ...r,
      canonicalName: canonical,
      aliases: uniqAliases([r.originalName, canonical, ...r.aliases]),
      evidence,
    };
  });
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
  barcode?: string | null;
  productCode?: string | null;
  sourceRows?: number[];
  variantWarning?: string;
  evidence?: RecognitionEvidence;
}

/**
 * Collapse rows that resolve to the same product. A row only joins a group when
 * the name/alias match says "same product" AND `sameProduct()` confirms there is
 * no pack-size, packaging, barcode or variant difference. When the recogniser
 * matched two rows to one canonical but they are NOT the same product, they stay
 * separate, the canonical is disambiguated, and the row is flagged for review.
 */
export function mergeDuplicates<T extends Mergeable>(rows: T[]): T[] {
  const groups: T[][] = [];
  const keyOf = (r: T) => norm(r.canonicalName || r.originalName);
  const grp2Same = (grp: T[], row: T) => grp.every((m) => sameProduct(m, row));

  for (const row of rows) {
    const k = keyOf(row);
    const aliasKeys = new Set(row.aliases.map(norm));
    const nameMatches = (head: T) => {
      if (keyOf(head) === k && k) return true;
      if (aliasKeys.has(norm(head.originalName)) || aliasKeys.has(norm(head.canonicalName))) return true;
      if (head.aliases.some((a) => norm(a) === norm(row.originalName))) return true;
      return false;
    };
    const candidate = groups.find((grp) => nameMatches(grp[0]));
    const g =
      candidate && grp2Same(candidate, row) ? candidate : undefined;

    if (g) {
      g.push(row);
    } else if (candidate) {
      // recogniser said "same", size/variant says "different" → keep apart + flag.
      const other = candidate[0];
      let canonicalName = row.canonicalName;
      if (norm(canonicalName) === norm(other.canonicalName)) {
        const z = extractSize(row.originalName);
        const p = packagingWord(row.originalName);
        const suffix = z ? z.raw.replace(/\s+/g, "") : p ? `${p[0].toUpperCase()}${p.slice(1)}` : "variant";
        canonicalName = `${canonicalName} ${suffix}`.replace(/\s+/g, " ").trim();
      }
      const variantWarning = `Possible duplicate of “${other.canonicalName}” — kept separate because of a pack-size / variant / packaging difference. Merge manually only if they are the same product.`;
      groups.push([
        {
          ...row,
          canonicalName,
          confidence: Math.min(row.confidence, 0.55),
          variantWarning,
          evidence: row.evidence
            ? mkEvidence({
                source: row.evidence.source,
                method: row.evidence.method,
                confidence: Math.min(row.confidence, 0.55),
                reason: `${row.evidence.reason} It resolved to the same canonical as another uploaded row, but a pack-size / packaging / variant difference kept them separate.`,
                matchedAlias: row.evidence.matchedAlias,
                matchedCanonical: row.evidence.matchedCanonical,
                category: row.category,
                variantWarning,
              })
            : row.evidence,
        },
      ]);
    } else {
      groups.push([row]);
    }
  }

  return groups.map((grp) => {
    if (grp.length === 1) {
      return grp[0].sourceRows ? grp[0] : ({ ...grp[0], sourceRows: [] } as T);
    }
    const first = grp[0];
    const sourceRows = grp.flatMap((r) => r.sourceRows ?? []);
    const stock = grp.reduce((s, r) => s + r.stock, 0);
    const dailySales = grp.reduce((s, r) => s + r.dailySales, 0);
    const wsum = grp.reduce((s, r) => s + Math.max(r.stock, 1), 0);
    const sellingPrice =
      Math.round((grp.reduce((s, r) => s + r.sellingPrice * Math.max(r.stock, 1), 0) / wsum) * 100) / 100;
    const costPrice =
      Math.round((grp.reduce((s, r) => s + r.costPrice * Math.max(r.stock, 1), 0) / wsum) * 100) / 100;
    const best = grp.reduce((a, b) => (b.confidence > a.confidence ? b : a));
    const be = best.evidence;
    const mergedEvidence: RecognitionEvidence | undefined = be
      ? mkEvidence({
          source: be.source,
          method: "merge",
          confidence: best.confidence,
          reason: `Combined ${grp.length} uploaded rows for the same product (${grp
            .map((r) => `“${r.originalName}”`)
            .join(", ")}). The strongest of those was recognised by: ${be.reason}`,
          matchedAlias: be.matchedAlias,
          matchedCanonical: be.matchedCanonical,
          category: best.category,
        })
      : undefined;
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
      sourceRows,
      evidence: mergedEvidence,
    } as T;
  });
}
