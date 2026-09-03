"use client";

import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { priorityConfig } from "@/components/shared/badges";
import type { ActionCategory, Priority } from "@/lib/types";

export type SortKey = "priority" | "revenue" | "risk" | "cover" | "margin";
export type TypeFilter = ActionCategory | "all";
/** "all" + the priorities + the Completed view (shared with the quick tabs). */
export type ActionView = "all" | Priority | "completed";

export interface ActionUiState {
  view: ActionView;
  type: TypeFilter;
  search: string;
  sort: SortKey;
}

export const DEFAULT_UI: ActionUiState = {
  view: "all",
  type: "all",
  search: "",
  sort: "priority",
};

export function isFiltered(s: ActionUiState): boolean {
  return (
    s.view !== "all" ||
    s.type !== "all" ||
    s.search.trim() !== "" ||
    s.sort !== "priority"
  );
}

const SORT_LABEL: Record<SortKey, string> = {
  priority: "Priority",
  revenue: "Highest Revenue Protected",
  risk: "Highest Risk",
  cover: "Days of Cover",
  margin: "Margin Impact",
};

const CATEGORY_LABEL: Record<ActionCategory, string> = {
  reorder: "Reorder",
  opportunity: "Opportunity",
  cashflow: "Cash Flow",
  risk: "Revenue Risk",
  scenario: "Forecast",
};

const PRIORITIES: Priority[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];

export function ActionFilters({
  value,
  onChange,
  availableTypes,
}: {
  value: ActionUiState;
  onChange: (next: ActionUiState) => void;
  /** Categories that actually have open actions right now. */
  availableTypes: ActionCategory[];
}) {
  const set = <K extends keyof ActionUiState>(k: K, v: ActionUiState[K]) =>
    onChange({ ...value, [k]: v });

  // The priority dropdown and the quick tabs share `view`. "completed" is only
  // reachable from the tabs; here it reads as "all priorities".
  const priorityValue: string =
    value.view === "completed" || value.view === "all" ? "all" : value.view;

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search SKU, product or category"
            value={value.search}
            onChange={(e) => set("search", e.target.value)}
            className="pl-9"
            aria-label="Search actions"
          />
        </div>

        <Select
          value={priorityValue}
          onValueChange={(v) => set("view", v as ActionView)}
        >
          <SelectTrigger className="w-[8.5rem]" aria-label="Filter by priority">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {priorityConfig[p].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.type} onValueChange={(v) => set("type", v as TypeFilter)}>
          <SelectTrigger className="w-[8.5rem]" aria-label="Filter by action type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {availableTypes.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.sort} onValueChange={(v) => set("sort", v as SortKey)}>
          <SelectTrigger className="w-[11.5rem]" aria-label="Sort actions">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          disabled={!isFiltered(value)}
          onClick={() => onChange(DEFAULT_UI)}
          className="ml-auto text-muted-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset filters
        </Button>
      </div>
    </div>
  );
}
