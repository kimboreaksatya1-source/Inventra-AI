"use client";

import {
  BarChart3,
  Boxes,
  LineChart,
  ShieldAlert,
  Sparkles,
  Wallet,
} from "lucide-react";
import { QUICK_ACTIONS, t } from "@/lib/i18n";
import type { CopilotLanguage } from "@/lib/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  reorder: Boxes,
  risk: ShieldAlert,
  cashflow: Wallet,
  health: BarChart3,
  summary: Sparkles,
  growth: LineChart,
};

export function QuickActions({
  language,
  disabled,
  onPick,
}: {
  language: CopilotLanguage;
  disabled?: boolean;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((qa) => {
        const Icon = ICONS[qa.id] ?? Sparkles;
        return (
          <button
            key={qa.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(qa.prompt)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
          >
            <Icon className="size-3.5 text-teal-600" />
            {t(language, qa.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
