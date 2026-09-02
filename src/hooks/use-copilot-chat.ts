"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { STREAM_SEP, stripStreamingTail } from "@/lib/copilot/parse";
import { useSessionMessages } from "@/lib/queries/copilot";
import type {
  CopilotLanguage,
  CopilotMessage,
  CopilotStreamMeta,
} from "@/lib/types";

interface Options {
  sessionId: string | null;
  language: CopilotLanguage;
}

export function useCopilotChat({ sessionId, language }: Options) {
  const qc = useQueryClient();
  const { data, isLoading } = useSessionMessages(sessionId);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync from server whenever the persisted list changes (or the session switches).
  useEffect(() => {
    setMessages(data?.messages ?? []);
  }, [data?.messages, sessionId]);

  const send = useCallback(
    async (text: string, overrideSessionId?: string) => {
      const trimmed = text.trim();
      const targetSession = overrideSessionId ?? sessionId;
      if (!trimmed || !targetSession || isStreaming) return;
      setError(null);

      const now = Date.now();
      const userId = `u-${now}`;
      const assistantId = `a-${now}`;
      const nowIso = new Date().toISOString();

      setMessages((m) => [
        ...m,
        { id: userId, role: "user", content: trimmed, language, createdAt: nowIso },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          language,
          createdAt: nowIso,
          streaming: true,
        },
      ]);
      setIsStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: targetSession, message: trimmed, language }),
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Copilot unavailable (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let meta: CopilotStreamMeta | null = null;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          let display = buf;
          const sepIdx = buf.indexOf(STREAM_SEP);
          if (sepIdx !== -1) {
            display = buf.slice(0, sepIdx);
            const end = buf.indexOf(STREAM_SEP, sepIdx + 1);
            if (end !== -1) {
              try {
                const frame = JSON.parse(buf.slice(sepIdx + 1, end));
                if (frame?.type === "meta") meta = frame as CopilotStreamMeta;
                else if (frame?.type === "error") setError(frame.message);
              } catch {
                /* wait for more bytes */
              }
            }
          }

          const shown = stripStreamingTail(display).replace(/^\s+/, "");
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, content: shown } : x))
          );
        }

        if (meta) {
          const finalized = meta;
          setMessages((m) =>
            m.map((x) =>
              x.id === assistantId
                ? {
                    ...x,
                    id: finalized.messageId || x.id,
                    content: finalized.content,
                    insightCards: finalized.insightCards,
                    reorder: finalized.reorder,
                    streaming: false,
                  }
                : x
            )
          );
          qc.invalidateQueries({ queryKey: ["copilot", "sessions"] });
          qc.invalidateQueries({ queryKey: ["copilot", "context"] });
          qc.invalidateQueries({ queryKey: ["copilot", "session", targetSession] });
        } else {
          setMessages((m) =>
            m.map((x) => (x.id === assistantId ? { ...x, streaming: false } : x))
          );
        }
      } catch (e) {
        const aborted = ac.signal.aborted;
        setMessages((m) =>
          m.map((x) =>
            x.id === assistantId
              ? {
                  ...x,
                  streaming: false,
                  error: !aborted,
                  content:
                    x.content ||
                    (aborted
                      ? "_(stopped)_"
                      : "I couldn't reach the Copilot just now. Please try again."),
                }
              : x
          )
        );
        if (!aborted) setError(e instanceof Error ? e.message : "Copilot error");
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId, language, isStreaming, qc]
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { messages, isStreaming, isLoading, error, send, stop };
}
