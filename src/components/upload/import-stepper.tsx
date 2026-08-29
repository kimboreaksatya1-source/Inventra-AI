"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export type ImportStage = "parse" | "validate" | "commit" | "done";

const STEPS: { id: ImportStage; label: string }[] = [
  { id: "parse", label: "Reading file" },
  { id: "validate", label: "Validating rows" },
  { id: "commit", label: "Saving to database" },
];

const ORDER: ImportStage[] = ["parse", "validate", "commit", "done"];

export function ImportStepper({ stage }: { stage: ImportStage }) {
  const currentIndex = ORDER.indexOf(stage);
  const pct = stage === "done" ? 100 : Math.round((currentIndex / STEPS.length) * 100) + 8;

  return (
    <div className="space-y-4">
      <Progress value={pct} className="bg-teal-100 dark:bg-teal-950/40" />
      <ul className="space-y-2">
        {STEPS.map((step, i) => {
          const done = currentIndex > i || stage === "done";
          const active = currentIndex === i && stage !== "done";
          return (
            <li key={step.id} className="flex items-center gap-3 text-sm">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border",
                  done && "border-teal-600 bg-teal-600 text-white",
                  active && "border-teal-500 text-teal-600",
                  !done && !active && "border-border text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="size-3.5" />
                ) : active ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <span className="text-xs">{i + 1}</span>
                )}
              </span>
              <span className={cn(done || active ? "text-foreground" : "text-muted-foreground")}>
                {step.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
