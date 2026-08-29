"use client";

import {
  Lightbulb,
  TrendingUp,
  Rocket,
  Sparkles,
  PackageX,
  Wallet,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { ChartSkeleton } from "@/components/shared/skeletons";
import { SparkleEmptyState } from "@/components/shared/empty-state";
import { TrendPill } from "@/components/shared/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/format";
import type { BusinessInsight, BusinessInsightsReport } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";

interface InsightsResponse {
  seeded: boolean;
  report?: BusinessInsightsReport;
}

export function InsightsView() {
  const { data, loading, refresh } = useFetch<InsightsResponse>("/api/insights");
  const setSection = useAppStore((s) => s.setSection);

  if (loading || !data) return <InsightsSkeleton />;
  if (!data.seeded || !data.report) return <SparkleEmptyState />;

  const { report } = data;

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Business Insights"
        description="Your AI-generated weekly report — revenue drivers, growth, opportunities, and cash flow actions."
        icon={Lightbulb}
        actions={
          <Button variant="outline" onClick={() => { refresh(); toast.success("Refreshing AI report…"); }}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
        }
      />

      {/* Executive summary */}
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-teal-700 to-teal-900 p-6 text-white">
        <div className="absolute -right-8 -top-8 size-40 rounded-full bg-teal-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-teal-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-teal-200">
              Executive Summary · AI Generated
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-balance">
            {report.summary}
          </p>
          <p className="mt-3 text-xs text-teal-200/80">
            Generated {relativeTime(report.generatedAt)}
          </p>
        </div>
      </Card>

      {/* Top revenue drivers + fastest growing */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightGroup
          title="Top Revenue Drivers"
          subtitle="Highest revenue contribution this week"
          icon={TrendingUp}
          accent="emerald"
          items={report.topRevenueDrivers}
          impactLabel="Weekly revenue"
          impactPrefix="$"
        />
        <InsightGroup
          title="Fastest Growing Products"
          subtitle="Highest week-over-week demand growth"
          icon={Rocket}
          accent="teal"
          items={report.fastestGrowing}
          impactLabel="Growth"
          impactPrefix="+"
          impactSuffix="%"
          metricAsTrend
        />
      </div>

      {/* Hidden opportunities + dead inventory */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InsightGroup
          title="Hidden Revenue Opportunities"
          subtitle="Untapped upsell & expansion potential"
          icon={Sparkles}
          accent="amber"
          items={report.hiddenOpportunities}
          impactLabel="Potential gain"
          impactPrefix="+"
        />
        <InsightGroup
          title="Dead Inventory"
          subtitle="Slow movers tying up working capital"
          icon={PackageX}
          accent="red"
          items={report.deadInventory}
          impactLabel="Capital tied up"
          impactPrefix="$"
        />
      </div>

      {/* Cash flow actions */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Wallet className="size-4 text-teal-600" />
          <h3 className="text-sm font-semibold">Recommended Business Actions</h3>
        </div>
        <div className="mt-4 space-y-3">
          {report.cashFlowActions.map((a) => (
            <div key={a.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{a.title}</p>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-teal-700 border-teal-200 bg-teal-50 dark:text-teal-300 dark:border-teal-900 dark:bg-teal-950/40">
                    {a.impact}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                <p className="mt-2 text-sm text-foreground">{a.recommendation}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Impact</p>
                <p className="text-lg font-bold tabular-nums text-teal-700 dark:text-teal-400">
                  {a.impactPrefix || (a.impactValue >= 0 ? "+" : "")}
                  {formatCurrency(a.impactValue)}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => setSection("ai-advisor")} variant="outline">
            Discuss with AI Advisor
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InsightGroup({
  title,
  subtitle,
  icon: Icon,
  accent,
  items,
  impactLabel,
  impactPrefix,
  impactSuffix,
  metricAsTrend,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: "teal" | "emerald" | "amber" | "red";
  items: BusinessInsight[];
  impactLabel: string;
  impactPrefix?: string;
  impactSuffix?: string;
  metricAsTrend?: boolean;
}) {
  const accentCls = {
    teal: "bg-teal-50 text-teal-600 ring-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:ring-teal-900",
    emerald: "bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    amber: "bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    red: "bg-red-50 text-red-600 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
  }[accent];

  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <div className={cn("flex size-9 items-center justify-center rounded-lg ring-1", accentCls)}>
          <Icon className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="line-clamp-1 text-xs text-muted-foreground">{item.description}</p>
              </div>
              <div className="text-right shrink-0">
                {metricAsTrend && item.metric ? (
                  <TrendPill value={Number(item.metric.replace(/[+%]/g, "")) || 0} />
                ) : (
                  <>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{impactLabel}</p>
                    <p className="text-sm font-bold tabular-nums">
                      {impactPrefix}
                      {formatCurrency(item.impactValue)}
                      {impactSuffix || ""}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="px-1 py-6 text-center text-sm text-muted-foreground">No items in this category.</p>
        )}
      </div>
    </Card>
  );
}

function InsightsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-56 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
