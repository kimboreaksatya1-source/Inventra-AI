"use client";

import {
  Activity,
  ArrowRight,
  Boxes,
  ShieldAlert,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { CopilotDashboard, CopilotLanguage } from "@/lib/types";

/** "8.8×" for a ratio, whole number once it clears 10×. */
function formatRoi(roi: number): string {
  return `${roi >= 10 ? Math.round(roi) : roi.toFixed(1)}×`;
}

/**
 * The visual-first executive briefing rendered ABOVE the assistant's prose.
 * Every value is deterministic (built from the analysis / procurement engines);
 * this component only draws it — no data shaping, no fabrication.
 */
export function ExecutiveDashboard({
  dashboard: d,
  language,
}: {
  dashboard: CopilotDashboard;
  language: CopilotLanguage;
}) {
  const healthTone =
    d.health.score >= 70
      ? "text-teal-600 dark:text-teal-400"
      : d.health.score >= 55
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  return (
    <div className="mt-1 space-y-3 rounded-2xl border border-border bg-card p-3.5 sm:p-4">
      {/* ---- KPI strip ---- */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Kpi
          icon={<Activity className="size-3.5" />}
          label={t(language, "dash.health")}
          value={`${d.health.score}`}
          suffix="/100"
          sub={d.health.label}
          valueClass={healthTone}
          accent="bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300"
        />
        <Kpi
          icon={<TrendingDown className="size-3.5" />}
          label={t(language, "dash.revenueAtRisk")}
          value={formatCurrency(d.revenueAtRisk, { compact: true })}
          valueClass="text-red-600 dark:text-red-400"
          accent="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"
        />
        <Kpi
          icon={<ShieldAlert className="size-3.5" />}
          label={t(language, "dash.critical")}
          value={`${d.criticalCount}`}
          sub={t(language, "dash.criticalSub")}
          valueClass="text-foreground"
          accent="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300"
        />
        <Kpi
          icon={<Wallet className="size-3.5" />}
          label={t(language, "dash.cashLocked")}
          value={d.cashLocked === null ? "—" : formatCurrency(d.cashLocked, { compact: true })}
          sub={d.cashLocked === null ? t(language, "dash.noCost") : undefined}
          valueClass="text-foreground"
          accent="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
      </div>

      {/* ---- Top priorities ---- */}
      {d.priorities.length > 0 && (
        <Section icon={<Boxes className="size-3.5 text-teal-600" />} title={t(language, "dash.priorities")}>
          <ol className="space-y-2">
            {d.priorities.map((p) => (
              <li key={p.rank} className="flex gap-2.5">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md bg-teal-600 text-[11px] font-semibold text-white">
                  {p.rank}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-snug">{p.title}</p>
                  <p className="text-[11px] leading-snug text-muted-foreground">{p.impact}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* ---- Stock coverage gauges ---- */}
      {d.coverage.length > 0 && (
        <Section title={t(language, "dash.coverage")}>
          <div className="space-y-2">
            {d.coverage.map((c) => {
              const pct = Math.max(4, Math.min(100, (c.days / c.targetDays) * 100));
              const tone =
                c.days < 3 ? "bg-red-500" : c.days < 7 ? "bg-amber-500" : "bg-teal-500";
              return (
                <div key={c.name}>
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="min-w-0 truncate font-medium text-foreground/90">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {c.days} / {c.targetDays} {t(language, "dash.days")}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", tone)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---- Revenue at risk by product ---- */}
      {d.revenueRisk.length > 0 && (
        <Section
          icon={<TrendingDown className="size-3.5 text-red-500" />}
          title={t(language, "dash.revenueRisk")}
        >
          <div className="space-y-2">
            {d.revenueRisk.map((r, i) => {
              const max = d.revenueRisk[0]?.amount || 1;
              const pct = Math.max(6, Math.min(100, (r.amount / max) * 100));
              return (
                <div key={`${r.name}-${i}`} className="flex items-center gap-2">
                  <span className="w-28 shrink-0 truncate text-[11px] font-medium text-foreground/90 sm:w-36">
                    {r.name}
                  </span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="flex h-full items-center justify-end rounded bg-red-500/80 pr-1.5"
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[10px] font-semibold tabular-nums text-white">
                        {formatCurrency(r.amount, { compact: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* ---- Recommended action ---- */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 dark:border-teal-900 dark:bg-teal-950/30">
        <div className="flex items-center gap-2">
          <ArrowRight className="size-4 shrink-0 text-teal-600 dark:text-teal-400" />
          <p className="text-[13px] font-semibold text-foreground">{d.action.text}</p>
          {d.action.roi !== null && d.action.roi > 0 && (
            <span className="ml-auto shrink-0 rounded-md bg-teal-600 px-2 py-0.5 text-xs font-bold tabular-nums text-white">
              ROI {formatRoi(d.action.roi)}
            </span>
          )}
        </div>
        {d.action.protectedRevenue > 0 && (
          <>
            <p className="mt-1 pl-6 text-[11px] text-muted-foreground">
              {t(language, "dash.protected")}{" "}
              <span className="font-semibold text-teal-700 dark:text-teal-300">
                {formatCurrency(d.action.protectedRevenue)}
              </span>
            </p>
            {d.revenueAtRisk > 0 && (
              <div className="mt-1.5 ml-6 h-1.5 overflow-hidden rounded-full bg-teal-100 dark:bg-teal-900/50">
                <div
                  className="h-full rounded-full bg-teal-600"
                  style={{
                    width: `${Math.max(
                      4,
                      Math.min(100, (d.action.protectedRevenue / d.revenueAtRisk) * 100)
                    )}%`,
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
  sub,
  valueClass,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  valueClass?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5">
        <span className={cn("flex size-5 items-center justify-center rounded-md", accent)}>{icon}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className={cn("mt-1 text-lg font-bold leading-none tabular-nums", valueClass)}>
        {value}
        {suffix && <span className="text-xs font-medium text-muted-foreground">{suffix}</span>}
      </p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
