"use client";

import { CalendarClock, Percent, RotateCcw, Save, Sparkles, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DEFAULT_PARAMS, PARAM_BOUNDS } from "@/lib/simulator";
import type { ScenarioParams } from "@/lib/types";
import { SimSlider } from "./sim-slider";

const PRESETS: { label: string; params: Partial<ScenarioParams> }[] = [
  { label: "Peak season", params: { seasonalMultiplier: 1.6, demandGrowthPct: 15 } },
  { label: "Supplier delay", params: { supplierDelayDays: 10 } },
  { label: "Promo push", params: { salesIncreasePct: 30, reorderQuantity: 120 } },
];

export function ScenarioControls({
  params,
  onChange,
  onSave,
  canSave,
}: {
  params: ScenarioParams;
  onChange: (next: ScenarioParams) => void;
  onSave: () => void;
  canSave: boolean;
}) {
  const set = <K extends keyof ScenarioParams>(key: K, value: number) =>
    onChange({ ...params, [key]: value });

  const isDefault =
    JSON.stringify(params) === JSON.stringify(DEFAULT_PARAMS);

  return (
    <Card className="gap-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Adjust the scenario</h2>
        <button
          onClick={() => onChange(DEFAULT_PARAMS)}
          disabled={isDefault}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <RotateCcw className="size-3" />
          Reset
        </button>
      </div>

      <div className="space-y-5">
        <SimSlider
          label="Demand Growth"
          icon={TrendingUp}
          value={params.demandGrowthPct}
          {...PARAM_BOUNDS.demandGrowthPct}
          format={(v) => `${v > 0 ? "+" : ""}${v}%`}
          onChange={(v) => set("demandGrowthPct", v)}
        />
        <SimSlider
          label="Sales Increase"
          icon={Percent}
          value={params.salesIncreasePct}
          {...PARAM_BOUNDS.salesIncreasePct}
          format={(v) => `+${v}%`}
          onChange={(v) => set("salesIncreasePct", v)}
        />
        <SimSlider
          label="Seasonal Demand"
          icon={CalendarClock}
          value={params.seasonalMultiplier}
          {...PARAM_BOUNDS.seasonalMultiplier}
          format={(v) => `×${v.toFixed(2)}`}
          onChange={(v) => set("seasonalMultiplier", Math.round(v * 100) / 100)}
        />
        <SimSlider
          label="Supplier Delay"
          icon={Timer}
          value={params.supplierDelayDays}
          {...PARAM_BOUNDS.supplierDelayDays}
          format={(v) => `${v} ${v === 1 ? "day" : "days"}`}
          onChange={(v) => set("supplierDelayDays", v)}
        />
        <SimSlider
          label="Reorder Quantity"
          icon={Sparkles}
          value={params.reorderQuantity}
          {...PARAM_BOUNDS.reorderQuantity}
          format={(v) => `${v} units`}
          onChange={(v) => set("reorderQuantity", v)}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Quick scenarios
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => onChange({ ...DEFAULT_PARAMS, ...p.params })}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 dark:hover:border-teal-700 dark:hover:bg-teal-950/40"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Button variant="outline" onClick={onSave} disabled={!canSave} className="w-full">
        <Save className="size-4" />
        Save scenario
      </Button>
    </Card>
  );
}
