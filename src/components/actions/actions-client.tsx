"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardCheck, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DataQualityBanner, DataRequiredState, dataAvailability } from "@/components/shared/data-quality";
import { useActionCenter, useUpdateAction } from "@/lib/actions-queries";
import type { ActionStatus, BusinessAction, Priority, ResolvedAction } from "@/lib/types";
import { ActionStats } from "./action-stats";
import { AiBriefing } from "./ai-briefing";
import { ActionGroup } from "./action-group";
import { CompletedList } from "./completed-list";

const ORDER: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

const VERB: Record<ActionStatus, string> = {
  completed: "Marked complete",
  dismissed: "Dismissed",
  saved: "Saved",
  open: "Restored",
};

export function ActionsClient() {
  const { data, isLoading, isError, error, refetch } = useActionCenter();
  const update = useUpdateAction();
  const [optimistic, setOptimistic] = useState<Record<string, ActionStatus>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const g: Record<Priority, BusinessAction[]> = { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] };
    if (!data?.groups) return g;
    for (const p of ORDER) {
      for (const a of data.groups[p]) {
        const ov = optimistic[a.key];
        if (ov === "completed" || ov === "dismissed") continue;
        g[p].push(ov === "saved" ? { ...a, status: "saved" } : ov === "open" ? { ...a, status: "open" } : a);
      }
      g[p].sort((a, b) => {
        if ((a.status === "saved") !== (b.status === "saved")) return a.status === "saved" ? -1 : 1;
        return b.impactValue - a.impactValue || b.confidence - a.confidence;
      });
    }
    return g;
  }, [data, optimistic]);

  if (isLoading) {
    return (
      <div className="space-y-6">
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

  const totalOpen = ORDER.reduce((s, p) => s + groups[p].length, 0);
  const allClear = totalOpen === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Action Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything the analysis, revenue-risk, brief and simulator engines recommend — ranked, in
          one list.
        </p>
      </div>

      <DataQualityBanner dq={data.dataQuality} />

      <ActionStats totals={data.totals} />

      <AiBriefing
        briefing={data.briefing}
        source={data.briefingSource}
        generatedAt={data.generatedAt}
      />

      {allClear ? (
        <EmptyState
          icon={PartyPopper}
          tone="success"
          title="You're all caught up"
          description="No open actions right now. Check back after your next data import or when demand shifts."
        />
      ) : (
        <div className="space-y-7">
          {ORDER.map((p) => (
            <ActionGroup
              key={p}
              priority={p}
              actions={groups[p]}
              pendingKeys={pending}
              onSetStatus={setStatus}
            />
          ))}
        </div>
      )}

      <CompletedList resolved={data.resolved} onRestore={restore} />
    </div>
  );
}
