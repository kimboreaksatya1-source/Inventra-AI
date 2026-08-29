"use client";

import { useMemo } from "react";
import { Bell, ShieldAlert, CheckCircle2, Sparkles } from "lucide-react";
import { SectionHeading } from "@/components/shared/section-heading";
import { NoAlertsEmptyState } from "@/components/shared/empty-state";
import { PriorityBadge, ConfidenceMeter } from "@/components/shared/badges";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFetch } from "@/hooks/use-fetch";
import { formatCurrency, daysUntilLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AlertItem, Priority } from "@/lib/types";
import { toast } from "sonner";

interface AlertsResponse {
  seeded: boolean;
  alerts: AlertItem[];
}

const groupOrder: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const groupMeta: Record<Priority, { title: string; desc: string; cls: string }> = {
  CRITICAL: {
    title: "Critical",
    desc: "Will run out within 48 hours.",
    cls: "border-red-200 bg-red-50/40 dark:border-red-900 dark:bg-red-950/20",
  },
  HIGH: {
    title: "High",
    desc: "Will run out within 5 days.",
    cls: "border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20",
  },
  MEDIUM: {
    title: "Medium",
    desc: "Demand increasing rapidly.",
    cls: "border-teal-200 bg-teal-50/40 dark:border-teal-900 dark:bg-teal-950/20",
  },
  LOW: {
    title: "Low",
    desc: "Slow-moving inventory.",
    cls: "border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/20",
  },
};

export function AlertsView() {
  const { data, loading } = useFetch<AlertsResponse>("/api/alerts");

  const grouped = useMemo(() => {
    const map: Record<Priority, AlertItem[]> = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    for (const a of data?.alerts ?? []) map[a.priority].push(a);
    return map;
  }, [data]);

  const total = data?.alerts?.length ?? 0;
  const totalImpact = (data?.alerts ?? []).reduce((a, b) => a + b.financialImpact, 0);

  if (loading || !data) return <AlertsSkeleton />;
  if (!data.seeded) return <AlertsSkeleton />;
  if (total === 0) {
    return (
      <div className="space-y-6 animate-in-fade">
        <SectionHeading
          title="Alerts"
          description="Critical inventory notifications — prioritised by revenue impact."
          icon={Bell}
        />
        <NoAlertsEmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in-fade">
      <SectionHeading
        title="Alerts"
        description="Critical inventory notifications — prioritised by revenue impact."
        icon={Bell}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              <ShieldAlert className="size-3" />
              {total} active
            </Badge>
            <Badge variant="outline" className="text-muted-foreground">
              {formatCurrency(totalImpact)} impact
            </Badge>
          </div>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {groupOrder.map((p) => (
          <Card key={p} className={cn("p-4 border", groupMeta[p].cls)}>
            <div className="flex items-center justify-between">
              <PriorityBadge priority={p} />
              <span className="text-xl font-bold tabular-nums">{grouped[p].length}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{groupMeta[p].desc}</p>
          </Card>
        ))}
      </div>

      {/* Alert lists by group */}
      {groupOrder.map((p) => {
        const items = grouped[p];
        if (items.length === 0) return null;
        const meta = groupMeta[p];
        return (
          <div key={p} className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{meta.title}</h3>
              <span className="text-xs text-muted-foreground">· {meta.desc}</span>
            </div>
            <div className="space-y-2">
              {items.map((a) => (
                <AlertRow key={a.id} alert={a} />
              ))}
            </div>
          </div>
        );
      })}

      <Card className="flex flex-col items-start gap-2 border-0 bg-gradient-to-br from-teal-700 to-teal-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="size-5 text-teal-200" />
          <div>
            <p className="text-sm font-semibold">All caught up for today?</p>
            <p className="text-xs text-teal-200/80">Mark alerts as resolved once you&apos;ve acted on them.</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
          onClick={() => toast.success("Alerts marked as reviewed")}
        >
          <Sparkles className="size-4" />
          Mark all reviewed
        </Button>
      </Card>
    </div>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  return (
    <Card className="p-4 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Bell className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{alert.productName}</p>
              <PriorityBadge priority={alert.priority} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{alert.problem}</p>
            <p className="mt-1.5 text-sm text-foreground">
              <span className="font-medium">Action:</span> {alert.recommendedAction}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:items-end sm:gap-1">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Financial impact</p>
            <p className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
              {alert.financialImpact > 0 ? "-" : ""}
              {formatCurrency(alert.financialImpact)}
            </p>
          </div>
          <div className="min-w-[120px]">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Confidence</p>
            <div className="mt-1">
              <ConfidenceMeter value={alert.confidenceScore} size="sm" />
            </div>
          </div>
        </div>
      </div>
      {Number.isFinite(alert.daysRemaining) && alert.daysRemaining > 0 && (
        <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Time to stockout:</span>{" "}
          {daysUntilLabel(alert.daysRemaining)}
        </div>
      )}
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-56 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        ))}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
      ))}
    </div>
  );
}
