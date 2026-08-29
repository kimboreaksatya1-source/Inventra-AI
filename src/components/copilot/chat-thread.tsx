"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { t } from "@/lib/i18n";
import { MessageBubble } from "./message-bubble";
import { QuickActions } from "./quick-actions";
import type { CopilotLanguage, CopilotMessage } from "@/lib/types";

export function ChatThread({
  messages,
  language,
  isStreaming,
  onQuickAction,
}: {
  messages: CopilotMessage[];
  language: CopilotLanguage;
  isStreaming: boolean;
  onQuickAction: (prompt: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, lastLen]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-300">
            <Sparkles className="size-6" />
          </div>
          <h2 className="text-lg font-semibold">{t(language, "copilot.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(language, "copilot.emptyBody")}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <QuickActions language={language} disabled={isStreaming} onPick={onQuickAction} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} language={language} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
