"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportSummaryBar, ImportDetails } from "./import-audit";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/catalog/knowledge-base";
import {
  RECOGNITION_METHOD_LABEL,
  RECOGNITION_SOURCE_LABEL,
} from "@/lib/recognition-labels";
import type { RecognitionMethod, ReviewProduct } from "@/lib/types";
import type { ImportAudit } from "@/lib/types";

const CONF_CLS = {
  High: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  Medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  Low: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
} as const;

export function RecognitionReview({
  products,
  aiUsed,
  audit,
  onChange,
  onImport,
  onBack,
  busy,
}: {
  products: ReviewProduct[];
  aiUsed: boolean;
  audit: ImportAudit | null;
  onChange: (next: ReviewProduct[]) => void;
  onImport: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const counts = useMemo(() => {
    const keep = products.filter((p) => p.status !== "ignored");
    const autoApproved = keep.filter((p) => !p.evidence?.reviewRequired).length;
    const review = keep.filter((p) => p.evidence?.reviewRequired && p.status === "pending").length;
    const ignored = products.filter((p) => p.status === "ignored").length;
    const importing = keep.length;
    const noSales = keep.filter((p) => !(p.dailySales > 0)).length;
    const noCost = keep.filter((p) => !(p.costPrice > 0)).length;
    return { autoApproved, review, ignored, importing, noSales, noCost };
  }, [products]);

  function patch(i: number, patch: Partial<ReviewProduct>) {
    onChange(products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function approveAllPending() {
    onChange(
      products.map((p) => (p.status === "pending" ? { ...p, status: "approved" } : p))
    );
  }

  return (
    <div className="space-y-5">
      {audit && (
        <div className="space-y-3">
          <ImportSummaryBar audit={audit} />
          <ImportDetails audit={audit} defaultOpen={audit.skippedRows > 0} />
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-teal-600" />
          Inventra recognised {products.length} products
          {aiUsed && <span className="text-xs font-normal text-muted-foreground">· AI helped with the tricky ones</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Chip tone="ok">{counts.autoApproved} auto-approved</Chip>
          {counts.review > 0 && <Chip tone="warn">{counts.review} review required</Chip>}
          {counts.ignored > 0 && <Chip tone="muted">{counts.ignored} ignored</Chip>}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Auto-approved = an exact name / alias / barcode match. Everything else — AI suggestions,
          partial matches, unknown products, possible variants — is sent to review.
        </p>
      </div>

      {counts.review > 0 && (
        <button
          onClick={approveAllPending}
          className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          I've checked them — approve all {counts.review} review items
        </button>
      )}

      {(counts.noSales === counts.importing || counts.noCost > 0) && counts.importing > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <div className="space-y-1">
            {counts.noSales === counts.importing && (
              <p>
                None of these products have a daily-sales figure. They import fine, but
                Procurement, Revenue-at-Risk, the Brief, the Simulator and Cash-Flow risk will be
                unavailable — Inventra will not estimate sales.
              </p>
            )}
            {counts.noCost > 0 && (
              <p>
                {counts.noCost} of {counts.importing} products have no cost price. Their inventory
                value, margin and purchase cost show as $0 — never an assumed margin.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {products.map((p, i) => (
          <ProductRow key={i} product={p} onPatch={(x) => patch(i, x)} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={onImport} disabled={busy || counts.importing === 0}>
          {busy ? "Importing…" : `Import ${counts.importing} product${counts.importing === 1 ? "" : "s"}`}
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          Back to columns
        </Button>
      </div>
    </div>
  );
}

function ProductRow({
  product,
  onPatch,
}: {
  product: ReviewProduct;
  onPatch: (p: Partial<ReviewProduct>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ev = product.evidence;
  const reviewNeeded = !!ev?.reviewRequired;
  const ignored = product.status === "ignored";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        ignored
          ? "border-border bg-muted/40 opacity-60"
          : reviewNeeded
          ? "border-amber-300 dark:border-amber-800"
          : "border-border"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {ignored ? (
            <X className="size-4 text-muted-foreground" />
          ) : reviewNeeded ? (
            <AlertTriangle className="size-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="size-4 text-emerald-500" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{product.originalName}</p>
          {editing ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input
                value={product.canonicalName}
                onChange={(e) => onPatch({ canonicalName: e.target.value })}
                placeholder="Canonical (English) name"
              />
              <Input
                value={product.brand}
                onChange={(e) => onPatch({ brand: e.target.value })}
                placeholder="Brand"
              />
              <Select value={product.category} onValueChange={(v) => onPatch({ category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground sm:col-span-2">
                Your uploaded name stays as “{product.originalName}”. The canonical name is only used
                internally for matching.
              </p>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {product.sku} · {product.brand || "no brand"} · {product.category}
              {product.canonicalName &&
                product.canonicalName.toLowerCase() !== product.originalName.toLowerCase() && (
                  <span className="text-muted-foreground/70"> · canonical: {product.canonicalName}</span>
                )}
              {product.mergedCount && product.mergedCount > 1 && (
                <span className="text-teal-600 dark:text-teal-400"> · merged {product.mergedCount} rows</span>
              )}
            </p>
          )}
          {ev && <EvidencePanel ev={ev} status={product.status} />}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {!ignored && (
            <button
              onClick={() => onPatch({ status: "approved" })}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                product.status === "approved"
                  ? "bg-teal-600 text-white"
                  : "border border-border hover:bg-muted"
              )}
            >
              <Check className="size-3.5" />
              {product.status === "approved" ? "Approved" : "Approve"}
            </button>
          )}
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setEditing((e) => !e);
                if (!editing && product.status === "pending") onPatch({ status: "approved", source: "manual" });
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-muted"
            >
              <Pencil className="size-3.5" />
              {editing ? "Done" : "Edit"}
            </button>
            <button
              onClick={() => onPatch({ status: ignored ? "pending" : "ignored" })}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {ignored ? "Undo" : <><X className="size-3.5" />Ignore</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvidencePanel({
  ev,
  status,
}: {
  ev: NonNullable<ReviewProduct["evidence"]>;
  status: ReviewProduct["status"];
}) {
  const method = RECOGNITION_METHOD_LABEL[ev.method as RecognitionMethod] ?? ev.method;
  const statusLabel =
    status === "approved"
      ? ev.reviewRequired
        ? "Approved (you)"
        : "Auto Approved"
      : status === "ignored"
      ? "Ignored"
      : "Review Required";
  return (
    <div className="mt-2.5 rounded-lg border border-border bg-muted/40 p-2.5 text-[11px]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        <Field label="Source">{RECOGNITION_SOURCE_LABEL[ev.source]}</Field>
        <Field label="Matched By">{method}</Field>
        {ev.matchedAlias && <Field label="Matched Alias">“{ev.matchedAlias}”</Field>}
        {ev.matchedCanonical && <Field label="KB Product">{ev.matchedCanonical}</Field>}
        <Field label="Confidence">
          <span className={cn("rounded px-1 py-0.5 font-medium", CONF_CLS[ev.confidenceLabel])}>
            {ev.confidenceLabel} ({Math.round(ev.confidence * 100)}%)
          </span>
        </Field>
        <Field label="Status">
          <span
            className={cn(
              "rounded px-1 py-0.5 font-medium",
              statusLabel === "Auto Approved"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : statusLabel === "Review Required"
                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusLabel}
          </span>
        </Field>
      </div>
      <p className="mt-1.5 text-muted-foreground">
        <span className="font-medium text-foreground">Reason. </span>
        {ev.reason}
      </p>
      {ev.reviewRequired && ev.reviewReason && (
        <p className="mt-1 flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            <span className="font-medium">Why review: </span>
            {ev.reviewReason}
          </span>
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground">{children}</p>
    </div>
  );
}

function Chip({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return <span className={`rounded-full px-2.5 py-1 font-medium ${cls}`}>{children}</span>;
}
