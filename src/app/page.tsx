import Link from "next/link";
import {
  ArrowRight,
  FileText,
  ShieldAlert,
  Sparkles,
  Upload,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { loadAnalysisInputs } from "@/lib/data";
import { latestImport } from "@/lib/import";
import { analyzeInventory } from "@/lib/analysis";
import { formatCurrency } from "@/lib/format";

export const dynamic = "force-dynamic";

const QUESTIONS = [
  "What should I do next?",
  "What products are at risk?",
  "Where am I losing revenue?",
  "What opportunities should I act on?",
];

export default async function HomePage() {
  let hasData = false;
  let summary: Awaited<ReturnType<typeof getSummary>> | null = null;
  try {
    summary = await getSummary();
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
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat label="Health Score" value={`${summary?.healthScore ?? 0}/100`} />
                <Stat label="Products" value={String(summary?.totalProducts ?? 0)} />
                <Stat label="At Risk (7d)" value={String(summary?.atRiskWithinWeek ?? 0)} />
                <Stat
                  label="Revenue at Risk"
                  value={formatCurrency(summary?.totalRevenueAtRisk ?? 0)}
                />
              </div>
            </Card>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/brief">
                  <FileText className="size-4" />
                  View Business Brief
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

async function getSummary() {
  const { business, products } = await loadAnalysisInputs();
  const analysis = analyzeInventory(products, business);
  const lastImport = await latestImport();
  return {
    healthScore: analysis.healthScore,
    totalProducts: analysis.summary.totalProducts,
    atRiskWithinWeek: analysis.summary.atRiskWithinWeek,
    totalRevenueAtRisk: analysis.summary.totalRevenueAtRisk,
    lastImport,
  };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
