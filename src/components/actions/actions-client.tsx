"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DataQualityBanner, DataRequiredState, dataAvailability } from "@/components/shared/data-quality";
import { useActionCenter, useUpdateAction } from "@/lib/queries/actions";
import type {
  ActionCategory,
  ActionStatus,
  BusinessAction,
  Priority,
  ResolvedAction,
} from "@/lib/types";
import { ActionStats } from "./action-stats";
import { AiBriefing } from "./ai-briefing";
import { ActionCard, ResolvedRow } from "./action-card";
import { CompletedList } from "./completed-list";
import {
  ActionFilters,
  DEFAULT_UI,
  type ActionUiState,
  type ActionView,
  type SortKey,
} from "./action-filters";
import { QuickTabs } from "./quick-tabs";

const ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const VERB: Record<ActionStatus, string> = {
  completed: "Marked complete",
  dismissed: "Dismissed",
  saved: "Saved",
  open: "Restored",
};

/** Days of cover parsed from the card's reason bullets; unknown sorts last. */
function coverDays(a: BusinessAction): number {
  for (const r of a.reasons ?? []) {
    const m = r.match(/out in ~(\d+)\s*days?/i);
    if (m) return Number(m[1]);
    if (/comfortable cover/i.test(r)) return 900;
  }
  return 999;
}

const isRiskCategory = (c: ActionCategory) => c === "reorder" || c === "cashflow";

function searchBlob(a: BusinessAction): string {
  return `${a.recommendation} ${a.reasons.join(" ")} ${a.category} ${a.expectedImpact} ${a.triggeredBy}`.toLowerCase();
}

function comparator(sort: SortKey) {
  return (a: BusinessAction, b: BusinessAction) => {
    // Saved items always float to the top, whatever the sort.
    if ((a.status === "saved") !== (b.status === "saved")) return a.status === "saved" ? -1 : 1;
    switch (sort) {
      case "revenue":
        return b.impactValue - a.impactValue;
      case "margin":
        return (b.marginImpact ?? 0) - (a.marginImpact ?? 0);
      case "cover":
        return coverDays(a) - coverDays(b) || RANK[a.priority] - RANK[b.priority];
      case "risk": {
        const ra = isRiskCategory(a.category) ? 0 : 1;
        const rb = isRiskCategory(b.category) ? 0 : 1;
        return ra - rb || RANK[a.priority] - RANK[b.priority] || b.impactValue - a.impactValue;
      }
      case "priority":
      default:
        return RANK[a.priority] - RANK[b.priority] || b.impactValue - a.impactValue;
    }
  };
}

export function ActionsClient() {
  const { data, isLoading, isError, error, refetch } = useActionCenter();
  const update = useUpdateAction();
  const [optimistic, setOptimistic] = useState<Record<string, ActionStatus>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [ui, setUi] = useState<ActionUiState>(DEFAULT_UI);

  /** Every still-open action, flattened, with the optimistic status applied. */
  const openActions = useMemo(() => {
    const out: BusinessAction[] = [];
    if (!data?.groups) return out;
    for (const p of ORDER) {
      for (const a of data.groups[p]) {
        const ov = optimistic[a.key];
        if (ov === "completed" || ov === "dismissed") continue;
        out.push(
          ov === "saved"
            ? { ...a, status: "saved" }
            : ov === "open"
            ? { ...a, status: "open" }
            : a
        );
      }
    }
    return out;
  }, [data, optimistic]);

  const availableTypes = useMemo(
    () => [...new Set(openActions.map((a) => a.category))].sort() as ActionCategory[],
    [openActions]
  );

  /** Filtered by type + search only — the pool the tab counts are taken from. */
  const pool = useMemo(() => {
    const q = ui.search.trim().toLowerCase();
    return openActions.filter((a) => {
      if (ui.type !== "all" && a.category !== ui.type) return false;
      if (q && !searchBlob(a).includes(q)) return false;
      return true;
    });
  }, [openActions, ui.type, ui.search]);

  const counts = useMemo<Record<ActionView, number>>(
    () => ({
      all: pool.length,
      CRITICAL: pool.filter((a) => a.priority === "CRITICAL").length,
      HIGH: pool.filter((a) => a.priority === "HIGH").length,
      MEDIUM: pool.filter((a) => a.priority === "MEDIUM").length,
      LOW: pool.filter((a) => a.priority === "LOW").length,
      completed: data?.resolved.length ?? 0,
    }),
    [pool, data?.resolved]
  );

  const visible = useMemo(() => {
    const list =
      ui.view === "all" || ui.view === "completed"
        ? pool
        : pool.filter((a) => a.priority === ui.view);
    return [...list].sort(comparator(ui.sort));
  }, [pool, ui.view, ui.sort]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Couldn't build your action center"
        description={error instanceof Error ? error.message : "Please try again."}
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.hasData) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        tone="teal"
        title="No actions yet"
        description="Import your business data and Inventra will build your prioritized action list."
        action={
          <Button asChild>
            <Link href="/upload">Import data</Link>
          </Button>
        }
      />
    );
  }

  async function setStatus(action: BusinessAction, status: ActionStatus) {
    setOptimistic((o) => ({ ...o, [action.key]: status }));
    setPending((s) => new Set(s).add(action.key));
    try {
      await update.mutateAsync({ action, status });
      toast.success(`${VERB[status]}: ${action.recommendation}`);
    } catch (e) {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[action.key];
        return next;
      });
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(action.key);
        return next;
      });
    }
  }

  async function restore(r: ResolvedAction) {
    setOptimistic((o) => ({ ...o, [r.key]: "open" }));
    try {
      await update.mutateAsync({
        action: { key: r.key, impactValue: r.impactValue, category: r.category },
        status: "open",
      });
      toast.success("Restored to your list");
    } catch {
      toast.error("Could not restore");
    }
  }

  if (!dataAvailability(data.dataQuality, "brief").available) {
    return <DataRequiredState dq={data.dataQuality} feature="brief" />;
  }

  const allClear = openActions.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Action Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything the analysis, revenue-risk, brief and simulator engines recommend — ranked, in
          one list.
        </p>
      </div>

      <ActionFilters value={ui} onChange={setUi} availableTypes={availableTypes} />

      <DataQualityBanner dq={data.dataQuality} />

      <ActionStats totals={data.totals} />

      <AiBriefing
        briefing={data.briefing}
        source={data.briefingSource}
        generatedAt={data.generatedAt}
      />

      <div className="space-y-4">
        <QuickTabs value={ui.view} onChange={(v) => setUi((s) => ({ ...s, view: v }))} counts={counts} />

        {ui.view === "completed" ? (
          data.resolved.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="Nothing completed yet"
              description="Actions you mark complete or dismiss will appear here."
            />
          ) : (
            <div className="space-y-2">
              {data.resolved.map((r) => (
                <ResolvedRow
                  key={r.key}
                  recommendation={r.recommendation ?? r.key}
                  status={r.status}
                  impactValue={r.impactValue}
                  category={r.category}
                  onRestore={() => restore(r)}
                />
              ))}
            </div>
          )
        ) : allClear ? (
          <EmptyState
            icon={PartyPopper}
            tone="success"
            title="You're all caught up"
            description="No open actions right now. Check back after your next data import or when demand shifts."
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="No actions match your filters"
            description="Try a different priority, type or search term."
            action={
              <Button variant="outline" onClick={() => setUi(DEFAULT_UI)}>
                Reset filters
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {visible.map((a) => (
              <ActionCard
                key={a.key}
                action={a}
                pending={pending.has(a.key)}
                onSetStatus={(status) => setStatus(a, status)}
              />
            ))}
          </div>
        )}
      </div>

      {ui.view !== "completed" && (
        <CompletedList resolved={data.resolved} onRestore={restore} />
      )}
    </div>
  );
}
