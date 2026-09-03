"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessBrief,
  CashflowResult,
  DataQuality,
  ForecastEvidence,
  ImportRow,
  InventoryAnalysis,
  ProcurementPlanResponse,
  ProcurementResult,
} from "../types";

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
  datasetId: string;
  datasetName: string;
  datasetUploadedAt: string;
  productCount: number;
}

export function useProcurement() {
  return useQuery({
    queryKey: ["procurement"],
    queryFn: () =>
      getJSON<
        {
          hasData: boolean;
          dataQuality?: DataQuality;
          forecast?: Record<string, ForecastEvidence>;
        } & Partial<ProcurementResult>
      >("/api/procurement"),
  });
}

export function useCashflow() {
  return useQuery({
    queryKey: ["cashflow"],
    queryFn: () => getJSON<CashflowResult & { hasData?: boolean }>("/api/cashflow"),
  });
}

export function useGeneratePurchasePlan() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/procurement/plan", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to generate the purchase plan (${res.status})`);
      }
      return res.json() as Promise<ProcurementPlanResponse>;
    },
  });
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
