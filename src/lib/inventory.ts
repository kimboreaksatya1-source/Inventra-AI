// Inventra AI — Inventory intelligence engine
// Pure functions that compute days-remaining, revenue-at-risk,
// stockout probability, recommendations and forecast data.

import type {
  AlertItem,
  BusinessInsight,
  ForecastPoint,
  InventoryHealth,
  OpportunityFeedItem,
  Priority,
  ProductForecast,
  ProductWithMetrics,
  Recommendation,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RawProduct {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  brand: string | null;
  stockQuantity: number;
  dailySales: number;
  sellingPrice: number;
  costPrice: number;
  reorderPoint: number;
  unit: string;
}

export interface RawSale {
  productId: string;
  quantity: number;
  date: Date;
}

/** Bucket sales by day for the last N days, indexed [0]=oldest */
function dailySeries(productId: string, sales: RawSale[], days: number): number[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets: number[] = new Array(days).fill(0);
  for (const s of sales) {
    if (s.productId !== productId) continue;
    const d = new Date(s.date.getFullYear(), s.date.getMonth(), s.date.getDate());
    const diff = Math.floor((today.getTime() - d.getTime()) / MS_PER_DAY);
    if (diff >= 0 && diff < days) {
      buckets[days - 1 - diff] += s.quantity;
    }
  }
  return buckets;
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

function mean(arr: number[]): number {
  return arr.length ? sum(arr) / arr.length : 0;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = sum(arr.map((x) => (x - m) ** 2)) / (arr.length - 1);
  return Math.sqrt(variance);
}

/** Average daily sales over the trailing window (default 30 days). */
export function averageDailySales(
  productId: string,
  sales: RawSale[],
  windowDays = 30
): number {
  const series = dailySeries(productId, sales, windowDays);
  return mean(series);
}

export function weeklyRevenue(
  productId: string,
  sales: RawSale[],
  sellingPrice: number
): number {
  const series = dailySeries(productId, sales, 7);
  return sum(series) * sellingPrice;
}

export function weeklyGrowth(
  productId: string,
  sales: RawSale[],
  sellingPrice: number
): number {
  const last7 = dailySeries(productId, sales, 7);
  const prev7 = dailySeries(productId, sales, 14).slice(0, 7);
  const cur = sum(last7) * sellingPrice;
  const prev = sum(prev7) * sellingPrice;
  if (prev === 0) return cur > 0 ? 100 : 0;
  return ((cur - prev) / prev) * 100;
}

export interface ComputeMetricsInput {
  product: RawProduct;
  sales: RawSale[];
  windowDays?: number;
}

export function computeProductMetrics({
  product,
  sales,
  windowDays = 30,
}: ComputeMetricsInput): ProductWithMetrics {
  const series = dailySeries(product.id, sales, windowDays);
  const avg = mean(series);
  const variability = stdev(series);
  const cv = avg > 0 ? variability / avg : 0; // coefficient of variation

  const daysRemaining = avg > 0 ? product.stockQuantity / avg : Infinity;

  // Predicted lost sales over next 7 days if stock runs out
  const leadDays = 7;
  let predictedLostSales = 0;
  if (avg > 0 && daysRemaining < leadDays) {
    const stockDays = Math.max(0, daysRemaining);
    predictedLostSales = avg * (leadDays - stockDays);
  }
  const revenueAtRisk = predictedLostSales * product.sellingPrice;

  // Stockout probability: higher when daysRemaining low & variability high
  let stockoutProbability = 0;
  if (avg > 0) {
    if (daysRemaining <= 0) stockoutProbability = 100;
    else if (daysRemaining < 3) stockoutProbability = Math.min(98, 80 + cv * 40);
    else if (daysRemaining < 7) stockoutProbability = Math.min(85, 45 + (7 - daysRemaining) * 8 + cv * 30);
    else if (daysRemaining < 14) stockoutProbability = Math.max(5, 25 - daysRemaining * 1.5);
    else stockoutProbability = Math.max(2, 10 - daysRemaining * 0.4);
  }

  let status: ProductWithMetrics["status"];
  if (avg > 0 && daysRemaining < 3) status = "critical";
  else if (avg > 0 && daysRemaining < 7) status = "warning";
  else if (avg === 0 || (daysRemaining > 60 && product.stockQuantity > product.reorderPoint * 4))
    status = "overstock";
  else status = "healthy";

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    sku: product.sku,
    stockQuantity: product.stockQuantity,
    sellingPrice: product.sellingPrice,
    costPrice: product.costPrice,
    reorderPoint: product.reorderPoint,
    unit: product.unit,
    averageDailySales: Math.round(avg * 10) / 10,
    daysRemaining,
    revenueAtRisk: Math.round(revenueAtRisk * 100) / 100,
    inventoryValue: Math.round(product.stockQuantity * product.costPrice * 100) / 100,
    weeklyRevenue: Math.round(weeklyRevenue(product.id, sales, product.sellingPrice) * 100) / 100,
    weeklyGrowth: Math.round(weeklyGrowth(product.id, sales, product.sellingPrice) * 10) / 10,
    stockoutProbability: Math.round(stockoutProbability),
    status,
  };
}

/** Suggested reorder to reach a 2-week supply buffer. */
export function suggestedOrderQuantity(
  avgDaily: number,
  stock: number,
  bufferDays = 14
): number {
  const target = avgDaily * bufferDays;
  const order = Math.ceil(target - stock);
  return Math.max(order, avgDaily > 0 ? Math.ceil(avgDaily * 7) : 0);
}

export function priorityFor(daysRemaining: number, avgDaily: number): Priority {
  if (avgDaily <= 0) return "LOW";
  if (daysRemaining <= 2) return "CRITICAL";
  if (daysRemaining <= 5) return "HIGH";
  if (daysRemaining <= 10 || revenueAtRiskRank(daysRemaining, avgDaily)) return "MEDIUM";
  return "LOW";
}

function revenueAtRiskRank(daysRemaining: number, avgDaily: number): boolean {
  return daysRemaining < 14 && avgDaily > 3;
}

/** Confidence score 0-100 based on data volume & demand stability. */
export function confidenceScore(
  productId: string,
  sales: RawSale[],
  avgDaily: number,
  windowDays = 30
): number {
  const series = dailySeries(productId, sales, windowDays);
  const activeDays = series.filter((x) => x > 0).length;
  const dataScore = Math.min(100, (activeDays / windowDays) * 100);
  const cv = avgDaily > 0 ? stdev(series) / avgDaily : 1;
  const stabilityScore = Math.max(0, 100 - cv * 60);
  return Math.round(dataScore * 0.4 + stabilityScore * 0.6);
}

export function generateRecommendations(
  products: RawProduct[],
  sales: RawSale[]
): Recommendation[] {
  const recs: Recommendation[] = [];
  for (const p of products) {
    const m = computeProductMetrics({ product: p, sales });
    // only recommend when there is a genuine need
    const needsReorder =
      m.averageDailySales > 0 &&
      (m.daysRemaining < 10 || p.stockQuantity <= p.reorderPoint);
    if (!needsReorder) continue;
    const priority = priorityFor(m.daysRemaining, m.averageDailySales);
    const order = suggestedOrderQuantity(m.averageDailySales, p.stockQuantity);
    if (order <= 0) continue;
    const conf = confidenceScore(p.id, sales, m.averageDailySales);
    recs.push({
      id: `rec-${p.id}`,
      productId: p.id,
      productName: p.name,
      category: p.category,
      revenueAtRisk: m.revenueAtRisk,
      suggestedOrderQuantity: order,
      confidenceScore: conf,
      priority,
      reason: buildReason(p, m, order),
      generatedAt: new Date().toISOString(),
    });
  }
  return recs.sort((a, b) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return b.revenueAtRisk - a.revenueAtRisk;
  });
}

function buildReason(
  p: RawProduct,
  m: ProductWithMetrics,
  order: number
): string {
  const trend =
    m.weeklyGrowth > 5
      ? `Demand increased ${m.weeklyGrowth}% compared to last week.`
      : m.weeklyGrowth < -5
      ? `Demand softened ${Math.abs(m.weeklyGrowth)}% week-over-week.`
      : "Demand is stable week-over-week.";
  const days = Number.isFinite(m.daysRemaining)
    ? `${Math.max(0, Math.round(m.daysRemaining))} days`
    : "more than 30 days";
  return `${p.name} inventory is projected to run out within ${days}. ${trend} Recommended reorder quantity: ${order} ${p.unit}s. Potential revenue protection: $${Math.round(
    m.revenueAtRisk
  )}.`;
}

/** Build alerts from product metrics. */
export function generateAlerts(
  products: RawProduct[],
  sales: RawSale[]
): AlertItem[] {
  const items: AlertItem[] = [];
  for (const p of products) {
    const m = computeProductMetrics({ product: p, sales });
    if (m.averageDailySales <= 0) {
      // slow moving -> low alert if heavily stocked
      if (p.stockQuantity > p.reorderPoint * 3) {
        items.push({
          id: `alert-${p.id}`,
          productId: p.id,
          productName: p.name,
          priority: "LOW",
          problem: `${p.name} is slow-moving with no sales in the trailing 30 days.`,
          financialImpact: Math.round(p.stockQuantity * p.costPrice),
          recommendedAction: "Run a promotion or bundle to free up cash tied in inventory.",
          confidenceScore: 70,
          daysRemaining: Infinity,
        });
      }
      continue;
    }
    const days = m.daysRemaining;
    if (days > 12 && m.weeklyGrowth < 8) continue;
    let priority: Priority;
    let problem: string;
    if (days <= 2) {
      priority = "CRITICAL";
      problem = `${p.name} will run out within 48 hours at current sales velocity.`;
    } else if (days <= 5) {
      priority = "HIGH";
      problem = `${p.name} will run out within ${Math.round(days)} days.`;
    } else if (m.weeklyGrowth >= 8) {
      priority = "MEDIUM";
      problem = `Demand for ${p.name} is rising rapidly (+${m.weeklyGrowth}% this week).`;
    } else {
      priority = "LOW";
      problem = `${p.name} stock is below optimal levels.`;
    }
    items.push({
      id: `alert-${p.id}`,
      productId: p.id,
      productName: p.name,
      priority,
      problem,
      financialImpact: Math.round(m.revenueAtRisk),
      recommendedAction:
        priority === "CRITICAL" || priority === "HIGH"
          ? `Reorder ${suggestedOrderQuantity(m.averageDailySales, p.stockQuantity)} ${p.unit}s immediately.`
          : "Plan a reorder within the next 3 days.",
      confidenceScore: confidenceScore(p.id, sales, m.averageDailySales),
      daysRemaining: days,
    });
  }
  return items.sort((a, b) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;
    return rank[a.priority] - rank[b.priority] || b.financialImpact - a.financialImpact;
  });
}

/** Opportunity feed: mix of revenue opportunities, risk alerts, overstock warnings. */
export function buildOpportunityFeed(
  products: RawProduct[],
  sales: RawSale[]
): OpportunityFeedItem[] {
  const items: OpportunityFeedItem[] = [];
  for (const p of products) {
    const m = computeProductMetrics({ product: p, sales });
    if (m.weeklyGrowth >= 12 && m.averageDailySales > 0) {
      items.push({
        id: `opp-${p.id}`,
        type: "opportunity",
        title: "Revenue Opportunity",
        description: `Demand for ${p.name.toLowerCase()} increased ${Math.round(
          m.weeklyGrowth
        )}%.`,
        impact: "Expected revenue impact",
        impactValue: Math.round(m.averageDailySales * 7 * p.sellingPrice * 0.2),
        action: `Recommended order: ${suggestedOrderQuantity(
          m.averageDailySales,
          p.stockQuantity
        )} ${p.unit}s`,
        product: p.name,
      });
    }
    if (m.averageDailySales > 0 && m.daysRemaining < 5) {
      items.push({
        id: `risk-${p.id}`,
        type: "risk",
        title: "Risk Alert",
        description: `${p.name} projected to sell out in ${Math.max(
          1,
          Math.round(m.daysRemaining)
        )} days.`,
        impact: "Potential lost revenue",
        impactValue: Math.round(m.revenueAtRisk),
        action: "Reorder immediately",
        product: p.name,
      });
    }
    if (m.status === "overstock") {
      items.push({
        id: `warn-${p.id}`,
        type: "warning",
        title: "Inventory Warning",
        description: `${p.name} is overstocked.`,
        impact: "Inventory tied up",
        impactValue: Math.round(m.inventoryValue),
        action: "Run promotion campaign",
        product: p.name,
      });
    }
  }
  return items.slice(0, 8);
}

/** 7-day forecast per product using simple moving average + variability bands. */
export function forecastProduct(
  product: RawProduct,
  sales: RawSale[],
  horizonDays = 7
): ProductForecast {
  const series = dailySeries(product.id, sales, 30);
  const recent = series.slice(-14);
  const avg = mean(recent);
  const sd = stdev(recent) || avg * 0.2;
  const trendSlope = recent.length > 7 ? (mean(recent.slice(-3)) - mean(recent.slice(0, 4))) / 4 : 0;

  const points: ForecastPoint[] = [];
  let stock = product.stockQuantity;
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date().getDay(); // 0 Sun .. 6 Sat
  for (let i = 0; i < horizonDays; i++) {
    const projected = Math.max(0, avg * (1 + trendSlope * (i + 1) * 0.15));
    const lower = Math.max(0, projected - sd);
    const upper = projected + sd;
    stock = Math.max(0, stock - projected);
    const stockoutProb =
      stock <= 0 ? 100 : Math.max(0, Math.min(98, (1 - stock / (avg * 3 || 1)) * 100));
    const labelIdx = (today + i + 1) % 7;
    points.push({
      label: horizonDays <= 7 ? dayLabels[labelIdx] : `D${i + 1}`,
      demand: Math.round(projected * 10) / 10,
      lower: Math.round(lower * 10) / 10,
      upper: Math.round(upper * 10) / 10,
      stock: Math.round(stock),
      stockoutProbability: Math.round(stockoutProb),
    });
  }
  const totalDemand = sum(points.map((p) => p.demand));
  const peak = points.reduce((a, b) => (b.demand > a.demand ? b : a), points[0]);
  return {
    productId: product.id,
    productName: product.name,
    category: product.category,
    points,
    avgDailyDemand: Math.round(avg * 10) / 10,
    totalForecastDemand: Math.round(totalDemand),
    peakDay: peak.label,
    confidence: confidenceScore(product.id, sales, avg),
    stockoutProbability: points[points.length - 1].stockoutProbability,
  };
}

/** Inventory health score 0-100 across the catalog. */
export function computeInventoryHealth(
  products: RawProduct[],
  sales: RawSale[]
): InventoryHealth {
  if (products.length === 0) {
    return {
      score: 0,
      label: "No data",
      explanation: "Add products and sales to compute an inventory health score.",
      strengths: [],
      risks: [],
      categoryBreakdown: [],
    };
  }
  const metrics = products.map((p) => computeProductMetrics({ product: p, sales }));
  const totalRevenueAtRisk = sum(metrics.map((m) => m.revenueAtRisk));
  const totalInventoryValue = sum(metrics.map((m) => m.inventoryValue));
  const critical = metrics.filter((m) => m.status === "critical").length;
  const overstock = metrics.filter((m) => m.status === "overstock").length;
  const healthy = metrics.filter((m) => m.status === "healthy").length;
  const lowStock = metrics.filter((m) => m.status === "warning").length;

  // scoring: start at 100, penalise risk & overstock
  let score = 100;
  score -= critical * 9;
  score -= lowStock * 4;
  score -= overstock * 3;
  score -= Math.min(15, totalRevenueAtRisk / 20);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 85 ? "Excellent" : score >= 70 ? "Healthy" : score >= 55 ? "Needs Attention" : "At Risk";

  const strengths: string[] = [];
  const risks: string[] = [];
  if (healthy >= metrics.length * 0.6) strengths.push("Strong overall stock coverage");
  if (critical === 0) strengths.push("No immediate stockout emergencies");
  const beverageCat = metrics.filter((m) => /beverage|drink|water/i.test(m.category));
  if (beverageCat.length && beverageCat.filter((m) => m.status === "healthy").length >= beverageCat.length * 0.6)
    strengths.push("Strong beverage turnover");
  const stable = metrics.filter((m) => m.averageDailySales > 0 && Math.abs(m.weeklyGrowth) < 15);
  if (stable.length >= metrics.length * 0.5) strengths.push("Good demand stability");
  if (overstock === 0) strengths.push("Balanced purchasing patterns");
  if (overstock > 0) risks.push(`${overstock} product(s) overstocked tying up capital`);
  if (critical > 0) risks.push(`${critical} product(s) at risk of imminent stockout`);
  if (lowStock > 0) risks.push(`${lowStock} product(s) running low`);
  const rising = metrics.filter((m) => m.weeklyGrowth > 10);
  if (rising.length) risks.push(`${rising.length} product(s) with rising demand outpacing replenishment`);

  // category breakdown
  const catMap = new Map<string, ProductWithMetrics[]>();
  for (const m of metrics) {
    if (!catMap.has(m.category)) catMap.set(m.category, []);
    catMap.get(m.category)!.push(m);
  }
  const categoryBreakdown = Array.from(catMap.entries()).map(([category, list]) => {
    const c = list.filter((m) => m.status === "critical").length;
    const o = list.filter((m) => m.status === "overstock").length;
    const catScore = Math.max(0, 100 - c * 12 - o * 6);
    return {
      category,
      products: list.length,
      healthScore: catScore,
      revenueAtRisk: Math.round(sum(list.map((m) => m.revenueAtRisk))),
    };
  });

  const explanation =
    score >= 85
      ? "Your inventory is healthy overall with strong coverage and stable demand."
      : score >= 70
      ? "Inventory is mostly healthy but a few products need attention to avoid revenue loss."
      : score >= 55
      ? "Several products need reordering soon to protect revenue and prevent stockouts."
      : "Your inventory is at risk. Immediate reorders are needed to prevent revenue loss.";

  return {
    score,
    label,
    explanation,
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    categoryBreakdown: categoryBreakdown.sort((a, b) => b.revenueAtRisk - a.revenueAtRisk),
  };
}

/** Aggregate dashboard metrics. */
export function computeDashboardMetrics(
  products: RawProduct[],
  sales: RawSale[]
) {
  const metrics = products.map((p) => computeProductMetrics({ product: p, sales }));
  const recs = generateRecommendations(products, sales);
  const revenueAtRisk = Math.round(sum(metrics.map((m) => m.revenueAtRisk)));
  const potentialStockouts = metrics.filter(
    (m) => m.averageDailySales > 0 && m.daysRemaining < 7
  ).length;
  const health = computeInventoryHealth(products, sales);
  const totalInventoryValue = Math.round(sum(metrics.map((m) => m.inventoryValue)));
  const weeklyRevenue = Math.round(sum(metrics.map((m) => m.weeklyRevenue)));
  const weeklyRevenueGrowth = Math.round(
    mean(metrics.map((m) => m.weeklyGrowth))
  );

  const top = recs.slice(0, 3);
  const topRecommendation = {
    title:
      top.length > 0
        ? `Restock ${top.map((r) => r.productName).join(", ")} within 72 hours.`
        : "No urgent reorders needed today.",
    revenueProtected: Math.round(sum(top.map((r) => r.revenueAtRisk))),
    confidenceScore: top.length
      ? Math.round(mean(top.map((r) => r.confidenceScore)))
      : 95,
    productIds: top.map((r) => r.productId),
  };

  // KPI trend (last 7 days revenue)
  const kpiTrend = buildRevenueTrend(products, sales, 7);

  // category distribution
  const catMap = new Map<string, number>();
  for (const m of metrics) catMap.set(m.category, (catMap.get(m.category) || 0) + m.weeklyRevenue);
  const palette = [
    "oklch(0.511 0.096 188.7)",
    "oklch(0.696 0.082 183.4)",
    "oklch(0.755 0.167 71)",
    "oklch(0.637 0.237 25)",
    "oklch(0.723 0.181 149)",
    "oklch(0.65 0.12 230)",
  ];
  const categoryDistribution = Array.from(catMap.entries()).map(([name, value], i) => ({
    name,
    value: Math.round(value),
    color: palette[i % palette.length],
  }));

  return {
    revenueAtRisk,
    potentialStockouts,
    inventoryHealthScore: health.score,
    recommendedActions: recs.length,
    totalInventoryValue,
    totalProducts: products.length,
    weeklyRevenue,
    weeklyRevenueGrowth,
    topRecommendation,
    kpiTrend,
    categoryDistribution,
  };
}

function buildRevenueTrend(products: RawProduct[], sales: RawSale[], days: number) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const points = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today.getTime() - i * MS_PER_DAY);
    let rev = 0;
    let orders = 0;
    for (const p of products) {
      const daySales = sales.filter(
        (s) =>
          s.productId === p.id &&
          s.date.getFullYear() === day.getFullYear() &&
          s.date.getMonth() === day.getMonth() &&
          s.date.getDate() === day.getDate()
      );
      const qty = sum(daySales.map((s) => s.quantity));
      rev += qty * p.sellingPrice;
      orders += daySales.length;
    }
    points.push({
      label: day.toLocaleDateString("en-US", { weekday: "short" }),
      revenue: Math.round(rev),
      orders,
    });
  }
  return points;
}

/** Build the static (non-AI) business insight report from metrics. */
export function buildBusinessInsights(products: RawProduct[], sales: RawSale[]) {
  const metrics = products.map((p) => computeProductMetrics({ product: p, sales }));
  const topRevenueDrivers: BusinessInsight[] = [...metrics]
    .sort((a, b) => b.weeklyRevenue - a.weeklyRevenue)
    .slice(0, 5)
    .map((m) => ({
      id: `driver-${m.id}`,
      title: m.name,
      category: "Top Revenue Driver",
      description: `${m.name} generated ${formatShare(m.weeklyRevenue, sum(metrics.map((x) => x.weeklyRevenue)))} of weekly revenue at $${m.weeklyRevenue}/week.`,
      impact: "Weekly revenue",
      impactValue: m.weeklyRevenue,
      recommendation:
        m.status === "healthy"
          ? "Maintain current stock levels; consider increasing purchase volume by 15%."
          : "Prioritise restocking to protect this revenue stream.",
      metric: `${m.weeklyRevenue}/wk`,
    }));

  const fastestGrowing: BusinessInsight[] = [...metrics]
    .filter((m) => m.averageDailySales > 0)
    .sort((a, b) => b.weeklyGrowth - a.weeklyGrowth)
    .slice(0, 5)
    .map((m) => ({
      id: `grow-${m.id}`,
      title: m.name,
      category: "Fastest Growing",
      description: `${m.name} demand grew ${m.weeklyGrowth}% week-over-week.`,
      impact: "Growth rate",
      impactValue: m.weeklyGrowth,
      recommendation: `Increase purchase volume by ${Math.min(
        40,
        Math.max(15, Math.round(m.weeklyGrowth * 0.6))
      )}% to capture rising demand.`,
      metric: `+${m.weeklyGrowth}%`,
    }));

  const hiddenOpportunities: BusinessInsight[] = metrics
    .filter((m) => m.weeklyGrowth >= 8 && m.stockQuantity < m.averageDailySales * 8)
    .slice(0, 4)
    .map((m) => ({
      id: `opp-${m.id}`,
      title: m.name,
      category: "Hidden Opportunity",
      description: `${m.name} is gaining demand but stock is below an 8-day buffer — upsell potential is untapped.`,
      impact: "Potential weekly gain",
      impactValue: Math.round(m.averageDailySales * 2 * m.sellingPrice),
      recommendation: "Expand shelf presence and run a featured display this week.",
      metric: `+${m.weeklyGrowth}%`,
    }));

  const deadInventory: BusinessInsight[] = metrics
    .filter((m) => m.averageDailySales === 0 || m.status === "overstock")
    .sort((a, b) => b.inventoryValue - a.inventoryValue)
    .slice(0, 5)
    .map((m) => ({
      id: `dead-${m.id}`,
      title: m.name,
      category: "Slow Moving",
      description: `${m.name} has ${m.stockQuantity} units in stock with little to no recent sales.`,
      impact: "Capital tied up",
      impactValue: Math.round(m.inventoryValue),
      recommendation: "Bundle with fast movers or run a discount campaign to release cash.",
      metric: `$${Math.round(m.inventoryValue)}`,
    }));

  const cashFlowActions: BusinessInsight[] = [
    {
      id: "cf-1",
      title: "Reduce overstock exposure",
      category: "Cash Flow",
      description: `${deadInventory.length} slow-moving products are tying up capital.`,
      impact: "Releasable capital",
      impactValue: Math.round(sum(deadInventory.map((d) => d.impactValue))),
      recommendation: "Liquidate slow movers via promotions to free $".concat(
        `${Math.round(sum(deadInventory.map((d) => d.impactValue)))} in working capital.`
      ),
    },
    {
      id: "cf-2",
      title: "Prioritise high-velocity reorders",
      category: "Cash Flow",
      description: "Redirect freed capital to the fastest-growing products first.",
      impact: "Protected revenue",
      impactValue: Math.round(sum(metrics.filter((m) => m.weeklyGrowth > 0).map((m) => m.revenueAtRisk))),
      recommendation: "Reorder top growers this week to sustain momentum.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    summary: `This week ${metrics.length} products generated $${sum(
      metrics.map((m) => m.weeklyRevenue)
    ).toFixed(0)} in revenue. ${fastestGrowing.length} products are accelerating, while ${deadInventory.length} need attention.`,
    topRevenueDrivers,
    fastestGrowing,
    hiddenOpportunities,
    deadInventory,
    cashFlowActions,
  };
}

function formatShare(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(0)}%`;
}
