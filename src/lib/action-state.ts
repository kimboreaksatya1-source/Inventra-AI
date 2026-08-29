// Inventra AI — tiny in-process cache for ActionState rows (Action Center).
// Busted on every PATCH so the list reflects Complete / Save / Dismiss immediately.

import { db } from "./db";

type Row = {
  actionKey: string;
  status: string;
  note: string | null;
  impactValue: number;
  category: string;
  updatedAt: Date;
};

let cache: { rows: Row[]; at: number } | null = null;
const TTL = 30_000;

export async function getActionStates(): Promise<Row[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.rows;
  const rows = (await db.actionState.findMany()) as Row[];
  cache = { rows, at: Date.now() };
  return rows;
}

export function bustActionStates(): void {
  cache = null;
}
