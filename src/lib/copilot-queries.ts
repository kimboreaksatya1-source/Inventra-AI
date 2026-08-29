"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatSessionSummary,
  CopilotContext,
  CopilotLanguage,
  CopilotMessage,
} from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useCopilotContext() {
  return useQuery({
    queryKey: ["copilot", "context"],
    queryFn: () => getJSON<CopilotContext>("/api/copilot/context"),
    staleTime: 60_000,
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ["copilot", "sessions"],
    queryFn: () => getJSON<{ sessions: ChatSessionSummary[] }>("/api/copilot/sessions"),
    select: (d) => d.sessions,
  });
}

export function useSessionMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["copilot", "session", sessionId],
    enabled: !!sessionId,
    queryFn: () =>
      getJSON<{
        session: { id: string; title: string; language: CopilotLanguage };
        messages: CopilotMessage[];
      }>(`/api/copilot/sessions/${sessionId}`),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (language: CopilotLanguage) => {
      const res = await fetch("/api/copilot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
      if (!res.ok) throw new Error("Could not start a conversation");
      return (await res.json()) as { session: ChatSessionSummary };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copilot", "sessions"] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/copilot/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete conversation");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["copilot", "sessions"] }),
  });
}

export function useSetSessionLanguage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, language }: { id: string; language: CopilotLanguage }) => {
      await fetch(`/api/copilot/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["copilot", "session", v.id] });
      qc.invalidateQueries({ queryKey: ["copilot", "sessions"] });
    },
  });
}
