"use client";

import { cn } from "@/lib/utils";
import type { CopilotLanguage } from "@/lib/types";

const OPTIONS: { id: CopilotLanguage; label: string }[] = [
  { id: "en", label: "English" },
  { id: "km", label: "ខ្មែរ" },
];

export function LanguageToggle({
  value,
  onChange,
}: {
  value: CopilotLanguage;
  onChange: (lang: CopilotLanguage) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === o.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
