"use client";

import { DollarSign, Package, ShieldAlert, Target } from "lucide-react";
import { PriorityBadge } from "@/components/shared/badges";
import { t } from "@/lib/i18n";
import type { CopilotInsightCards, CopilotLanguage } from "@/lib/types";

export function InsightCards({
  cards,
  language,
}: {
  cards: CopilotInsightCards;
  language: CopilotLanguage;
}) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
      <Card
        labelKey="cards.revenueImpact"
        language={language}
        icon={<DollarSign className="size-3.5" />}
        accent="text-teal-600 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300"
      >
        <p className="text-sm font-medium leading-snug">{cards.revenueImpact || "—"}</p>
      </Card>

      <Card
        labelKey="cards.inventoryImpact"
        language={language}
        icon={<Package className="size-3.5" />}
        accent="text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300"
      >
        <p className="text-sm font-medium leading-snug">{cards.inventoryImpact || "—"}</p>
      </Card>

      <Card
        labelKey="cards.riskLevel"
        language={language}
        icon={<ShieldAlert className="size-3.5" />}
        accent="text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300"
      >
        <PriorityBadge priority={cards.riskLevel} />
      </Card>

      <Card
        labelKey="cards.recommendedAction"
        language={language}
        icon={<Target className="size-3.5" />}
        accent="text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <p className="text-sm font-medium leading-snug">{cards.recommendedAction || "—"}</p>
      </Card>
    </div>
  );
}

function Card({
  labelKey,
  language,
  icon,
  accent,
  children,
}: {
  labelKey: string;
  language: CopilotLanguage;
  icon: React.ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={`flex size-6 items-center justify-center rounded-lg ${accent}`}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t(language, labelKey)}
        </span>
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
