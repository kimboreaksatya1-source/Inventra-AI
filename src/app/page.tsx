import Link from "next/link";
import { ArrowRight, ListChecks, MessageSquare, Upload } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PriorityBadge } from "@/components/shared/badges";
import { LoadDemoButton } from "@/components/dashboard/load-demo-button";
import { SurveyInsights } from "@/components/dashboard/survey-insights";
import { latestImport } from "@/lib/import";
import { getSnapshot } from "@/lib/snapshot";
import { formatCurrency } from "@/lib/format";
import { requireAuth } from "@/lib/auth-helpers";
import type { BusinessAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireAuth();
  let summary: Awaited<ReturnType<typeof getSummary>> | null = null;
  try {
    summary = await getSummary(user.id);
  } catch {
    summary = null;
  }
  const hasData = (summary?.totalProducts ?? 0) > 0;
  const firstName = user.name?.split(" ")[0];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {!hasData ? (
          <>
            <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
              <ListChecks className="size-4" />
              AI Operating Copilot
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Turn your business data into decisions.
            </h1>
            <p className="mt-3 text-muted-foreground">
              Upload your product list and Inventra tells you what to do today — what to reorder, what
              to stop ordering, and why.
            </p>
            <Card className="mt-8 items-start gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
                <Upload className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Start with your data</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  A CSV or Excel export with product, stock, daily sales and prices — any column
                  names. Or load a sample catalog to explore now.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/upload">
                    Upload business data
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <LoadDemoButton />
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* ---------- HERO: Today's Priorities ---------- */}
            <div>
              <p className="text-sm font-medium text-teal-600">Today&apos;s priorities</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                {firstName ? `${firstName}, here's what to do today.` : "Here's what to do today."}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {summary!.priorities.length
                  ? `${summary!.priorities.length} thing${summary!.priorities.length === 1 ? "" : "s"} need your attention. Start at the top — they protect the most for the least effort.`
                  : "Nothing urgent today. Your inventory is balanced and nothing is at stockout risk."}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {summary!.priorities.map((a) => (
                <PriorityCard key={a.key} action={a} />
              ))}
            </div>

            {summary!.priorities.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href="/actions">
                    <ListChecks className="size-4" />
                    Full Action Center
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/copilot">
                    <MessageSquare className="size-4" />
                    Ask the Copilot
                  </Link>
                </Button>
              </div>
            )}

            {/* ---------- Supporting metrics ---------- */}
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">Business pulse</h2>
                {summary!.lastImport && (
                  <span className="text-xs text-muted-foreground">
                    {summary!.lastImport.fileName} · {summary!.lastImport.rowCount} products
                  </span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Pulse
                  label="Gross margin / day"
                  value={summary!.hasCostData ? formatCurrency(summary!.dailyGrossMargin) : "n/a"}
                  sub={summary!.hasCostData ? `${summary!.grossMarginPct}% of revenue (est.)` : "needs cost prices"}
                  tone="good"
                />
                <Pulse
                  label="Revenue at risk"
                  value={summary!.hasSalesData ? formatCurrency(summary!.totalRevenueAtRisk) : "n/a"}
                  sub="next 30 days"
                  tone={summary!.totalRevenueAtRisk > 1000 ? "bad" : summary!.totalRevenueAtRisk > 0 ? "warn" : "good"}
                />
                <Pulse
                  label="Cash locked"
                  value={summary!.hasCostData ? formatCurrency(summary!.cashLocked) : "n/a"}
                  sub="in slow / dead stock"
                  tone={summary!.cashLocked > summary!.inventoryValue * 0.15 ? "warn" : "good"}
                />
                <Pulse
                  label="Inventory health"
                  value={`${summary!.healthScore}/100`}
                  sub={summary!.healthLabel}
                  tone={summary!.healthScore < 55 ? "bad" : summary!.healthScore < 70 ? "warn" : "good"}
                />
              </div>
            </div>

            {/* ---------- Best sellers + survey ---------- */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Card className="gap-3 p-5">
                <h3 className="text-sm font-semibold">Best sellers this week</h3>
                <ol className="space-y-1.5">
                  {summary!.bestSellers.map((p, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="text-muted-foreground">{i + 1}.</span> {p.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {formatCurrency(p.weeklyRevenue)}/wk
                      </span>
                    </li>
                  ))}
                  {summary!.bestSellers.length === 0 && (
                    <li className="text-sm text-muted-foreground">Import daily-sales data to rank products.</li>
                  )}
                </ol>
              </Card>
              <SurveyInsights />
            </div>

            <div className="mt-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/upload">
                  <Upload className="size-4" />
                  Import new data
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

type Draft = Omit<BusinessAction, "status" | "note">;

const rank = (p: BusinessAction["priority"]) => ({ CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 })[p];

function PriorityCard({ action: a }: { action: Draft }) {
  return (
    <Card className="gap-2.5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge priority={a.priority} />
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {a.category === "cashflow" ? "overstock" : a.category}
        </span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-teal-700 dark:text-teal-300">
          {a.expectedImpact}
        </span>
      </div>
      <p className="font-semibold">{a.recommendation}</p>
      {a.reasons?.length > 0 && (
        <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          {a.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
              {r}
            </li>
          ))}
        </ul>
      )}
      {a.triggeredBy && (
        <p className="text-[11px] text-muted-foreground/80">
          <span className="font-medium">Why you&apos;re seeing this:</span> {a.triggeredBy}
        </p>
      )}
    </Card>
  );
}

function Pulse({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "good" | "warn" | "bad";
}) {
  const bar = tone === "bad" ? "border-l-red-500" : tone === "warn" ? "border-l-amber-500" : "border-l-teal-500";
  return (
    <div className={`rounded-lg border border-l-2 border-border ${bar} bg-card p-3`}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

async function getSummary(userId: string) {
  const [snap, lastImport] = await Promise.all([getSnapshot(userId), latestImport(userId)]);
  const all = snap?.actionDrafts ?? [];
  // A deliberately mixed top list — reorders AND "stop ordering" — so the first
  // screen shows the two decisions an owner actually makes, not five reorders.
  const reorders = all.filter((d) => d.category === "reorder" || d.category === "opportunity").slice(0, 3);
  const stops = all.filter((d) => d.category === "cashflow").slice(0, 2);
  const priorities = [...reorders, ...stops].sort(
    (a, b) => rank(a.priority) - rank(b.priority) || b.impactValue - a.impactValue
  );
  return {
    healthScore: snap?.analysis.healthScore ?? 0,
    healthLabel: snap?.analysis.summary.healthLabel ?? "No Data",
    totalProducts: snap?.analysis.summary.totalProducts ?? 0,
    totalRevenueAtRisk: snap?.analysis.summary.totalRevenueAtRisk ?? 0,
    inventoryValue: snap?.analysis.summary.totalInventoryValue ?? 0,
    dailyGrossMargin: snap?.analysis.summary.dailyGrossMargin ?? 0,
    grossMarginPct: snap?.analysis.summary.grossMarginPct ?? 0,
    cashLocked: snap?.copilotContext.cashflow?.cashLocked ?? 0,
    bestSellers: snap?.copilotContext.topSellers ?? [],
    priorities,
    hasSalesData: snap?.analysis.dataQuality?.hasSalesData ?? true,
    hasCostData: snap?.analysis.dataQuality?.hasCostData ?? true,
    lastImport,
  };
}
