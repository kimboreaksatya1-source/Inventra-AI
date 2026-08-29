"use client";

import { useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Markdown } from "./markdown";
import { InsightCards } from "./insight-cards";
import { ReorderRecommendations } from "./reorder-recommendations";
import { TypingIndicator } from "./typing-indicator";
import type { CopilotLanguage, CopilotMessage } from "@/lib/types";

export function MessageBubble({
  message,
  language,
}: {
  message: CopilotMessage;
  language: CopilotLanguage;
}) {
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
            <div
              className={cn(
                "rounded-2xl rounded-tl-sm bg-muted px-4 py-3",
                message.error && "bg-red-50 dark:bg-red-950/30"
              )}
            >
              <Markdown>{message.content || "…"}</Markdown>
            </div>

            {message.reorder && message.reorder.length > 0 && (
              <ReorderRecommendations items={message.reorder} language={language} />
            )}
            {message.insightCards && (
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
