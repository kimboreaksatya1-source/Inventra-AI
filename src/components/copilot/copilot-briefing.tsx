"use client";

import Link from "next/link";
import { Boxes, LineChart, ShieldAlert, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { useCopilotContext } from "@/lib/queries/copilot";
import { buildCopilotDashboard } from "@/lib/copilot/dashboard";
import type { CopilotLanguage } from "@/lib/types";
import { ExecutiveDashboard } from "./executive-dashboard";

/** Action chips — each fires the same prompt a typed question would. */
const CHIPS = [
  {
    key: "copilot.chip.orders",
    icon: Boxes,
    prompt:
      "What should I reorder this week? Give me quantities and the revenue each order protects.",
  },
  {
    key: "copilot.chip.leaks",
    icon: ShieldAlert,
    prompt: "Where am I losing revenue right now, and which products are most at risk?",
  },
  {
    key: "copilot.chip.cash",
    icon: Wallet,
    prompt: "How can I improve my cash flow based on my current inventory?",
  },
  {
    key: "copilot.chip.opportunities",
    icon: LineChart,
    prompt:
      "What are my biggest growth opportunities and what should I do to capture them?",
  },
] as const;

/**
 * The Copilot's empty state — replaced with a live business briefing so the
 * Copilot opens as an operational surface, not a blank chat box. Pure
 * presentation: reuses buildCopilotDashboard() over the existing context query.
 */
export function CopilotBriefing({
  language,
  disabled,
  onQuickAction,
}: {
  language: CopilotLanguage;
  disabled?: boolean;
  onQuickAction: (prompt: string) => void;
}) {
  const { data: context, isLoading } = useCopilotContext();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }

  if (!context?.hasData) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">{t(language, "copilot.noData")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(language, "copilot.noDataBody")}</p>
          <Button asChild className="mt-4">
            <Link href="/upload">{t(language, "copilot.importCta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const dashboard = buildCopilotDashboard(context);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white">
          <Sparkles className="size-3.5" />
        </span>
        <p className="text-sm font-semibold">{t(language, "copilot.briefingTitle")}</p>
      </div>

      {dashboard && <ExecutiveDashboard dashboard={dashboard} language={language} />}

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.key}
              type="button"
              disabled={disabled}
              onClick={() => onQuickAction(c.prompt)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:opacity-50 dark:hover:border-teal-700 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
            >
              <Icon className="size-3.5 text-teal-600" />
              {t(language, c.key)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
