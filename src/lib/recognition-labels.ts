// Inventra AI — display strings for the recognition evidence model. Pure.

import type { RecognitionMethod, RecognitionSource } from "./types";

export const RECOGNITION_SOURCE_LABEL: Record<RecognitionSource, string> = {
  kb: "Knowledge Base",
  rules: "Rules Engine",
  ai: "AI",
  manual: "You",
};

export const RECOGNITION_METHOD_LABEL: Record<RecognitionMethod, string> = {
  "exact-name": "Exact name match",
  "exact-alias": "Alias match",
  substring: "Partial (substring) match",
  "token-overlap": "Word-overlap match",
  "provided-code": "Product code / barcode in your file",
  "provided-fields": "Brand / category from your file",
  "brand-keyword": "Brand keyword",
  "category-keyword": "Category keyword",
  titlecase: "Name tidied only",
  "khmer-fallback": "Khmer fallback",
  unknown: "No match",
  "ai-suggestion": "AI suggestion",
  merge: "Merged duplicate rows",
};

/** What the confidence bands mean, one line each (STEP 4). */
export const CONFIDENCE_BAND_HELP = {
  High: "90–100% — an exact name, alias or barcode match. Auto-approved.",
  Medium: "70–89% — a strong but partial match (substring or word overlap). Sent to review.",
  Low: "Below 70% — a weak match, an AI suggestion, or an unknown product. Sent to review.",
} as const;
