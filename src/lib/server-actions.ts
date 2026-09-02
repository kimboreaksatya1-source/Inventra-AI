"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth-helpers";
import { commitImport } from "@/lib/import";
import { importPayloadSchema } from "@/lib/validation";
import { DEMO_CATALOG, DEMO_FILE_NAME } from "@/lib/demo-catalog";

export type LoadDemoResult =
  | { ok: true; imported: number }
  | { ok: false; error: string };

/** One-click demo catalog load. No-op if the user already has products. */
export async function loadDemoData(): Promise<LoadDemoResult> {
  const user = await requireAuth();

  const existing = await db.product.count({ where: { userId: user.id } });
  if (existing > 0) {
    return { ok: false, error: "You already have a catalog — clear it first from Upload." };
  }

  const parsed = importPayloadSchema.safeParse({
    fileName: DEMO_FILE_NAME,
    rows: DEMO_CATALOG,
  });
  if (!parsed.success) {
    return { ok: false, error: "Demo data failed validation." };
  }

  try {
    const result = await commitImport(user.id, parsed.data);
    revalidatePath("/");
    return { ok: true, imported: result.imported };
  } catch (err) {
    console.error("[loadDemoData] error", err);
    return { ok: false, error: "Could not load the demo catalog." };
  }
}
