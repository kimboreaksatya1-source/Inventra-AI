"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export function SimSlider({
  label,
  icon: Icon,
  value,
  min,
  max,
  step,
  neutral,
  format,
  onChange,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  min: number;
  max: number;
  step: number;
  neutral: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const changed = value !== neutral;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {label}
        </span>
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
            changed
              ? "bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300"
              : "text-muted-foreground"
          )}
        >
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  );
}
