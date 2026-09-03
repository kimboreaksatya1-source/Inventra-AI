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
  const scrollRef = useRef<HTMLDivElement>(null);
  // Whether the user is parked at the bottom. While true we follow new output;
  // once they scroll up to read history we leave them alone.
  const pinned = useRef(true);
  const lastLen = messages[messages.length - 1]?.content.length ?? 0;

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !pinned.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: isStreaming ? "auto" : "smooth" });
  }, [messages.length, lastLen, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-10">
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
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="min-h-0 flex-1 overflow-y-auto scroll-smooth px-4 py-6 sm:px-6"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} language={language} />
        ))}
      </div>
    </div>
  );
}
