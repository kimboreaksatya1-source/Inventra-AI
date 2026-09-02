// Inventra AI — tiny in-process cache for ActionState rows (Action Center),
// keyed by user. Busted on every PATCH so the list reflects Complete / Save /
// Dismiss immediately.

import { db } from "./db";

type Row = {
  actionKey: string;
  status: string;
  note: string | null;
  impactValue: number;
  category: string;
  updatedAt: Date;
};

const cache = new Map<string, { rows: Row[]; at: number }>();
const TTL = 30_000;

export async function getActionStates(userId: string): Promise<Row[]> {
  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < TTL) return hit.rows;
  const rows = (await db.actionState.findMany({ where: { userId } })) as Row[];
  cache.set(userId, { rows, at: Date.now() });
  return rows;
}

export function bustActionStates(userId: string): void {
  cache.delete(userId);
}
