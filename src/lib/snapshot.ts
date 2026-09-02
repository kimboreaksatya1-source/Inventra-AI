// Inventra AI — precomputed pipeline snapshot, one row per user.
// The analysis / brief / action-drafts / copilot-context are computed once on data
// change and served from here. AI narration is refreshed in the background.

import { db } from "./db";
import { loadProductsLite } from "./data";
import { analyzeInventory } from "./analysis";
import { buildDeterministicBrief, generateBrief } from "./brief";
import {
  buildDeterministicBriefing,
  generateActions,
  summarizeActions,
} from "./actions";
import { buildCopilotContextFrom } from "./copilot/context";
import { AI_MODEL, getAIClient, isAIConfigured } from "./ai";
import type {
  BusinessAction,
  BusinessBrief,
  CopilotContext,
  InventoryAnalysis,
} from "./types";

const MEM_TTL = 5 * 60_000;
/** Bump when the shape of analysis/brief/context changes so stale rows rebuild. */
const SNAPSHOT_VERSION = "fmcg-7";

export interface Snapshot {
  business: string;
  productCount: number;
  analysis: InventoryAnalysis;
  brief: BusinessBrief;
  briefSource: "ai" | "deterministic";
  actionDrafts: Omit<BusinessAction, "status" | "note">[];
  actionsBriefing: string;
  briefingSource: "ai" | "deterministic";
  copilotContext: CopilotContext;
  promptBlock: string;
  aiStale: boolean;
}

const mem = new Map<string, { snap: Snapshot; at: number }>();
const aiInFlight = new Set<string>();

function dataHash(products: { id: string; stock: number; dailySales: number; sellingPrice: number; costPrice: number; name: string }[]): string {
  let h = 2166136261;
  const s = products
    .map((p) => `${p.id}|${p.stock}|${p.dailySales}|${p.sellingPrice}|${p.costPrice}|${p.name}`)
    .join("~");
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `${SNAPSHOT_VERSION}:${(h >>> 0).toString(16)}`;
}

function rowToSnapshot(row: {
  business: string;
  productCount: number;
  analysis: unknown;
  brief: unknown;
  briefSource: string;
  actionDrafts: unknown;
  actionsBriefing: string;
  briefingSource: string;
  copilotContext: unknown;
  promptBlock: string;
  aiStale: boolean;
}): Snapshot {
  return {
    business: row.business,
    productCount: row.productCount,
    analysis: row.analysis as InventoryAnalysis,
    brief: row.brief as BusinessBrief,
    briefSource: row.briefSource as "ai" | "deterministic",
    actionDrafts: row.actionDrafts as Snapshot["actionDrafts"],
    actionsBriefing: row.actionsBriefing,
    briefingSource: row.briefingSource as "ai" | "deterministic",
    copilotContext: row.copilotContext as CopilotContext,
    promptBlock: row.promptBlock,
    aiStale: row.aiStale,
  };
}

/** Fast read: memory → DB row → rebuild. Returns null only when the user has no data at all. */
export async function getSnapshot(userId: string): Promise<Snapshot | null> {
  const cached = mem.get(userId);
  if (cached && Date.now() - cached.at < MEM_TTL) return cached.snap;

  const [row, count] = await Promise.all([
    db.snapshot.findUnique({ where: { userId } }),
    db.product.count({ where: { userId } }),
  ]);

  if (count === 0) {
    mem.delete(userId);
    return null;
  }
  const versionOk = row?.dataHash?.startsWith(`${SNAPSHOT_VERSION}:`) ?? false;
  if (row && row.productCount === count && versionOk) {
    const snap = rowToSnapshot(row);
    mem.set(userId, { snap, at: Date.now() });
    if (snap.aiStale) void refreshSnapshotAI(userId);
    return snap;
  }
  return rebuildSnapshot(userId);
}

/** Pure compute + persist for one user. Fires the background AI refresh unless `refreshAI: false`. */
export async function rebuildSnapshot(
  userId: string,
  opts?: { refreshAI?: boolean }
): Promise<Snapshot | null> {
  const wantAI = opts?.refreshAI !== false;
  const { business, products } = await loadProductsLite(userId);
  if (products.length === 0) {
    mem.delete(userId);
    await db.snapshot.deleteMany({ where: { userId } });
    return null;
  }

  const analysis = analyzeInventory(products, business);
  const brief = buildDeterministicBrief(analysis);
  const drafts = generateActions({ products, analysis, brief });
  const summary = summarizeActions(drafts);
  const actionsBriefing = buildDeterministicBriefing(summary);
  const { context, promptBlock } = buildCopilotContextFrom(analysis, brief, business);

  const snap: Snapshot = {
    business,
    productCount: products.length,
    analysis,
    brief,
    briefSource: "deterministic",
    actionDrafts: drafts,
    actionsBriefing,
    briefingSource: "deterministic",
    copilotContext: context,
    promptBlock,
    aiStale: true,
  };

  const common = {
    dataHash: dataHash(products),
    business,
    productCount: products.length,
    analysis: analysis as never,
    brief: brief as never,
    briefSource: "deterministic",
    actionDrafts: drafts as never,
    actionsBriefing,
    briefingSource: "deterministic",
    copilotContext: context as never,
    promptBlock,
    aiStale: true,
  };

  await db.snapshot.upsert({
    where: { userId },
    create: { userId, ...common },
    update: { ...common, computedAt: new Date() },
  });

  mem.set(userId, { snap, at: Date.now() });
  if (wantAI) void refreshSnapshotAI(userId);
  return snap;
}

const BRIEFING_SYSTEM = `You are Inventra AI, an FMCG inventory advisor, writing the opening lines of the
owner's action list. 2–3 confident sentences: what's most urgent (usually a fast mover about to stock
out), the single headline dollar figure, and a forward-looking close (e.g. slow movers to clear).
Refer to each product by the exact name and SKU in the summary — keep Khmer names in Khmer, never
translate. No lists, no headings, plain prose.`;

/** Background: generate the AI brief + AI action briefing for one user, persist, refresh memory. */
export async function refreshSnapshotAI(userId: string): Promise<void> {
  if (aiInFlight.has(userId) || !isAIConfigured()) return;
  aiInFlight.add(userId);
  try {
    const row = await db.snapshot.findUnique({ where: { userId } });
    if (!row) return;
    const snap = rowToSnapshot(row);

    const [briefResult, briefingResult] = await Promise.allSettled([
      generateBrief(snap.analysis),
      generateActionsBriefing(snap),
    ]);

    const brief =
      briefResult.status === "fulfilled" ? briefResult.value : snap.brief;
    const briefSource: "ai" | "deterministic" =
      briefResult.status === "fulfilled" && briefResult.value.source === "ai"
        ? "ai"
        : "deterministic";
    const actionsBriefing =
      briefingResult.status === "fulfilled" && briefingResult.value
        ? briefingResult.value
        : snap.actionsBriefing;
    const briefingSource: "ai" | "deterministic" =
      briefingResult.status === "fulfilled" && briefingResult.value ? "ai" : "deterministic";

    const updated = await db.snapshot.update({
      where: { userId },
      data: {
        brief: brief as never,
        briefSource,
        actionsBriefing,
        briefingSource,
        aiStale: false,
      },
    });
    mem.set(userId, { snap: rowToSnapshot(updated), at: Date.now() });
  } catch (err) {
    console.error("[snapshot.refreshSnapshotAI] error", err);
  } finally {
    aiInFlight.delete(userId);
  }
}

async function generateActionsBriefing(snap: Snapshot): Promise<string> {
  const drafts = snap.actionDrafts;
  if (drafts.length === 0) return "";
  const summary = summarizeActions(drafts);
  try {
    const ai = getAIClient();
    const completion = await ai.chat.completions.create({
      model: AI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: BRIEFING_SYSTEM },
        { role: "system", content: `BUSINESS SUMMARY:\n${snap.promptBlock}` },
        {
          role: "user",
          content: `${summary.text}\n\nWrite the opening of the owner's action list.`,
        },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() ?? "";
  } catch (err) {
    console.error("[snapshot.generateActionsBriefing] error", err);
    return "";
  }
}

/** Clear cache + row for one user so the next read rebuilds. Call after any product-data write. */
export async function invalidateSnapshot(userId: string): Promise<void> {
  mem.delete(userId);
  try {
    await db.snapshot.deleteMany({ where: { userId } });
  } catch (err) {
    console.error("[snapshot.invalidateSnapshot] error", err);
  }
}
