"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Markdown } from "./markdown";
import { InsightCards } from "./insight-cards";
import { ExecutiveDashboard } from "./executive-dashboard";
import { ReorderRecommendations } from "./reorder-recommendations";
import { TypingIndicator } from "./typing-indicator";
import type { CopilotLanguage, CopilotMessage } from "@/lib/types";

export function MessageBubble({
  message,
  language,
  concise = false,
}: {
  message: CopilotMessage;
  language: CopilotLanguage;
  /** true = a data-backed, non-"why" answer: keep prose short, full text on demand. */
  concise?: boolean;
}) {
  const [showFull, setShowFull] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-2.5 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const showTyping = message.streaming && !message.content;

  // Concise mode: a data-backed, non-"why" answer whose prose is long — keep it
  // short (dashboard is the answer), full text one tap away. Presentation only.
  const canClamp =
    concise && !!message.dashboard && !message.streaming && message.content.length > 220;
  const clamp = canClamp && !showFull;

  return (
    <div className="flex gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        {showTyping ? (
          <div className="pt-1.5">
            <TypingIndicator label={t(language, "copilot.thinking")} />
          </div>
        ) : (
          <>
            {/* Visual briefing first — the dashboard is the summary. */}
            {message.dashboard && (
              <ExecutiveDashboard dashboard={message.dashboard} language={language} />
            )}

            <div
              className={cn(
                "rounded-2xl rounded-tl-sm bg-muted px-4 py-3",
                message.dashboard && "mt-3",
                message.error && "bg-red-50 dark:bg-red-950/30"
              )}
            >
              <div className={cn(clamp && "relative max-h-24 overflow-hidden")}>
                <Markdown>{message.content || "…"}</Markdown>
                {clamp && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-muted to-transparent" />
                )}
              </div>
              {canClamp && (
                <button
                  type="button"
                  onClick={() => setShowFull((v) => !v)}
                  className="mt-1 text-xs font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  {t(language, showFull ? "copilot.hideFull" : "copilot.showFull")}
                </button>
              )}
            </div>

            {message.reorder && message.reorder.length > 0 && (
              <ReorderRecommendations items={message.reorder} language={language} />
            )}
            {/* InsightCards are redundant once the dashboard is shown. */}
            {!message.dashboard && message.insightCards && (
              <InsightCards cards={message.insightCards} language={language} />
            )}

            {!message.streaming && (
              <MessageFooter content={message.content} createdAt={message.createdAt} language={language} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MessageFooter({
  content,
  createdAt,
  language,
}: {
  content: string;
  createdAt: string;
  language: CopilotLanguage;
}) {
  const [copied, setCopied] = useState(false);
  const time = new Date(createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
      <span>{t(language, "copilot.assistant")}</span>
      <span>·</span>
      <span>{time}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="ml-1 inline-flex items-center gap-1 hover:text-foreground"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {t(language, copied ? "copilot.copied" : "copilot.copy")}
      </button>
    </div>
  );
}
