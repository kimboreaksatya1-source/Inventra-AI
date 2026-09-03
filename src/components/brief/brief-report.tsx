"use client";

import Link from "next/link";
import { Activity, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { DataQualityBanner, DataRequiredState, dataAvailability } from "@/components/shared/data-quality";
import { formatCurrency } from "@/lib/format";
import { PILOT_IMPACT } from "@/lib/pilot-impact";
import { useBrief } from "@/lib/queries";
import { BriefKpis } from "./brief-kpis";
import { BriefCharts } from "./brief-charts";
import { CriticalRisks } from "./critical-risks";
import { RevenueOpportunities } from "./revenue-opportunities";
import { RecommendedActions } from "./recommended-actions";
import { ExportPdfButton } from "./export-pdf-button";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}

export function BriefReport() {
  const { data, isLoading, isError, error, refetch, isFetching } = useBrief();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Could not generate the brief"
        description={error instanceof Error ? error.message : "Please try again."}
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (!data?.hasData || !data.brief || !data.analysis) {
    return (
      <EmptyState
        icon={FileText}
        tone="teal"
        title="No brief yet"
        description="Import your business data and Inventra will prepare an executive brief for you."
        action={
          <Button asChild>
            <Link href="/upload">Upload data</Link>
          </Button>
        }
      />
    );
  }

  if (!dataAvailability(data.analysis.dataQuality, "brief").available) {
    return <DataRequiredState dq={data.analysis.dataQuality} feature="brief" />;
  }

  const { brief, analysis } = data;
  const s = analysis.summary;
  const generated = new Date(brief.generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const headline =
    s.criticalCount > 0
      ? `${s.criticalCount} product${s.criticalCount === 1 ? "" : "s"} need attention — ${formatCurrency(
          s.totalRevenueAtRisk
        )} of revenue is at risk this month.`
      : `Inventory is balanced. ${formatCurrency(s.totalRevenueAtRisk)} of revenue is exposed, nothing critical.`;

  const recCount = s.reorderCount + s.reduceCount + s.opportunityCount;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Compact header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-teal-600">
            Business Brief · {generated}
          </p>
          <p className="mt-1 max-w-2xl text-lg font-semibold leading-snug tracking-tight sm:text-xl">
            {headline}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="size-3 text-teal-600" />
            Inventra analyzed {s.totalProducts} products
            {recCount > 0 ? ` and generated ${recCount} recommendations` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <Button variant="ghost" size="icon" onClick={() => refetch()} aria-label="Regenerate">
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          </Button>
          <ExportPdfButton brief={brief} business={analysis.business} products={analysis.products} />
        </div>
      </div>

      <DataQualityBanner dq={analysis.dataQuality} />

      <BriefKpis brief={brief} analysis={analysis} />

      <div className="space-y-2.5">
        <SectionLabel>Critical risks</SectionLabel>
        <CriticalRisks risks={brief.criticalRisks} />
      </div>

      <div className="space-y-2.5">
        <SectionLabel>Where revenue is at risk</SectionLabel>
        <BriefCharts analysis={analysis} />
      </div>

      <div className="space-y-2.5">
        <SectionLabel>Revenue opportunities</SectionLabel>
        <RevenueOpportunities items={brief.revenueOpportunities} />
      </div>

      <div className="space-y-2.5">
        <SectionLabel>Do these first</SectionLabel>
        <RecommendedActions actions={brief.recommendedActions} />
      </div>

      {PILOT_IMPACT && (
        <p className="border-t border-border pt-4 text-center text-xs text-muted-foreground">
          Inventra has analyzed{" "}
          <span className="font-semibold text-foreground">{PILOT_IMPACT.businesses}</span>{" "}
          {PILOT_IMPACT.businesses === 1 ? "business" : "businesses"} ·{" "}
          <span className="font-semibold text-foreground">
            {formatCurrency(PILOT_IMPACT.revenueProtectedUsd)}
          </span>{" "}
          of revenue protected to date
        </p>
      )}
    </div>
  );
}
