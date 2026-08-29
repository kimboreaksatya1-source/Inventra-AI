"use client";

import { priorityConfig } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import type { ActionStatus, BusinessAction, Priority } from "@/lib/types";
import { ActionCard } from "./action-card";

export function ActionGroup({
  priority,
  actions,
  pendingKeys,
  onSetStatus,
}: {
  priority: Priority;
  actions: BusinessAction[];
  pendingKeys: Set<string>;
  onSetStatus: (action: BusinessAction, status: ActionStatus) => void;
}) {
  const cfg = priorityConfig[priority];

  if (actions.length === 0) {
    return (
      <div className="flex items-center gap-2 py-1.5 text-xs text-muted-foreground">
        <span className={cn("size-1.5 rounded-full", cfg.dot)} />
        No {cfg.label.toLowerCase()} actions
      </div>
    );
  }

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className={cn("size-2 rounded-full", cfg.dot)} />
        <h2 className="text-sm font-semibold">{cfg.label}</h2>
        <span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
          {actions.length}
        </span>
      </div>
      <div className="space-y-3">
        {actions.map((a) => (
          <ActionCard
            key={a.key}
            action={a}
            pending={pendingKeys.has(a.key)}
            onSetStatus={(status) => onSetStatus(a, status)}
          />
        ))}
      </div>
    </section>
  );
}
