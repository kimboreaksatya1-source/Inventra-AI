import { cn } from "@/lib/utils";

export function HealthScore({
  score,
  label,
  explanation,
}: {
  score: number;
  label: string;
  explanation: string;
}) {
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  const tone =
    clamped >= 70
      ? "text-teal-600"
      : clamped >= 55
      ? "text-amber-500"
      : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-10">
      <div className="relative shrink-0">
        <svg width="176" height="176" viewBox="0 0 176 176" className="-rotate-90">
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            strokeWidth="12"
            className="stroke-muted"
          />
          <circle
            cx="88"
            cy="88"
            r={radius}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all", tone)}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">{clamped}</span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <div>
        <p className={cn("text-sm font-semibold uppercase tracking-wide", tone)}>{label}</p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {explanation}
        </p>
      </div>
    </div>
  );
}
