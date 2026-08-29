"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BusinessBrief, ImportRow, InventoryAnalysis } from "./types";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export interface AnalysisResponse {
  hasData: boolean;
  analysis?: InventoryAnalysis;
}

export interface BriefResponse {
  hasData: boolean;
  brief?: BusinessBrief;
  analysis?: InventoryAnalysis;
}

export function useAnalysis() {
  return useQuery({
    queryKey: ["analysis"],
    queryFn: () => getJSON<AnalysisResponse>("/api/analysis"),
  });
}

export function useBrief() {
  return useQuery({
    queryKey: ["brief"],
    queryFn: () => getJSON<BriefResponse>("/api/brief"),
    staleTime: 5 * 60_000,
  });
}

export interface ImportResult {
  ok: true;
  imported: number;
  batchId: string;
  business: string;
}

export function useImportMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { fileName: string; rows: ImportRow[] }) => {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Import failed (${res.status})`);
      }
      return res.json() as Promise<ImportResult>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["analysis"] });
      qc.invalidateQueries({ queryKey: ["brief"] });
    },
  });
}
