import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";

const STATS = [
  { pct: "65%", label: "track stock in Excel or Google Sheets" },
  { pct: "44%", label: "face regular stock shortages" },
  { pct: "35%", label: "lose money to overstocking" },
  { pct: "70%", label: "want an AI business assistant" },
];

export function SurveyInsights() {
  return (
    <Card className="gap-3 p-5">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-teal-600" />
        <h3 className="text-sm font-semibold">Cambodian SME insights</h3>
      </div>
      <ul className="space-y-1.5">
        {STATS.map((s) => (
          <li key={s.label} className="flex items-baseline gap-2.5 text-sm">
            <span className="w-9 shrink-0 font-semibold tabular-nums text-teal-700 dark:text-teal-300">
              {s.pct}
            </span>
            <span className="text-muted-foreground">{s.label}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground/80">
        Based on our survey of 23 Cambodian SMEs. Profit analysis (52%) was the most-requested feature.
      </p>
    </Card>
  );
}
