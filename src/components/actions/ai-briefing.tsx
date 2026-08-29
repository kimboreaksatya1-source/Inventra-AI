"use client";

import { Sparkles } from "lucide-react";
import { Markdown } from "@/components/copilot/markdown";
import { relativeTime } from "@/lib/format";

export function AiBriefing({
  briefing,
  source,
  generatedAt,
}: {
  briefing: string;
  source: "ai" | "deterministic";
  generatedAt: string;
}) {
  if (!briefing) return null;
  return (
    <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50/80 to-transparent p-5 dark:border-teal-900 dark:from-teal-950/30">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-lg bg-teal-600 text-white">
          <Sparkles className="size-3.5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-300">
          Today&apos;s briefing
        </span>
        <span className="text-[11px] text-muted-foreground">
          {source === "ai" ? "by Inventra AI" : "generated"} · {relativeTime(generatedAt)}
        </span>
      </div>
      <Markdown className="text-[15px] leading-7">{briefing}</Markdown>
    </div>
  );
}
