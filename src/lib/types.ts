// Inventra AI — Core domain types

export type SectionId =
  | "dashboard"
  | "ai-advisor"
  | "revenue-protection"
  | "inventory-health"
  | "forecast"
  | "insights"
  | "alerts"
  | "settings";

export type Priority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface ProductWithMetrics {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  stockQuantity: number;
  sellingPrice: number;
  costPrice: number;
  reorderPoint: number;
  unit: string;
  // computed
  averageDailySales: number;
  daysRemaining: number;
  revenueAtRisk: number;
  inventoryValue: number;
  weeklyRevenue: number;
  weeklyGrowth: number; // % vs previous week
  stockoutProbability: number; // 0-100
  status: "healthy" | "warning" | "critical" | "overstock";
}

export interface Recommendation {
  id: string;
  productId: string;
  productName: string;
  category: string;
  revenueAtRisk: number;
  suggestedOrderQuantity: number;
  confidenceScore: number;
  priority: Priority;
  reason: string;
  generatedAt: string;
}

export interface DashboardMetrics {
  revenueAtRisk: number;
  potentialStockouts: number;
  inventoryHealthScore: number;
  recommendedActions: number;
  totalInventoryValue: number;
  totalProducts: number;
  weeklyRevenue: number;
  weeklyRevenueGrowth: number;
  topRecommendation: {
    title: string;
    revenueProtected: number;
    confidenceScore: number;
    productIds: string[];
  };
  kpiTrend: TrendPoint[];
  categoryDistribution: { name: string; value: number; color: string }[];
}

export interface TrendPoint {
  label: string;
  revenue: number;
  orders: number;
}

export interface OpportunityFeedItem {
  id: string;
  type: "opportunity" | "risk" | "warning";
  title: string;
  description: string;
  impact: string;
  impactValue: number;
  action: string;
  product?: string;
}

export interface AlertItem {
  id: string;
  productId: string;
  productName: string;
  priority: Priority;
  problem: string;
  financialImpact: number;
  recommendedAction: string;
  confidenceScore: number;
  daysRemaining: number;
}

export interface ForecastPoint {
  label: string;
  demand: number;
  lower: number;
  upper: number;
  stock: number;
  stockoutProbability: number;
}

export interface ProductForecast {
  productId: string;
  productName: string;
  category: string;
  points: ForecastPoint[];
  avgDailyDemand: number;
  totalForecastDemand: number;
  peakDay: string;
  confidence: number;
  stockoutProbability: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  // structured payload the assistant may return
  insight?: AdvisorInsight;
}

export interface AdvisorInsight {
  summary: string;
  items: AdvisorInsightItem[];
  overallConfidence: number;
}

export interface AdvisorInsightItem {
  productName: string;
  stockRemaining: number;
  predictedStockout: string;
  suggestedOrder: number;
  confidence: number;
  revenueProtection: number;
  reasoning: string;
}

export interface InventoryHealth {
  score: number;
  label: string;
  explanation: string;
  strengths: string[];
  risks: string[];
  categoryBreakdown: {
    category: string;
    products: number;
    healthScore: number;
    revenueAtRisk: number;
  }[];
}

export interface BusinessInsight {
  id: string;
  title: string;
  category: string;
  description: string;
  impact: string;
  impactValue: number;
  recommendation: string;
  metric?: string;
}

export interface BusinessInsightsReport {
  generatedAt: string;
  summary: string;
  topRevenueDrivers: BusinessInsight[];
  fastestGrowing: BusinessInsight[];
  hiddenOpportunities: BusinessInsight[];
  deadInventory: BusinessInsight[];
  cashFlowActions: BusinessInsight[];
}

/* ============================================================
   Phase 1 MVP — Import → Analysis → Brief → Revenue Risk
   ============================================================ */

/** A raw parsed spreadsheet row before validation (all strings/unknowns). */
export interface RawRow {
  rowNumber: number;
  name: string;
  category: string;
  stock: string | number | null;
  dailySales: string | number | null;
  sellingPrice: string | number | null;
  costPrice: string | number | null;
}

/** A validated, import-ready product row. */
export interface ImportRow {
  name: string;
  category: string;
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
}

/** Result of validating one parsed row. */
export interface RowValidation {
  rowNumber: number;
  raw: RawRow;
  data: ImportRow | null;
  errors: string[];
  warnings: string[];
}

export interface ParsePreview {
  fileName: string;
  totalRows: number;
  validRows: ImportRow[];
  validations: RowValidation[];
  errorCount: number;
  warningCount: number;
}

export type RiskLevel = "Critical" | "High" | "Medium" | "Low" | "None";

export type ProductVelocity = "Fast" | "Medium" | "Slow" | "None";
export type ProductRecommendation = "Reorder" | "Reduce" | "Monitor" | "Opportunity";
export type RevenueImpactTier = "High" | "Medium" | "Low";

/** Per-product output of the analysis engine (Feature 2) + FMCG knowledge layer. */
export interface ProductAnalysis {
  id: string;
  name: string; // originalName — used for all user-facing display
  canonicalName?: string | null; // internal reasoning / matching
  brand?: string | null;
  sku?: string | null;
  category: string;
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
  unitMargin: number;
  daysRemaining: number; // Infinity when dailySales === 0
  daysUntilStockout: number; // bounded horizon
  riskLevel: RiskLevel;
  estimatedRevenueAtRisk: number;
  inventoryValue: number;
  // FMCG layer
  velocity: ProductVelocity;
  weeklyRevenue: number;
  revenueImpact: RevenueImpactTier;
  overstockRisk: RevenueImpactTier; // High / Medium / Low
  reorderUrgency: number; // 0-100
  reorderUrgencyLevel: "Critical" | "High" | "Medium" | "Low";
  recommendation: ProductRecommendation;
}

export interface CategoryRollup {
  category: string;
  products: number;
  weeklyRevenue: number;
  atRisk: number;
  slowMovers: number;
}

export interface AnalysisSummary {
  totalProducts: number;
  criticalCount: number;
  highCount: number;
  atRiskWithinWeek: number;
  totalRevenueAtRisk: number;
  totalInventoryValue: number;
  healthLabel: string;
  explanation: string;
  // FMCG layer
  fastMovers: number;
  mediumMovers: number;
  slowMovers: number;
  reorderCount: number;
  reduceCount: number;
  monitorCount: number;
  opportunityCount: number;
  totalWeeklyRevenue: number;
  /** Σ(dailySales × unitMargin) — estimated gross margin per day at current velocity. */
  dailyGrossMargin: number;
  /** Blended gross-margin % of revenue across the catalog. */
  grossMarginPct: number;
}

/**
 * Which business inputs the user actually provided. Detected from the imported
 * values — never assumed. Downstream modules use this to DISABLE features whose
 * numbers would otherwise be fabricated, instead of silently filling blanks.
 */
export interface DataQuality {
  hasSalesData: boolean; // at least one product carries a real daily-sales figure
  hasCostData: boolean; // at least one product carries a real cost price
  productsWithoutSales: number; // count with dailySales <= 0
  productsMissingCost: number; // count with costPrice <= 0
  totalProducts: number;
}

export interface InventoryAnalysis {
  generatedAt: string;
  business: string;
  products: ProductAnalysis[];
  summary: AnalysisSummary;
  categoryRollup: CategoryRollup[];
  dataQuality: DataQuality;
  healthScore: number; // 0-100
  healthBreakdown: {
    stockoutRisk: number;
    inventoryBalance: number;
    productHealth: number;
  };
}

/* ---------- Procurement Intelligence ---------- */

/**
 * Full, auditable breakdown of a single procurement recommendation — every input,
 * the formula, and plain-language reasoning. Powers the "Why?" panels and Copilot.
 */
export interface ProcurementExplanation {
  currentStock: number;
  dailySales: number; // rounded for display
  daysRemaining: number; // Infinity when there are no sales
  daysRemainingLabel: string; // "3" or "30+"
  velocity: ProductVelocity;
  velocityLabel: string; // "Fast Moving" | "Medium Moving" | "Slow Moving" | "No Sales"
  revenueImpact: RevenueImpactTier;
  targetCoverageDays: number;
  formula: string; // "(21 × 6) - 18 = 108"
  suggestedQuantity: number;
  reason: string; // multi-sentence human-readable explanation of the quantity
  priorityReason: string; // why this priority / why Critical
  velocityReason: string; // why this velocity class
}

export interface ProcurementRow {
  id: string;
  name: string;
  canonicalName: string | null;
  sku: string | null;
  category: string;
  brand: string | null;
  stock: number;
  dailySales: number;
  daysRemaining: number;
  velocity: ProductVelocity;
  revenueImpact: RevenueImpactTier;
  reorderUrgency: number;
  costPrice: number;
  targetCoverageDays: number;
  suggestedQuantity: number;
  estimatedCost: number; // suggestedQuantity × costPrice
  priority: "Critical" | "High" | "Medium" | "Low";
  reason: string;
  revenueProtected: number;
  explanation: ProcurementExplanation;
}

/* ---------- Forecast reliability ---------- */

export interface ForecastSensitivity {
  factorLabel: string; // "Demand −20%"
  dailySales: number; // the shifted rate used
  suggestedQuantity: number; // qty the SAME formula would give — display only, not the recommendation
}

export interface SalesStability {
  band: "stable" | "moderate" | "volatile" | "unknown";
  coefficientOfVariation?: number; // present only when sales history exists
  days?: number; // days of history the CV is based on
  note: string;
}

/** Per-product day-to-day sales variability (from Sale history, when it exists). */
export interface SalesStat {
  cv?: number; // coefficient of variation; undefined when < 5 days of history
  days: number;
}

/** How trustworthy one recommendation is, what it assumes, and what would break it. */
export interface ForecastEvidence {
  recommendationType: "reorder" | "revenue-at-risk" | "opportunity" | "simulator";
  confidence: EvidenceConfidence;
  confidenceReason: string;
  formula?: string;
  inputs: string[]; // the values the recommendation is built from, with their source
  assumptions: string[]; // what must hold for it to be right
  sensitivity: ForecastSensitivity[]; // recommendation at ±20% demand (empty for non-quantity types)
  reliabilityFactors: string[]; // "may become inaccurate if …"
  salesStability?: SalesStability;
}

export interface ProcurementResult {
  rows: ProcurementRow[];
  plan: ProcurementRow[];
  kpis: {
    productsToReorder: number;
    criticalOrders: number;
    estimatedPurchaseUnits: number;
    estimatedPurchaseCost: number;
    revenueProtected: number;
  };
  generatedAt: string;
}

export interface ProcurementPlanResponse {
  plan: ProcurementRow[];
  kpis: ProcurementResult["kpis"];
  dataQuality?: DataQuality;
  forecast?: Record<string, ForecastEvidence>; // keyed by product id
  summary: string;
  source: "ai" | "deterministic";
  business: string; // the owner's business name, for the exported PDF letterhead
}

/* ---------- Cash Flow Intelligence ---------- */
export interface CapitalConsumer {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  velocity: ProductVelocity;
  recommendation: ProductRecommendation;
  stock: number;
  unitCost: number;
  inventoryValue: number;
  shareOfCapital: number; // 0-1
}

export interface CashflowResult {
  hasData: boolean;
  kpis: {
    totalInventoryValue: number;
    slowMovingValue: number;
    deadInventoryValue: number;
    cashLocked: number;
    cashLockedPct: number; // 0-1
    revenueAtRisk: number;
    workingCapitalHealth: number; // 0-100
    workingCapitalLabel: string;
  };
  breakdown: { healthy: number; slowMoving: number; dead: number };
  topConsumers: CapitalConsumer[];
  explanation: string;
  dataQuality?: DataQuality;
  generatedAt: string;
}

/** AI Business Brief (Feature 3). */
export interface CriticalRisk {
  product: string;
  daysRemaining: number;
  revenueAtRisk: number;
  priority: Priority;
}

export interface RevenueOpportunity {
  title: string;
  observation: string;
  recommendedAction: string;
  expectedRevenueImpact: number;
}

export interface RecommendedAction {
  priority: Priority;
  action: string;
  reason: string;
  expectedImpact: string;
}

export interface BusinessBrief {
  generatedAt: string;
  source: "ai" | "deterministic";
  executiveSummary: string;
  criticalRisks: CriticalRisk[];
  revenueOpportunities: RevenueOpportunity[];
  recommendedActions: RecommendedAction[];
  healthScore: number;
  healthLabel: string;
  healthExplanation: string;
}

/* ============================================================
   Phase 2 — AI Business Copilot
   ============================================================ */

export type CopilotLanguage = "en" | "km";

/* ---------- Copilot evidence model ---------- */

export type EvidenceConfidence = "High" | "Medium" | "Low";

/**
 * DATA → RULE → CONCLUSION for one product. Every Copilot recommendation must
 * map to one of these; nothing is asserted that isn't in `data`.
 */
export interface EvidenceBlock {
  productId: string;
  subject: string; // "Sting Strawberry (SKU BEV-005)" — original name + SKU
  topic: "reorder" | "critical" | "overstock" | "opportunity" | "healthy";
  data: string[]; // actual imported / derived values, one per line
  rule: string; // why the engine flagged it (the rule, in words)
  conclusion: string; // the recommendation, with its numbers
  formula?: string; // "(21 × 8) − 18 = 150" when a quantity is involved
  confidence: EvidenceConfidence;
  confidenceReason: string;
}

/** Structured business context injected into every Copilot AI request. */
export interface CopilotContext {
  business: string;
  hasData: boolean;
  productCount: number;
  healthScore: number;
  healthLabel: string;
  revenueAtRisk: number;
  inventoryValue: number;
  dataQuality?: DataQuality;
  revenueAtRiskMargin?: number; // margin portion of revenueAtRisk
  dailyGrossMargin?: number;
  grossMarginPct?: number;
  criticalProducts: { name: string; contextName?: string; daysRemaining: number; revenueAtRisk: number; suggestedQuantity?: number; dailySales?: number; stock?: number }[];
  overstockProducts: { name: string; contextName?: string; daysRemaining: number; inventoryValue: number; velocity?: string; dailySales?: number; pauseWeeks?: number }[];
  recommendedActions: RecommendedAction[];
  opportunities: { title: string; expectedRevenueImpact: number }[];
  topSellers: { name: string; contextName?: string; dailySales: number; weeklyRevenue: number; velocity?: string; unitsPerWeek?: number }[];
  velocityMix?: { fast: number; medium: number; slow: number };
  recommendationMix?: { reorder: number; reduce: number; monitor: number; opportunity: number };
  categoryMix?: { category: string; weeklyRevenue: number; atRisk: number }[];
  /** DATA/RULE/CONCLUSION for the material products — the grounding source */
  evidence?: EvidenceBlock[];
  procurement?: {
    productsToReorder: number;
    estimatedPurchaseCost: number;
    revenueProtected: number;
  };
  cashflow?: {
    totalInventoryValue: number;
    cashLocked: number;
    cashLockedPct: number;
    workingCapitalHealth: number;
  };
}

/** The 4 insight cards rendered beneath every assistant response. */
export interface CopilotInsightCards {
  revenueImpact: string;
  inventoryImpact: string;
  riskLevel: Priority;
  recommendedAction: string;
}

export interface CopilotReorderItem {
  product: string;
  reason: string;
  suggestedQuantity: number;
  revenueProtection: number;
  confidence: number;
  confidenceLabel?: EvidenceConfidence;
  /** the DATA lines behind this line item — always present for deterministic replies */
  evidence?: string[];
  rule?: string;
  formula?: string;
}

/**
 * Visual-first executive briefing rendered ABOVE the (short) prose in every
 * assistant reply. Every figure is lifted straight from the deterministic
 * analysis / procurement engines — the model never produces or edits it.
 */
export interface CopilotDashboard {
  health: { score: number; label: string };
  revenueAtRisk: number;
  criticalCount: number;
  /** null when no cost prices were imported — never a fabricated 0. */
  cashLocked: number | null;
  inventoryValue: number | null;
  /** Ranked, 3–5 items. */
  priorities: { rank: number; title: string; impact: string }[];
  /** Stock-coverage gauges for the most at-risk products (max 5). */
  coverage: { name: string; days: number; targetDays: number }[];
  /** Revenue exposed per at-risk product, largest first (max 5). */
  revenueRisk: { name: string; amount: number }[];
  /** roi = protectedRevenue ÷ estimatedPurchaseCost; null when cost is unknown. */
  action: { text: string; protectedRevenue: number; roi: number | null };
}

/** Structured payload the assistant appends as a fenced JSON block. */
export interface CopilotStructured {
  insightCards: CopilotInsightCards | null;
  reorder: CopilotReorderItem[];
  /** Present whenever the business has data; null on the no-data / blocked replies. */
  dashboard?: CopilotDashboard | null;
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  insightCards?: CopilotInsightCards | null;
  reorder?: CopilotReorderItem[] | null;
  dashboard?: CopilotDashboard | null;
  language: CopilotLanguage;
  createdAt: string;
  /** client-only: assistant bubble currently receiving a stream */
  streaming?: boolean;
  error?: boolean;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  language: CopilotLanguage;
  updatedAt: string;
  messageCount: number;
}

/** Trailing frame the chat stream emits after the prose. */
export interface CopilotStreamMeta {
  type: "meta";
  sessionId: string;
  messageId: string;
  title: string;
  content: string; // final clean markdown (JSON tail removed)
  insightCards: CopilotInsightCards | null;
  reorder: CopilotReorderItem[];
  dashboard: CopilotDashboard | null;
}

export interface CopilotStreamError {
  type: "error";
  message: string;
}

/* ============================================================
   Phase 3 — Scenario Simulator
   ============================================================ */

export interface ScenarioParams {
  demandGrowthPct: number; // sustained demand change, -50..200
  salesIncreasePct: number; // promo / one-off uplift, 0..200
  seasonalMultiplier: number; // direct demand multiplier, 0.25..3
  supplierDelayDays: number; // added to base lead time, 0..30
  reorderQuantity: number; // units added per at-risk product, 0..500
}

export interface SimProductResult {
  id: string;
  name: string;
  canonicalName?: string | null;
  sku?: string | null;
  brand?: string | null;
  category: string;
  effectiveDailySales: number;
  coverBefore: number; // days (Infinity encoded as a large number over the wire)
  coverAfter: number;
  coverAfterReorder: number;
  stockoutProbability: number; // 0..99, after the scenario, before any reorder
  mitigatedProbability: number; // 0..99, after the reorder lands
  revenueImpact: number; // 30-day $
  atRisk: boolean;
}

export interface SimulationSnapshot {
  revenue30d: number;
  inventoryValue: number;
  avgStockoutProbability: number;
  productsAtRisk: number;
}

export interface SimulationDeltas {
  revenueImpact: number;
  inventoryImpact: number;
  cashOutlay: number;
  protectedRevenue: number;
  netCashFlowImpact: number;
}

export interface SimulationRecommendedAction {
  headline: string;
  detail: string;
  suggestedReorderQuantity: number;
}

export interface SimulationResult {
  generatedAt: string;
  horizonDays: number;
  params: ScenarioParams;
  before: SimulationSnapshot;
  after: SimulationSnapshot;
  deltas: SimulationDeltas;
  productsAtRisk: SimProductResult[];
  topOpportunities: { name: string; revenueImpact: number }[];
  recommendedAction: SimulationRecommendedAction;
}

export interface SavedScenario {
  id: string;
  name: string;
  params: ScenarioParams;
  result: SimulationResult;
  createdAt: string;
}

export interface SimulationExplanation {
  explanation: string;
  source: "ai" | "deterministic";
}

/* ============================================================
   Phase 4 — AI Action Center
   ============================================================ */

export type ActionCategory = "reorder" | "opportunity" | "cashflow" | "risk" | "scenario";
export type ActionStatus = "open" | "saved" | "completed" | "dismissed";
export type ActionSource =
  | "Analysis"
  | "Revenue Risk"
  | "Business Brief"
  | "Simulator"
  | "Procurement";

export interface BusinessAction {
  key: string; // stable identity: `${category}:${productId ?? slug(recommendation)}`
  priority: Priority;
  category: ActionCategory;
  recommendation: string;
  reason: string; // one joined sentence — used for the AI prompt
  reasons: string[]; // display bullets ("84 units left", "Selling 42/day", …)
  triggeredBy: string; // the exact rule + threshold that fired ("Why you're seeing this")
  expectedImpact: string;
  impactValue: number; // $ — positive = revenue protected / opportunity captured
  marginImpact?: number; // $ — the margin portion of impactValue, when known
  confidence: number; // 0..100
  source: ActionSource[];
  productId?: string;
  // hydrated from ActionState
  status: ActionStatus;
  note?: string | null;
}

export interface ActionCenterTotals {
  revenueProtected: number;
  opportunitiesCaptured: number;
  revenueAtStake: number;
  opportunityAvailable: number;
  openCount: number;
  completedCount: number;
  dismissedCount: number;
}

export interface ResolvedAction {
  key: string;
  status: ActionStatus;
  category: ActionCategory;
  impactValue: number;
  note?: string | null;
  updatedAt: string;
  recommendation?: string;
}

export interface ActionCenterPayload {
  hasData: boolean;
  generatedAt: string;
  briefing: string;
  briefingSource: "ai" | "deterministic";
  groups: Record<Priority, BusinessAction[]>;
  resolved: ResolvedAction[];
  totals: ActionCenterTotals;
  dataQuality?: DataQuality;
}

/* ============================================================
   Phase 5 — Smart Product Recognition & Auto-Catalog
   ============================================================ */

export type InternalField =
  | "productCode"
  | "productName"
  | "brand"
  | "category"
  | "stock"
  | "dailySales"
  | "sellingPrice"
  | "costPrice";

export type ColumnMapping = Record<InternalField, number | null>;

export interface ColumnDetection {
  mapping: ColumnMapping;
  confidence: number; // 0..1 — share of internal fields auto-mapped
  unmapped: string[]; // source headers not used
}

export type RecognitionSource = "kb" | "rules" | "ai" | "manual";

/** How the recogniser reached its answer for one product. */
export type RecognitionMethod =
  | "exact-name" // KB: the normalised name matched a KB product name
  | "exact-alias" // KB: the normalised name matched a known alias
  | "substring" // KB: a KB name/alias sits inside the uploaded name (or vice versa)
  | "token-overlap" // KB: enough words in common with a KB product
  | "provided-code" // the source file carried a usable product code / barcode
  | "provided-fields" // the source file carried the brand and/or category
  | "brand-keyword" // rules: a known brand name was found in the text
  | "category-keyword" // rules: the category was inferred from a keyword
  | "titlecase" // rules: no KB hit, name just tidied for display
  | "khmer-fallback" // rules: Khmer text, no KB hit, no canonical could be built
  | "unknown" // rules: nothing matched at all
  | "ai-suggestion" // the AI proposed the canonical name / brand / category
  | "merge"; // dedup: this entry combined two or more uploaded rows

/** Full, auditable explanation of one recognition result. */
export interface RecognitionEvidence {
  source: RecognitionSource;
  method: RecognitionMethod;
  confidence: number; // 0..1 — the same value as RecognizedProduct.confidence
  confidenceLabel: EvidenceConfidence; // High ≥90 · Medium 70–89 · Low <70
  reason: string; // plain-language "how this was recognised"
  matchedAlias?: string; // the KB alias / substring that matched
  matchedCanonical?: string; // the KB product name it matched
  reviewRequired: boolean;
  reviewReason?: string; // why review is required (present iff reviewRequired)
}

/** One product after recognition, before the user reviews it. */
export interface RecognizedProduct {
  originalName: string; // exactly what the user uploaded — never overwritten
  canonicalName: string; // normalised English name (KB / AI); falls back to originalName
  brand: string;
  category: string;
  aliases: string[]; // normalised spellings seen for this product
  productCode: string | null;
  barcode: string | null;
  confidence: number; // 0..1
  source: RecognitionSource;
  /** full auditable explanation of the match */
  evidence?: RecognitionEvidence;
  /** merged numeric totals when this row absorbed duplicates during dedup */
  mergedCount?: number;
  /** 1-based source spreadsheet rows that produced this entry (>1 = merged) */
  sourceRows?: number[];
  /** set when the recogniser gave this row a canonical shared with another row
   *  but a size / variant / packaging difference blocked the automatic merge */
  variantWarning?: string;
}

/* ---------- Import transparency ---------- */

export type ImportRowStatus = "imported" | "warning" | "skipped" | "merged";

export type ImportRowReason =
  | "ok"
  | "empty-row"
  | "missing-name"
  | "invalid-name"
  | "invalid-stock"
  | "invalid-price"
  | "missing-sales"
  | "invalid-sales"
  | "missing-cost"
  | "invalid-cost"
  | "negative-stock"
  | "merged-duplicate"
  | "row-limit"
  | "user-ignored";

/** The fate of one uploaded spreadsheet row. */
export interface ImportAuditRow {
  row: number; // 1-based source spreadsheet row (header is row 1)
  name: string; // best-effort product name, may be ""
  status: ImportRowStatus;
  reason: ImportRowReason;
  detail: string; // human-readable sentence
}

export interface ImportAudit {
  uploadedRows: number; // data rows in the file (header excluded)
  importedRows: number; // reached the catalog cleanly
  warningRows: number; // imported, but something was defaulted / clamped
  skippedRows: number; // not imported (invalid or over the limit)
  mergedRows: number; // source rows folded into another row by dedup
  rows: ImportAuditRow[]; // every non-clean row (skipped / warning / merged)
}

export type ReviewStatus = "approved" | "pending" | "ignored";

/** A recognised product plus its numeric data and the user's review decision. */
export interface ReviewProduct extends RecognizedProduct {
  sku: string;
  stock: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
  status: ReviewStatus;
}

export interface RecognizeResponse {
  products: ReviewProduct[];
  highConfidenceCount: number;
  needsReviewCount: number;
  aiUsed: boolean;
  /** source rows folded into another entry by duplicate-merge */
  mergedRowCount: number;
}

export interface CatalogProduct {
  id: string;
  sku: string;
  productCode: string | null;
  name: string; // originalName — the uploaded name
  canonicalName: string;
  aliases: string[];
  brand: string | null;
  category: string;
  confidenceScore: number;
  isAutoGenerated: boolean;
  recognitionMethod?: string; // RecognitionMethod at import time
  recognitionReason?: string; // plain-language explanation captured at import
  velocity?: ProductVelocity;
  recommendation?: ProductRecommendation;
}

export interface CatalogPayload {
  hasData: boolean;
  products: CatalogProduct[];
  productCount: number;
  categoryCount: number;
  categories: string[];
  brands: string[];
}
