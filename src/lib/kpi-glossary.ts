// Inventra AI — one canonical label + plain-language definition per headline KPI.
// Every page imports from here so the same metric reads the same way everywhere.
// Definitions describe what the number IS (measurement / calculation / forecast /
// heuristic score / projection) so a reader can't mistake a projection for a
// realised figure.

export const KPI = {
  inventoryHealth: {
    label: "Inventory Health",
    note: "Heuristic score, 0–100. A weighted blend of stockout risk (40%), inventory balance / overstock (30%) and product health (30%). A planning indicator, not a financial figure.",
  },
  revenueAtRisk: {
    label: "Revenue at Risk",
    note: "Projection, next 30 days. For each product low on stock: min(days of cover, 30) × daily sales × selling price. The revenue you would lose IF at-risk products stock out at the current sales rate — not a realised loss.",
  },
  revenueAtRiskCovered: {
    label: "Revenue at Risk Covered",
    note: "Projection. The 30-day Revenue-at-Risk of the products in this purchase plan — the exposure you remove by reordering them. Same basis as the Revenue-at-Risk metric; not guaranteed savings.",
  },
  estimatedPurchaseCost: {
    label: "Estimated Purchase Cost",
    note: "Deterministic calculation. Σ (suggested quantity × imported unit cost) across the plan. Shows “n/a” when cost prices were not imported — never estimated.",
  },
  totalInventoryValue: {
    label: "Total Inventory Value",
    note: "Deterministic calculation, at cost price. Σ (stock on hand × imported unit cost). Products with no cost price are excluded, not estimated.",
  },
  cashLockedPct: {
    label: "Cash Locked %",
    note: "Deterministic calculation. (slow-moving value + dead-stock value) ÷ total inventory value, at cost. “Slow” and “dead” are the engine's velocity classes.",
  },
  workingCapitalHealth: {
    label: "Working Capital Health",
    note: "Heuristic score, 0–100. Starts at 100 and subtracts for cash locked in slow/dead stock, overstock share, stockout exposure and concentration in a few SKUs. A planning indicator, not a financial figure.",
  },
  workingCapitalHealthShort: "Heuristic 0–100 planning score — not a financial figure.",
  modelledMarginUpside: {
    label: "Modelled margin upside",
    note: "Projection. Assumes ~25% more orders on a healthy fast mover: extra weekly units × unit margin × 4 weeks. A modelled opportunity, not expected revenue.",
  },
  stockoutProbability: {
    label: "Stockout Risk",
    note: "Modelled probability. Derived from days of cover vs. lead time plus a volatility allowance — a planning estimate for the scenario, not a measured rate.",
  },
  scenarioProjection:
    "Projected figures for a hypothetical scenario — modelled against your real inventory, not actuals.",
} as const;
