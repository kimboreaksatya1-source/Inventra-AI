// Inventra AI — Copilot grounding check. Pure, client-safe (no `openai`).
// After the model answers, verify it (a) used the imported data, (b) didn't
// invent figures, products, suppliers, lead times, trends or margins, and
// (c) didn't contradict the procurement plan. On any clear violation the chat
// route replaces the reply with the deterministic evidence-based one.

import type { EvidenceBlock } from "./types";

const GENERIC_ADVICE = [
  "run a promotion",
  "run promotions",
  "promotional campaign",
  "run a clearance",
  "increase shelf space",
  "more shelf space",
  "better shelf placement",
  "prime shelf",
  "bundle products",
  "loyalty program",
  "loyalty programme",
  "marketing campaign",
  "social media",
  "email campaign",
  "advertising campaign",
  "improve merchandising",
  "cross-sell",
  "upsell",
];

/** Claims Inventra has NO data to support — supplier detail, per-product lead
 *  times, trends, historical comparisons, percentage margins/growth. */
const UNSUPPORTED_CLAIMS: { re: RegExp; label: string }[] = [
  { re: /\blead[- ]?time\s*(?:of|is|:|=|around|about)?\s*(\d+)/i, label: "lead-time figure" },
  { re: /\b(\d+)[- ]?(?:day|week)s?\s+lead[- ]?time/i, label: "lead-time figure" },
  { re: /\btrend(?:ing|ed|s)?\s+(?:up|down|higher|lower|upward|downward)/i, label: "sales trend" },
  { re: /\b(?:sales|demand|revenue)\b[^.]{0,40}\b(?:rising|falling|growing|declining|increased|decreased|has grown|has fallen)\b/i, label: "sales trend" },
  { re: /\b\d+(?:\.\d+)?\s*%\s*(?:growth|increase|decrease|decline|rise|drop|higher|lower|up|down|margin|profit|markup)/i, label: "percentage growth / margin" },
  { re: /\b(?:gross|net|profit)\s+margins?\b[^.]{0,45}?\d/i, label: "profit-margin figure" },
  { re: /\bmargins?\b[^.]{0,25}?\b\d+(?:\.\d+)?\s*%/i, label: "profit-margin figure" },
  { re: /\b\d+(?:\.\d+)?\s*%\b[^.]{0,20}?\bmargin/i, label: "profit-margin figure" },
  { re: /\bsupplier\b[^.]{0,20}\b(?:is|name|named|called|takes|delivers|ships|offers|charges|located|based)\b/i, label: "supplier detail" },
  { re: /\b(?:last|previous|prior)\s+(?:week|month|quarter|year)\b/i, label: "historical comparison" },
  { re: /\b(?:year[- ]over[- ]year|month[- ]over[- ]month|week[- ]over[- ]week|yoy|mom|wow)\b/i, label: "historical comparison" },
  { re: /\bseasonal(?:ity|ly)?\b[^.]{0,30}\b(?:data|shows?|indicates?|pattern|history)\b/i, label: "seasonality claim" },
];

const CONTRA_REORDER =
  /\b(?:don'?t|do not|no need to|hold off(?:\s+on)?|wait(?:\s+before)?|avoid|skip|delay|postpone|defer|hold back on)\s+(?:to\s+)?(?:reorder|re-?order|restock|order(?:ing)?|buy(?:ing)?|purchas|stock(?:ing)? up|topping up)/i;
const CONTRA_REDUCE =
  /\b(?:reduce|cut(?: back)?|clear(?: out)?|discount|liquidate|discontinue|stop (?:stocking|selling)|offload)\b/i;
const PRO_REORDER =
  /\b(?:reorder|re-?order|restock|order more|order extra|stock up on|increase (?:the |your )?order|buy more|top up|bring in more)\b/i;

function digitsOnly(s: string): string {
  return s.replace(/[, ]/g, "");
}
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

/** Every number the model is allowed to state, as comma-free digit strings. */
function allowedNumbers(promptBlock: string, evidence: EvidenceBlock[]): Set<string> {
  const src = [
    promptBlock,
    ...evidence.flatMap((b) => [...b.data, b.rule, b.conclusion, b.formula ?? ""]),
  ].join(" ");
  const set = new Set<string>();
  for (const m of src.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    const d = digitsOnly(m[0]);
    if (!d) continue;
    set.add(d);
    if (d.includes(".")) set.add(d.split(".")[0]);
    const n = Number(d);
    if (Number.isFinite(n)) {
      set.add(String(Math.round(n)));
      set.add(String(Math.round(n / 10) * 10));
    }
  }
  return set;
}

export interface GroundingOptions {
  /** normalised names of every product Inventra knows about */
  knownProducts?: string[];
  /** products the procurement plan says to REORDER (or that are Critical) */
  reorderProducts?: string[];
  /** products flagged Reduce / overstock */
  reduceProducts?: string[];
}

export interface GroundingResult {
  grounded: boolean;
  reasons: string[];
}

export function checkGrounding(
  aiText: string,
  promptBlock: string,
  evidence: EvidenceBlock[],
  opts: GroundingOptions = {}
): GroundingResult {
  const reasons: string[] = [];
  const text = aiText || "";
  const lower = text.toLowerCase();
  const allow = allowedNumbers(promptBlock, evidence);
  const haystack = digitsOnly(promptBlock + " " + evidence.map((b) => b.data.join(" ")).join(" "));

  // 1. Invented dollar figures (>= $20 and nowhere in the data, even rounded).
  const fabricated: string[] = [];
  for (const m of text.matchAll(/\$\s?(\d[\d,]*(?:\.\d+)?)/g)) {
    const d = digitsOnly(m[1]);
    const n = Number(d);
    if (!Number.isFinite(n) || n < 20) continue;
    const hit = allow.has(d) || allow.has(String(Math.round(n))) || haystack.includes(d.split(".")[0]);
    if (!hit) fabricated.push(`$${m[1]}`);
  }
  if (fabricated.length > 0) reasons.push(`dollar figures not in the data: ${[...new Set(fabricated)].slice(0, 5).join(", ")}`);

  // 2. Invented quantity figures ("450 units", "1,200 in stock", "300 cartons").
  const fabQty: string[] = [];
  for (const m of text.matchAll(/\b(\d[\d,]*)\s*(units?|cartons?|cases?|pcs|pieces?|in stock|on hand|on-hand)\b/gi)) {
    const d = digitsOnly(m[1]);
    const n = Number(d);
    if (!Number.isFinite(n) || n < 20) continue;
    if (!(allow.has(d) || allow.has(String(Math.round(n))) || haystack.includes(d))) fabQty.push(m[0].trim());
  }
  if (fabQty.length > 0) reasons.push(`quantities not in the data: ${[...new Set(fabQty)].slice(0, 5).join(", ")}`);

  // 3. Claims Inventra has no data for (supplier / lead time / trend / % margin / history).
  const claims: string[] = [];
  for (const { re, label } of UNSUPPORTED_CLAIMS) {
    const m = text.match(re);
    if (!m) continue;
    // "7-day lead time" and the "14-day reorder window" ARE in the prompt — allow.
    if (label === "lead-time figure" && (m[1] === "7" || m[1] === "14")) continue;
    claims.push(label);
  }
  if (claims.length > 0) reasons.push(`states data Inventra does not have: ${[...new Set(claims)].join(", ")}`);

  // 4. Does the answer reference the real numbers at all?
  let citations = 0;
  for (const m of text.matchAll(/\b\d[\d,]*(?:\.\d+)?\b/g)) {
    const d = digitsOnly(m[0]);
    if (d.length >= 2 && (allow.has(d) || haystack.includes(d.split(".")[0]))) citations++;
  }
  const substantive = text.replace(/\s+/g, " ").trim().length > 220;
  if (substantive && citations < 2 && evidence.length > 0) reasons.push("does not cite the imported figures");

  // 5. Generic advice with no product / number nearby.
  const generic: string[] = [];
  for (const phrase of GENERIC_ADVICE) {
    let idx = lower.indexOf(phrase);
    while (idx !== -1) {
      const window = text.slice(Math.max(0, idx - 140), idx + phrase.length + 140);
      const hasNumber = /\$\s?\d|\b\d{2,}\b|\bday/i.test(window);
      const hasProduct = evidence.some((b) => {
        const w = norm(b.subject).split(" ").filter((x) => x.length >= 3);
        return w.some((x) => norm(window).includes(x));
      });
      if (!hasNumber && !hasProduct) generic.push(phrase);
      idx = lower.indexOf(phrase, idx + 1);
    }
  }
  if (generic.length > 1) reasons.push(`unsupported generic advice: ${[...new Set(generic)].slice(0, 4).join(", ")}`);

  // Words that mark a candidate as a section label / metric, not a product name.
  const LABEL_WORDS =
    /\b(?:value|health|score|risk|revenue|inventory|sellers?|movers?|slow|fast|overstock|dead\s*stock|products?|catalog|critical|recommend|recommended|action|impact|days?|cover|coverage|margin|confidence|summary|overview|opportunit|growth|reorder|restock|reduce|clear|discount|bundle|protect|priority|stock(?:out)?|target|quantity|units?|next|business|cash\s*flow|where\b|losing)/i;

  // token-overlap: is `cand` (normalised) really one of the known product names?
  const matchesKnown = (cand: string, known: string[][]) => {
    const ct = cand.split(" ").filter((w) => w.length >= 3);
    if (ct.length === 0) return true;
    return known.some((kt) => {
      const hit = ct.filter((w) => kt.includes(w)).length;
      return hit / ct.length >= 0.6 || hit >= 3;
    });
  };

  // 6. Product not in the catalogue (bold phrases / phrases with a SKU tag).
  if (opts.knownProducts && opts.knownProducts.length) {
    const known = opts.knownProducts.map((p) => norm(p).split(" ").filter((w) => w.length >= 2));
    const cands = new Set<string>();
    for (const m of text.matchAll(/\*\*([^*\n]{3,80})\*\*/g)) cands.add(m[1]);
    for (const m of text.matchAll(/([A-Za-z][A-Za-z0-9''.\- ]{2,55}?)\s*\(SKU\s+[A-Za-z]{2,4}-?\d+\)/g)) cands.add(m[1]);
    const invented: string[] = [];
    for (const raw of cands) {
      const c = norm(raw).replace(/^(?:start with|order|reorder|the|your|for|consider|prioriti[sz]e|clear|discount|reduce|bundle)\s+/i, "").trim();
      if (!c || c.split(" ").length < 2) continue; // single words too noisy
      if (LABEL_WORDS.test(c) || /^\d/.test(c)) continue; // it's a label, not a product
      if (!matchesKnown(c, known)) invented.push(raw.trim());
    }
    if (invented.length > 0) reasons.push(`names a product not in your catalogue: ${[...new Set(invented)].slice(0, 3).join(", ")}`);
  }

  // 7. Contradicts the analysis — sentence-scoped so a product list doesn't false-trigger.
  const sentences = text.split(/(?<=[.!?\n])\s+/);
  const contradictions: string[] = [];
  const firstTok = (name: string) => norm(name).split(" ").filter((w) => w.length >= 3)[0] ?? "";
  const sentenceHits = (name: string, re: RegExp) => {
    const t = firstTok(name);
    if (!t) return false;
    return sentences.some((s) => {
      const ls = s.toLowerCase();
      return ls.includes(t) && re.test(s) && s.length < 320;
    });
  };
  for (const p of new Set(opts.reorderProducts ?? [])) {
    if (sentenceHits(p, CONTRA_REORDER) || sentenceHits(p, CONTRA_REDUCE))
      contradictions.push(`told to hold/reduce ${p} while the plan reorders it`);
  }
  for (const p of new Set(opts.reduceProducts ?? [])) {
    if (sentenceHits(p, PRO_REORDER)) contradictions.push(`told to reorder ${p} while it is flagged overstock/reduce`);
  }
  if (contradictions.length > 0) reasons.push(`contradicts the analysis: ${contradictions.slice(0, 3).join("; ")}`);

  return { grounded: reasons.length === 0, reasons };
}
