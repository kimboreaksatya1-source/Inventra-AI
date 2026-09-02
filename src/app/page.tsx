import Link from "next/link";
import {
  ArrowRight,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { latestImport } from "@/lib/import";
import { getSnapshot } from "@/lib/snapshot";
import { formatCurrency } from "@/lib/format";
import { KPI } from "@/lib/kpi-glossary";
import { requireAuth } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  "What should I do next?",
  "What products are at risk?",
  "Where am I losing revenue?",
  "What opportunities should I act on?",
];

export default async function HomePage() {
  const user = await requireAuth();
  let hasData = false;
  let summary: Awaited<ReturnType<typeof getSummary>> | null = null;
  try {
    summary = await getSummary(user.id);
    hasData = summary.totalProducts > 0;
  } catch {
    hasData = false;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 text-sm font-medium text-teal-600">
          <Sparkles className="size-4" />
          AI Operating Copilot
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Turn your business data into decisions.
        </h1>
        <p className="mt-3 text-muted-foreground">
          Inventra reads your product data and answers the questions that actually move the business:
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {QUESTIONS.map((q) => (
            <li key={q} className="flex items-center gap-2 text-sm">
              <ArrowRight className="size-4 shrink-0 text-teal-600" />
              {q}
            </li>
          ))}
        </ul>

        {!hasData ? (
          <Card className="mt-8 items-start gap-4 p-6">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
              <Upload className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Start by uploading your data</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A CSV or Excel export with product, stock, daily sales and prices is all it takes.
              </p>
            </div>
            <Button asChild>
              <Link href="/upload">
                Upload business data
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-8 space-y-4">
            <Card className="gap-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Your latest analysis</h2>
                {summary?.lastImport && (
                  <span className="text-xs text-muted-foreground">
                    {summary.lastImport.fileName} · {summary.lastImport.rowCount} products ·{" "}
                    {new Date(summary.lastImport.createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              {summary && !summary.hasSalesData && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                  No daily-sales data was imported, so the health, at-risk and revenue-at-risk figures
                  below cannot be calculated. Import a daily-sales column to see them.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label={KPI.inventoryHealth.label}
                  value={summary?.hasSalesData ? `${summary?.healthScore ?? 0}/100` : "n/a"}
                  hint={summary?.hasSalesData ? "heuristic 0–100 score" : "needs daily-sales data"}
                />
                <Stat label="Products" value={String(summary?.totalProducts ?? 0)} />
                <Stat
                  label="At Risk"
                  value={summary?.hasSalesData ? String(summary?.atRiskWithinWeek ?? 0) : "n/a"}
                  hint={summary?.hasSalesData ? "stock out within 7 days" : "needs daily-sales data"}
                />
                <Stat
                  label={KPI.revenueAtRisk.label}
                  value={summary?.hasSalesData ? formatCurrency(summary?.totalRevenueAtRisk ?? 0) : "n/a"}
                  hint={summary?.hasSalesData ? "projected, next 30 days" : "needs daily-sales data"}
                />
              </div>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/actions">
                  <ListChecks className="size-4" />
                  Open Action Center
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/revenue-risk">
                  <ShieldAlert className="size-4" />
                  Revenue Risk
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/upload">
                  <Upload className="size-4" />
                  Import new data
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

async function getSummary(userId: string) {
  const [snap, lastImport] = await Promise.all([getSnapshot(userId), latestImport(userId)]);
  return {
    healthScore: snap?.analysis.healthScore ?? 0,
    totalProducts: snap?.analysis.summary.totalProducts ?? 0,
    atRiskWithinWeek: snap?.analysis.summary.atRiskWithinWeek ?? 0,
    totalRevenueAtRisk: snap?.analysis.summary.totalRevenueAtRisk ?? 0,
    // Without imported daily sales the risk / health figures are not meaningful.
    hasSalesData: snap?.analysis.dataQuality?.hasSalesData ?? true,
    lastImport,
  };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
