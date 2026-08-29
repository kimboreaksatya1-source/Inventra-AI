"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionStatus, ResolvedAction } from "@/lib/types";
import { ResolvedRow } from "./action-card";

export function CompletedList({
  resolved,
  onRestore,
}: {
  resolved: ResolvedAction[];
  onRestore: (r: ResolvedAction) => void;
}) {
  const [open, setOpen] = useState(false);
  if (resolved.length === 0) return null;

  return (
    <div className="rounded-xl border border-border">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span>
          Completed &amp; dismissed{" "}
          <span className="text-muted-foreground">({resolved.length})</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-border p-3">
          {resolved.map((r) => (
            <ResolvedRow
              key={r.key}
              recommendation={r.recommendation ?? r.key}
              status={r.status as ActionStatus}
              impactValue={r.impactValue}
              category={r.category}
              onRestore={() => onRestore(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
