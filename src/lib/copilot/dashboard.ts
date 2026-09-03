// Inventra AI — Copilot executive dashboard builder.
// Turns the already-computed CopilotContext + Procurement plan into the compact,
// visual-first briefing the chat renders above the prose. Pure: no I/O, no model,
// and it never invents a figure — missing inputs surface as null, not 0.

import type {
  CopilotContext,
  CopilotDashboard,
  ProcurementResult,
} from "../types";

type Proc = Pick<ProcurementResult, "plan" | "kpis"> | null | undefined;

/** The reorder window the urgency model scores against (7-day lead time + 7 buffer). */
const COVERAGE_WINDOW_DAYS = 14;

export function buildCopilotDashboard(
  context: CopilotContext,
  procurement?: Proc
): CopilotDashboard | null {
  if (!context.hasData) return null;

  const hasCost = context.dataQuality?.hasCostData ?? true;

  const priorities = context.recommendedActions.slice(0, 5).map((a, i) => ({
    rank: i + 1,
    title: a.action,
    impact: a.expectedImpact,
  }));

  const coverage = context.criticalProducts.slice(0, 5).map((p) => ({
    name: p.name,
    days: Math.max(0, Math.round(p.daysRemaining * 10) / 10),
    targetDays: COVERAGE_WINDOW_DAYS,
  }));

  const revenueRisk = [...context.criticalProducts]
    .sort((a, b) => b.revenueAtRisk - a.revenueAtRisk)
    .slice(0, 5)
    .filter((p) => p.revenueAtRisk > 0)
    .map((p) => ({ name: p.name, amount: Math.round(p.revenueAtRisk) }));

  const protectedRevenue =
    procurement?.kpis.revenueProtected ??
    context.procurement?.revenueProtected ??
    0;

  // Reuses the existing procurement KPI values — no recalculation of either input.
  const purchaseCost =
    procurement?.kpis.estimatedPurchaseCost ??
    context.procurement?.estimatedPurchaseCost ??
    0;
  const roi = purchaseCost > 0 ? protectedRevenue / purchaseCost : null;

  const hasOrders =
    (procurement?.plan.length ?? context.procurement?.productsToReorder ?? 0) > 0;

  const action = {
    text: hasOrders
      ? "Place supplier orders today"
      : context.recommendedActions[0]?.action ?? "Maintain your current ordering cadence",
    protectedRevenue: Math.round(protectedRevenue),
    roi,
  };

  return {
    health: { score: context.healthScore, label: context.healthLabel },
    revenueAtRisk: Math.round(context.revenueAtRisk),
    criticalCount: context.criticalProducts.length,
    cashLocked: hasCost ? Math.round(context.cashflow?.cashLocked ?? 0) : null,
    inventoryValue: hasCost ? Math.round(context.inventoryValue) : null,
    priorities,
    coverage,
    revenueRisk,
    action,
  };
}
