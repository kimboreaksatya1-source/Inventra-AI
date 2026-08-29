"use client";

import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  FIELD_LABELS,
  INTERNAL_FIELDS,
  REQUIRED_FIELDS,
  isMappingComplete,
} from "@/lib/catalog/column-mapping";
import type { ColumnMapping, InternalField } from "@/lib/types";

const NONE = "__none__";

export function ColumnMappingStep({
  fileName,
  headers,
  rows,
  detected,
  mapping,
  onChange,
  onBack,
  onContinue,
  busy,
}: {
  fileName: string;
  headers: string[];
  rows: unknown[][];
  detected: ColumnMapping;
  mapping: ColumnMapping;
  onChange: (m: ColumnMapping) => void;
  onBack: () => void;
  onContinue: () => void;
  busy: boolean;
}) {
  const ready = isMappingComplete(mapping);

  function setField(field: InternalField, value: string) {
    const idx = value === NONE ? null : Number(value);
    // clear any other field pointing at the same column
    const next = { ...mapping } as ColumnMapping;
    if (idx !== null) {
      for (const f of INTERNAL_FIELDS) if (next[f] === idx) next[f] = null;
    }
    next[field] = idx;
    onChange(next);
  }

  function sample(colIndex: number | null): string {
    if (colIndex === null) return "";
    for (const r of rows.slice(0, 6)) {
      const v = r[colIndex];
      if (v !== null && v !== undefined && String(v).trim() !== "") return String(v).trim();
    }
    return "";
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
        <Sparkles className="size-4 shrink-0" />
        Inventra matched your columns automatically. Check them below — fix anything that looks wrong.
      </div>

      <Card className="gap-0 p-0">
        <div className="border-b border-border px-4 py-2.5 text-xs text-muted-foreground">
          {fileName} · {headers.length} columns · {rows.length} rows
        </div>
        <div className="divide-y divide-border">
          {INTERNAL_FIELDS.map((field) => {
            const current = mapping[field];
            const auto = detected[field] !== null && detected[field] === current;
            const required = REQUIRED_FIELDS.includes(field);
            const missing = required && current === null;
            return (
              <div key={field} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center">
                <div className="sm:w-44">
                  <p className="text-sm font-medium">
                    {FIELD_LABELS[field]}
                    {required && <span className="ml-1 text-red-500">*</span>}
                  </p>
                  {auto && (
                    <p className="flex items-center gap-1 text-[11px] text-teal-600 dark:text-teal-400">
                      <CheckCircle2 className="size-3" />
                      auto-detected
                    </p>
                  )}
                </div>
                <div className="flex flex-1 items-center gap-3">
                  <Select
                    value={current === null ? NONE : String(current)}
                    onValueChange={(v) => setField(field, v)}
                  >
                    <SelectTrigger className={cn("w-full sm:max-w-xs", missing && "border-red-300")}>
                      <SelectValue placeholder="— not in file —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>— not in file —</SelectItem>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {h || `Column ${i + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="hidden truncate text-xs text-muted-foreground sm:block">
                    {sample(current) && `e.g. “${sample(current)}”`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!ready && (
        <p className="text-xs text-muted-foreground">
          Map <strong>Product Name</strong>, <strong>Stock</strong> and <strong>Selling Price</strong> to
          continue. Brand, category, code and daily sales are filled in automatically if missing.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onContinue} disabled={!ready || busy}>
          {busy ? "Recognising products…" : "Recognise products"}
          <ArrowRight className="size-4" />
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={busy}>
          <ArrowLeft className="size-4" />
          Choose a different file
        </Button>
      </div>
    </div>
  );
}
