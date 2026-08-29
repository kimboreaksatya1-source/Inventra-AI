"use client";

import Link from "next/link";
import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";
import { useCopilotContext } from "@/lib/copilot-queries";
import type { CopilotLanguage } from "@/lib/types";

export function ContextPanel({ language }: { language: CopilotLanguage }) {
  const { data, isLoading, isError } = useCopilotContext();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <p className="px-4 pt-4 pb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {t(language, "copilot.context")}
      </p>

      {isLoading && (
        <div className="space-y-3 px-4">
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
      )}

      {!isLoading && (isError || !data?.hasData) && (
        <div className="mx-4 rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm font-medium">{t(language, "copilot.noData")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t(language, "copilot.noDataBody")}</p>
          <Button asChild size="sm" className="mt-3">
            <Link href="/upload">{t(language, "copilot.importCta")}</Link>
          </Button>
        </div>
      )}

      {!isLoading && data?.hasData && (
        <div className="space-y-4 px-4 pb-6">
          <HealthRing score={data.healthScore} label={data.healthLabel} title={t(language, "context.health")} />

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <TrendingDown className="size-3.5 text-red-500" />
              {t(language, "context.revenueAtRisk")}
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-red-600 dark:text-red-400">
              {formatCurrency(data.revenueAtRisk)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatCurrency(data.inventoryValue)} inventory · {data.productCount} products
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <AlertTriangle className="size-3.5 text-amber-500" />
              {t(language, "context.criticalProducts")}
            </div>
            {data.criticalProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t(language, "context.none")}</p>
            ) : (
              <ul className="space-y-2">
                {data.criticalProducts.slice(0, 5).map((p) => (
                  <li key={p.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {p.daysRemaining}d ·{" "}
                      <span className="text-red-600 dark:text-red-400">
                        {formatCurrency(p.revenueAtRisk)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Package className="size-3.5 text-teal-600" />
              {t(language, "context.recommendedActions")}
            </div>
            <ul className="space-y-2.5">
              {data.recommendedActions.slice(0, 3).map((a, i) => (
                <li key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={a.priority} />
                    <span className="text-sm font-medium">{a.action}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{a.expectedImpact}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function HealthRing({ score, label, title }: { score: number; label: string; title: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = c - (clamped / 100) * c;
  const tone = clamped >= 70 ? "text-teal-600" : clamped >= 55 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="relative shrink-0">
        <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
          <circle cx="52" cy="52" r={r} fill="none" strokeWidth="9" className="stroke-muted" />
          <circle
            cx="52"
            cy="52"
            r={r}
            fill="none"
            strokeWidth="9"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={cn("transition-all", tone)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums">{clamped}</span>
          <span className="text-[9px] text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <p className={cn("mt-0.5 text-sm font-semibold", tone)}>{label}</p>
      </div>
    </div>
  );
}
