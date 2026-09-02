"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FlaskConical, GitCompare, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DataRequiredState, dataAvailability } from "@/components/shared/data-quality";
import { useAnalysis } from "@/lib/queries";
import { useScenarios, useScenarioExplanation } from "@/lib/simulator-queries";
import {
  DEFAULT_PARAMS,
  isDefaultParams,
  simulateScenario,
} from "@/lib/simulator";
import type { AnalysisInput } from "@/lib/analysis";
import type { SavedScenario, ScenarioParams } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ScenarioControls } from "./scenario-controls";
import { ImpactCards } from "./impact-cards";
import { BeforeAfter } from "./before-after";
import { RiskIndicators } from "./risk-indicators";
import { RecommendedAction } from "./recommended-action";
import { AiExplanation } from "./ai-explanation";
import { SaveScenarioDialog } from "./save-scenario-dialog";
import { ScenarioList } from "./scenario-list";
import { CompareView } from "./compare-view";

type Tab = "simulate" | "saved" | "compare";

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

export function SimulatorClient() {
  const { data, isLoading } = useAnalysis();
  const { data: savedScenarios } = useScenarios();

  const [tab, setTab] = useState<Tab>("simulate");
  const [params, setParams] = useState<ScenarioParams>(DEFAULT_PARAMS);
  const [saveOpen, setSaveOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const products: AnalysisInput[] = useMemo(
    () =>
      (data?.analysis?.products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        stock: p.stock,
        dailySales: p.dailySales,
        sellingPrice: p.sellingPrice,
        costPrice: p.costPrice,
      })),
    [data]
  );

  const result = useMemo(
    () => (products.length ? simulateScenario(products, params) : null),
    [products, params]
  );

  const debouncedParams = useDebounced(params, 700);
  const signature = JSON.stringify(debouncedParams);
  const explainEnabled = !isDefaultParams(debouncedParams) && products.length > 0;
  const explanation = useScenarioExplanation(debouncedParams, signature, explainEnabled);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!data?.hasData || products.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        tone="teal"
        title="No business data to simulate"
        description="Import your products first — the simulator runs every what-if against your real numbers."
        action={
          <Button asChild>
            <Link href="/upload">Import data</Link>
          </Button>
        }
      />
    );
  }

  if (!dataAvailability(data.analysis?.dataQuality, "simulator").available) {
    return <DataRequiredState dq={data.analysis?.dataQuality} feature="simulator" />;
  }

  const selectedScenarios = (savedScenarios ?? []).filter((s) => selectedIds.includes(s.id));

  function loadScenario(s: SavedScenario) {
    setParams({ ...DEFAULT_PARAMS, ...s.params });
    setTab("simulate");
  }

  function toggleSelect(id: string) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scenario Simulator</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Test a decision before you make it. Every what-if runs against your real inventory.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
          {(
            [
              { id: "simulate", label: "Simulate", icon: Play },
              { id: "saved", label: "Saved", icon: FlaskConical },
              { id: "compare", label: "Compare", icon: GitCompare },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                tab === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "simulate" && result && (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="lg:sticky lg:top-20 lg:self-start">
            <ScenarioControls
              params={params}
              onChange={setParams}
              onSave={() => setSaveOpen(true)}
              canSave={!isDefaultParams(params)}
            />
          </div>

          <div className="space-y-5">
            <ImpactCards result={result} />
            <RecommendedAction
              action={result.recommendedAction}
              horizonDays={result.horizonDays}
              onApplyReorder={(qty) => setParams((p) => ({ ...p, reorderQuantity: qty }))}
            />
            <div className="grid gap-5 xl:grid-cols-2">
              <BeforeAfter result={result} />
              <RiskIndicators result={result} />
            </div>
            <AiExplanation
              data={explanation.data}
              isFetching={explanation.isFetching}
              isError={explanation.isError}
              idle={!explainEnabled}
              onRegenerate={() => explanation.refetch()}
            />
          </div>
        </div>
      )}

      {tab === "saved" && (
        <ScenarioList
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onLoad={loadScenario}
          onCompare={() => setTab("compare")}
        />
      )}

      {tab === "compare" &&
        (selectedScenarios.length >= 2 ? (
          <CompareView scenarios={selectedScenarios} onBack={() => setTab("saved")} />
        ) : (
          <EmptyState
            icon={GitCompare}
            title="Pick at least two scenarios to compare"
            description="Go to Saved, tick two or three scenarios, then hit Compare."
            action={<Button onClick={() => setTab("saved")}>Go to Saved</Button>}
          />
        ))}

      {result && (
        <SaveScenarioDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          params={params}
          result={result}
        />
      )}
    </div>
  );
}
