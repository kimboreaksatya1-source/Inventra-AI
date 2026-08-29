"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  SavedScenario,
  ScenarioParams,
  SimulationExplanation,
  SimulationResult,
} from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function useScenarios() {
  return useQuery({
    queryKey: ["simulator", "scenarios"],
    queryFn: () => getJSON<{ scenarios: SavedScenario[] }>("/api/simulator/scenarios"),
    select: (d) => d.scenarios,
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; params: ScenarioParams; result: SimulationResult }) => {
      const res = await fetch("/api/simulator/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error("Could not save scenario");
      return (await res.json()) as { scenario: SavedScenario };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulator", "scenarios"] }),
  });
}

export function useDeleteScenario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/simulator/scenarios/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete scenario");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["simulator", "scenarios"] }),
  });
}

/** Debounced AI explanation for the current params. Pass a stable signature key. */
export function useScenarioExplanation(params: ScenarioParams, signature: string, enabled: boolean) {
  return useQuery({
    queryKey: ["simulator", "explain", signature],
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 0,
    queryFn: async () => {
      const res = await fetch("/api/simulator/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ params }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "Could not explain scenario");
      }
      return (await res.json()) as SimulationExplanation;
    },
  });
}
