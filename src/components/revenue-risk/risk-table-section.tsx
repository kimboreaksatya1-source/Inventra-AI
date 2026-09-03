"use client";

import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAnalysis } from "@/lib/queries";
import { RiskTable } from "./risk-table";

/**
 * The full product table, collapsed by default so the Revenue Risk page opens
 * as a visual dashboard. Expanding reveals <RiskTable> unchanged — same
 * filtering, sorting and data.
 */
export function RiskTableSection() {
  const { data } = useAnalysis();
  const count = data?.analysis?.products?.length ?? 0;
  if (!data?.hasData || count === 0) return null;

  return (
    <Collapsible className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium hover:bg-muted/50">
        <span>See all products ({count})</span>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border p-4">
        <RiskTable />
      </CollapsibleContent>
    </Collapsible>
  );
}
