"use client";

import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber } from "@/lib/format";

export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v: number) => formatNumber(v),
  labelFormatter,
  hideLabel,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  valueFormatter?: (v: number) => string;
  labelFormatter?: (l: string) => string;
  hideLabel?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      {!hideLabel && (
        <p className="mb-1 text-xs font-semibold text-foreground">
          {labelFormatter ? labelFormatter(label || "") : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span
              className={cn("size-2 rounded-full")}
              style={{ background: entry.color || entry.fill || entry.stroke }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold tabular-nums text-foreground">
              {valueFormatter(Number(entry.value))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const currencyFormatter = (v: number) => formatCurrency(v, { compact: true });
export const compactCurrency = (v: number) => formatCurrency(v, { compact: true });
