"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ChatSessionsResponse,
  ChatSessionSummary,
  CopilotContext,
  CopilotLanguage,
  CopilotMessage,
} from "../types";

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
    queryFn: () => getJSON<ChatSessionsResponse>("/api/copilot/sessions"),
    select: (d) => d.sessions,
  });
}

/** ImportBatch.id of the user's current dataset — same fetch as useSessions. */
export function useCurrentDatasetId() {
  return useQuery({
    queryKey: ["copilot", "sessions"],
    queryFn: () => getJSON<ChatSessionsResponse>("/api/copilot/sessions"),
    select: (d) => d.currentDatasetId,
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
    mutationFn: async (
      input: CopilotLanguage | { language: CopilotLanguage; datasetId?: string }
    ) => {
      const body =
        typeof input === "string" ? { language: input } : input;
      const res = await fetch("/api/copilot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
