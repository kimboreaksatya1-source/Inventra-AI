// Inventra AI — Copilot slash-command registry.
// Each command expands to a natural-language prompt sent to the Copilot.

import type { CopilotContext } from "./types";

export interface CopilotCommand {
  id: string; // "/reorder"
  title: string;
  description: string;
  prompt: string; // what actually gets sent to the model
  autoSubmit: boolean; // send immediately vs drop into the input for editing
  keywords?: string[]; // extra search terms
}

export const COPILOT_COMMANDS: CopilotCommand[] = [
  {
    id: "/summary",
    title: "Business Summary",
    description: "Where things stand today — health, risk, cash",
    prompt: "Generate a business summary of where things stand today.",
    autoSubmit: true,
    keywords: ["overview", "status", "recap"],
  },
  {
    id: "/risk",
    title: "Revenue at Risk",
    description: "Where you're losing revenue and which products are exposed",
    prompt: "Where am I losing revenue right now, and which products are most at risk?",
    autoSubmit: true,
    keywords: ["stockout", "exposure", "losing"],
  },
  {
    id: "/reorder",
    title: "Reorder Recommendations",
    description: "What to buy this week, quantities, revenue protected",
    prompt:
      "What should I reorder this week? Give me quantities and the revenue each order protects.",
    autoSubmit: true,
    keywords: ["restock", "order", "purchase", "buy"],
  },
  {
    id: "/overstock",
    title: "Overstock & Slow Movers",
    description: "Products tying up cash and how to free it",
    prompt: "Which products are overstocked or slow-moving and tying up cash?",
    autoSubmit: true,
    keywords: ["dead stock", "excess", "surplus"],
  },
  {
    id: "/revenue",
    title: "Revenue Breakdown",
    description: "Where revenue comes from and where it leaks",
    prompt: "Break down where my revenue is coming from and where it is leaking.",
    autoSubmit: true,
    keywords: ["sales", "income", "margin"],
  },
  {
    id: "/products",
    title: "Product Rundown",
    description: "How each product in the catalog is performing",
    prompt: "Give me a rundown of my product catalog and how each product is performing.",
    autoSubmit: true,
    keywords: ["catalog", "inventory", "skus"],
  },
  {
    id: "/top-sellers",
    title: "Top Sellers",
    description: "Best performers and how they're trending",
    prompt: "What are my top-selling products and how are they trending?",
    autoSubmit: true,
    keywords: ["best", "winners", "fast movers"],
  },
  {
    id: "/slow-moving",
    title: "Slow-Moving Stock",
    description: "Products barely selling and what to do",
    prompt: "Which products are barely selling and what should I do about them?",
    autoSubmit: true,
    keywords: ["stale", "not selling", "clearance"],
  },
  {
    id: "/brief",
    title: "Executive Brief",
    description: "The full consulting-style business brief",
    prompt: "Give me the full executive business brief for my inventory.",
    autoSubmit: true,
    keywords: ["report", "consulting", "executive"],
  },
  {
    id: "/action",
    title: "Priority Actions",
    description: "Your highest-priority tasks right now",
    prompt: "What are my highest-priority actions right now, in order?",
    autoSubmit: true,
    keywords: ["tasks", "todo", "next steps", "action center"],
  },
  {
    id: "/simulator",
    title: "Scenario Ideas",
    description: "What-if scenarios worth testing",
    prompt: "What what-if scenarios should I run, and what would each one mean for the business?",
    autoSubmit: true,
    keywords: ["what if", "simulate", "forecast", "scenario"],
  },
  {
    id: "/opportunities",
    title: "Growth Opportunities",
    description: "Biggest upside and how to capture it",
    prompt: "What are my biggest growth opportunities and what should I do to capture them?",
    autoSubmit: true,
    keywords: ["growth", "upside", "expand"],
  },
  {
    id: "/cashflow",
    title: "Cash Flow Advice",
    description: "Free up trapped cash from inventory",
    prompt: "How can I improve my cash flow based on my current inventory?",
    autoSubmit: true,
    keywords: ["working capital", "liquidity", "money"],
  },
];

const BY_ID = new Map(COPILOT_COMMANDS.map((c) => [c.id, c]));

/**
 * Filter commands for the palette. Command-id matches always win and, when any
 * exist, are the only results (Notion/Cursor style). Title/keyword/description
 * matches are the fallback only when nothing matches the id.
 */
export function filterCommands(query: string): CopilotCommand[] {
  const q = query.trim().toLowerCase().replace(/^\//, "");
  if (!q) return COPILOT_COMMANDS;

  const idMatches: { cmd: CopilotCommand; score: number }[] = [];
  for (const cmd of COPILOT_COMMANDS) {
    const id = cmd.id.slice(1).toLowerCase();
    if (id === q) idMatches.push({ cmd, score: 100 });
    else if (id.startsWith(q)) idMatches.push({ cmd, score: 80 });
    else if (id.includes(q)) idMatches.push({ cmd, score: 60 });
  }
  if (idMatches.length > 0) {
    return idMatches.sort((a, b) => b.score - a.score).map((s) => s.cmd);
  }

  const fuzzy: { cmd: CopilotCommand; score: number }[] = [];
  for (const cmd of COPILOT_COMMANDS) {
    let score = 0;
    if (cmd.title.toLowerCase().includes(q)) score = 40;
    else if (cmd.keywords?.some((k) => k.includes(q))) score = 30;
    else if (cmd.description.toLowerCase().includes(q)) score = 20;
    if (score > 0) fuzzy.push({ cmd, score });
  }
  return fuzzy.sort((a, b) => b.score - a.score).map((s) => s.cmd);
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export interface SuggestedCommand {
  cmd: CopilotCommand;
  badge: string; // dynamic label, e.g. "7 critical products"
}

/** Dynamic recommendations from the current inventory context. Top 3. */
export function suggestedCommands(ctx: CopilotContext | undefined): SuggestedCommand[] {
  if (!ctx || !ctx.hasData) return [];
  const out: SuggestedCommand[] = [];

  const critical = ctx.criticalProducts.length;
  if (critical > 0) {
    out.push({
      cmd: BY_ID.get("/reorder")!,
      badge: `${critical} product${critical === 1 ? "" : "s"} at risk`,
    });
  }
  if (ctx.revenueAtRisk > 0) {
    out.push({ cmd: BY_ID.get("/risk")!, badge: `${usd(ctx.revenueAtRisk)} at risk` });
  }
  if (ctx.recommendedActions.length > 0) {
    out.push({
      cmd: BY_ID.get("/action")!,
      badge: `${ctx.recommendedActions.length} recommended`,
    });
  }
  if (ctx.overstockProducts.length > 0) {
    out.push({
      cmd: BY_ID.get("/overstock")!,
      badge: `${ctx.overstockProducts.length} tying up cash`,
    });
  }
  if (ctx.opportunities.length > 0) {
    out.push({
      cmd: BY_ID.get("/opportunities")!,
      badge: `${ctx.opportunities.length} opportunit${ctx.opportunities.length === 1 ? "y" : "ies"}`,
    });
  }
  out.push({ cmd: BY_ID.get("/summary")!, badge: `health ${ctx.healthScore}/100` });

  // de-dup, keep first 3
  const seen = new Set<string>();
  return out.filter((s) => !seen.has(s.cmd.id) && seen.add(s.cmd.id)).slice(0, 3);
}
