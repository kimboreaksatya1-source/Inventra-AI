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
}

export interface InventoryAnalysis {
  generatedAt: string;
  business: string;
  products: ProductAnalysis[];
  summary: AnalysisSummary;
  categoryRollup: CategoryRollup[];
  healthScore: number; // 0-100
  healthBreakdown: {
    stockoutRisk: number;
    inventoryBalance: number;
    productHealth: number;
  };
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

/** Structured business context injected into every Copilot AI request. */
export interface CopilotContext {
  business: string;
  hasData: boolean;
  productCount: number;
  healthScore: number;
  healthLabel: string;
  revenueAtRisk: number;
  inventoryValue: number;
  criticalProducts: { name: string; contextName?: string; daysRemaining: number; revenueAtRisk: number }[];
  overstockProducts: { name: string; contextName?: string; daysRemaining: number; inventoryValue: number }[];
  recommendedActions: RecommendedAction[];
  opportunities: { title: string; expectedRevenueImpact: number }[];
  topSellers: { name: string; contextName?: string; dailySales: number; weeklyRevenue: number }[];
  velocityMix?: { fast: number; medium: number; slow: number };
  recommendationMix?: { reorder: number; reduce: number; monitor: number; opportunity: number };
  categoryMix?: { category: string; weeklyRevenue: number; atRisk: number }[];
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
}

/** Structured payload the assistant appends as a fenced JSON block. */
export interface CopilotStructured {
  insightCards: CopilotInsightCards | null;
  reorder: CopilotReorderItem[];
}

export interface CopilotMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  insightCards?: CopilotInsightCards | null;
  reorder?: CopilotReorderItem[] | null;
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
export type ActionSource = "Analysis" | "Revenue Risk" | "Business Brief" | "Simulator";

export interface BusinessAction {
  key: string; // stable identity: `${category}:${productId ?? slug(recommendation)}`
  priority: Priority;
  category: ActionCategory;
  recommendation: string;
  reason: string;
  expectedImpact: string;
  impactValue: number; // $ — positive = revenue protected / opportunity captured
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
  /** merged numeric totals when this row absorbed duplicates during dedup */
  mergedCount?: number;
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
