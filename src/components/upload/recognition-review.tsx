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
import { ConfidenceMeter } from "@/components/shared/badges";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/catalog/knowledge-base";
import type { ReviewProduct } from "@/lib/types";

const SOURCE_LABEL: Record<ReviewProduct["source"], string> = {
  kb: "knowledge base",
  rules: "rules",
  ai: "AI",
  manual: "you",
};

export function RecognitionReview({
  products,
  aiUsed,
  onChange,
  onImport,
  onBack,
  busy,
}: {
  products: ReviewProduct[];
  aiUsed: boolean;
  onChange: (next: ReviewProduct[]) => void;
  onImport: () => void;
  onBack: () => void;
  busy: boolean;
}) {
  const counts = useMemo(() => {
    const high = products.filter((p) => p.confidence >= 0.9 && p.status !== "ignored").length;
    const review = products.filter((p) => p.confidence < 0.9 && p.status !== "ignored").length;
    const ignored = products.filter((p) => p.status === "ignored").length;
    const importing = products.filter((p) => p.status !== "ignored").length;
    return { high, review, ignored, importing };
  }, [products]);

  function patch(i: number, patch: Partial<ReviewProduct>) {
    onChange(products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }

  function approveAllHigh() {
    onChange(
      products.map((p) =>
        p.confidence >= 0.9 && p.status === "pending" ? { ...p, status: "approved" } : p
      )
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-teal-600" />
          Inventra recognised {products.length} products
          {aiUsed && <span className="text-xs font-normal text-muted-foreground">· AI helped with the tricky ones</span>}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Chip tone="ok">{counts.high} high confidence</Chip>
          {counts.review > 0 && <Chip tone="warn">{counts.review} need a look</Chip>}
          {counts.ignored > 0 && <Chip tone="muted">{counts.ignored} ignored</Chip>}
        </div>
      </div>

      {counts.review > 0 && (
        <button
          onClick={approveAllHigh}
          className="text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          Approve all {counts.high} high-confidence products
        </button>
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
  const high = product.confidence >= 0.9;
  const ignored = product.status === "ignored";

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        ignored ? "border-border bg-muted/40 opacity-60" : high ? "border-border" : "border-amber-300 dark:border-amber-800"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {ignored ? (
            <X className="size-4 text-muted-foreground" />
          ) : high ? (
            <CheckCircle2 className="size-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="size-4 text-amber-500" />
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
          <div className="mt-2 flex items-center gap-3">
            <div className="w-32">
              <ConfidenceMeter value={Math.round(product.confidence * 100)} size="sm" />
            </div>
            <span className="text-[11px] text-muted-foreground">via {SOURCE_LABEL[product.source]}</span>
          </div>
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

function Chip({ tone, children }: { tone: "ok" | "warn" | "muted"; children: React.ReactNode }) {
  const cls = {
    ok: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return <span className={`rounded-full px-2.5 py-1 font-medium ${cls}`}>{children}</span>;
}
