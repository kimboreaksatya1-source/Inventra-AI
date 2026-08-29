"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { ParsePreview } from "@/lib/types";

export function PreviewTable({ preview }: { preview: ParsePreview }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-10">#</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead className="text-right">Daily Sales</TableHead>
            <TableHead className="text-right">Selling Price</TableHead>
            <TableHead className="text-right">Cost Price</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {preview.validations.map((v) => {
            const invalid = v.errors.length > 0;
            const warned = !invalid && v.warnings.length > 0;
            return (
              <TableRow
                key={v.rowNumber}
                className={cn(
                  invalid && "bg-red-50/70 dark:bg-red-950/20",
                  warned && "bg-amber-50/60 dark:bg-amber-950/20"
                )}
              >
                <TableCell className="text-xs text-muted-foreground">{v.rowNumber}</TableCell>
                <TableCell className="font-medium">
                  {v.raw.name || <span className="text-muted-foreground">—</span>}
                  {(invalid || warned) && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs font-normal",
                        invalid ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                      )}
                    >
                      {(invalid ? v.errors : v.warnings).join(" · ")}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{v.data?.category ?? String(v.raw.category || "—")}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(v.raw.stock)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(v.raw.dailySales)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(v.raw.sellingPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">{money(v.raw.costPrice)}</TableCell>
                <TableCell>
                  {invalid ? (
                    <XCircle className="size-4 text-red-500" />
                  ) : warned ? (
                    <AlertTriangle className="size-4 text-amber-500" />
                  ) : (
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function fmt(v: string | number | null): string {
  if (v === null || v === "") return "—";
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? String(n) : String(v);
}

function money(v: string | number | null): string {
  if (v === null || v === "") return "—";
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? formatCurrency(n, { decimals: 2 }) : String(v);
}
