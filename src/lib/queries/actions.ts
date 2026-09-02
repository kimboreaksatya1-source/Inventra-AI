"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActionCenterPayload, ActionStatus, BusinessAction } from "../types";

export function useActionCenter() {
  return useQuery({
    queryKey: ["actions"],
    queryFn: async () => {
      const res = await fetch("/api/actions");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      return (await res.json()) as ActionCenterPayload;
    },
  });
}

export interface UpdateActionInput {
  action: Pick<BusinessAction, "key" | "impactValue" | "category">;
  status: ActionStatus;
  note?: string;
}

export function useUpdateAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, status, note }: UpdateActionInput) => {
      const res = await fetch(`/api/actions/${encodeURIComponent(action.key)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note,
          impactValue: action.impactValue,
          category: action.category,
        }),
      });
      if (!res.ok) throw new Error("Could not update the action");
      return res.json();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["actions"] }),
  });
}
