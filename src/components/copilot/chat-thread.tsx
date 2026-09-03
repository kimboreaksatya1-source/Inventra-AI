"use client";

import { useEffect, useRef } from "react";
import { MessageBubble } from "./message-bubble";
import { CopilotBriefing } from "./copilot-briefing";
import type { CopilotLanguage, CopilotMessage } from "@/lib/types";

/** Lightweight "is this a why/explain question" check — keeps those answers full. */
function isWhyQuestion(text: string): boolean {
  return (
    /\b(why|explain|how (did|is|does|do|come)|reason|breakdown)\b/i.test(text) ||
    /ហេតុអ្វី|មូលហេតុ|ពន្យល់/.test(text)
  );
}

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
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CopilotBriefing
          language={language}
          disabled={isStreaming}
          onQuickAction={onQuickAction}
        />
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
        {messages.map((m, i) => {
          const prevUser =
            m.role === "assistant"
              ? messages.slice(0, i).reverse().find((x) => x.role === "user")
              : undefined;
          const concise = m.role === "assistant" && !isWhyQuestion(prevUser?.content ?? "");
          return (
            <MessageBubble key={m.id} message={m} language={language} concise={concise} />
          );
        })}
      </div>
    </div>
  );
}
