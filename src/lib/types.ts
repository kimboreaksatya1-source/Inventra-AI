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

/** Per-product output of the analysis engine (Feature 2). */
export interface ProductAnalysis {
  id: string;
  name: string;
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
}

export interface InventoryAnalysis {
  generatedAt: string;
  business: string;
  products: ProductAnalysis[];
  summary: AnalysisSummary;
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
