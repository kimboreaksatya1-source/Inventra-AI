// Inventra AI — demo account seeder.
//
//   bun run db:seed-demo <email>
//
// Creates (or resets) a demo user for <email>, imports the demo catalog, builds
// the analysis snapshot, runs the AI narration to completion (so nothing is
// "stale" when judges look), and seeds one Copilot conversation with a
// pre-answered "What should I reorder today?" exchange.
//
// Because Google verifies email ownership and the Google provider has
// allowDangerousEmailAccountLinking enabled, signing in with this Google account
// on demo day links to this pre-seeded user — everything is already there.

import { db } from "@/lib/db";
import { commitImport } from "@/lib/import";
import { refreshSnapshotAI, getSnapshot } from "@/lib/snapshot";
import { buildProcurement } from "@/lib/procurement";
import { buildDeterministicReply, parseStructuredTail } from "@/lib/copilot";
import { DEMO_CATALOG, DEMO_FILE_NAME } from "@/lib/demo-catalog";
import type { Prisma } from "@prisma/client";

const email = process.argv[2];
if (!email || !email.includes("@")) {
  console.error("Usage: bun run db:seed-demo <email>");
  process.exit(1);
}

async function main() {
  console.log(`Seeding demo account for ${email} …`);

  // 1 — reset the user + all their data (cascades)
  await db.user.deleteMany({ where: { email } });
  const user = await db.user.create({
    data: { email, name: "Demo Owner", businessName: "Phnom Penh Mini-Mart" },
  });

  // 2 — import the demo catalog (this also builds the deterministic snapshot)
  const res = await commitImport(user.id, { fileName: DEMO_FILE_NAME, rows: DEMO_CATALOG });
  console.log(`  imported ${res.imported} products`);

  // 3 — force the AI narration to finish so the Brief / briefing are not "stale".
  //     refreshSnapshotAI persists the AI result into the snapshot row itself.
  const hasAI = Boolean(process.env.DEEPSEEK_API_KEY);
  console.log(
    hasAI
      ? "  running AI narration (can take ~30s; commitImport may already have started it) …"
      : "  no AI key — the deterministic brief is the demo brief (that's fine)"
  );
  let snap = await getSnapshot(user.id);
  if (hasAI) {
    // commitImport fired a background refresh; wait for it (or drive it) to land.
    for (let i = 0; i < 20 && snap?.aiStale; i++) {
      await refreshSnapshotAI(user.id); // no-op if the background one is still running
      await new Promise((r) => setTimeout(r, 3000));
      snap = await getSnapshot(user.id);
    }
  }
  if (!snap) throw new Error("snapshot did not build");
  console.log(
    `  snapshot ready — health ${snap.analysis.healthScore} (${snap.analysis.summary.healthLabel}), ` +
      `briefSource ${snap.briefSource}, aiStale ${snap.aiStale}`
  );

  // 4 — seed one Copilot conversation, pre-answered deterministically
  const question = "What should I reorder today?";
  const procurement = buildProcurement(snap.analysis);
  const fb = buildDeterministicReply(snap.copilotContext, question, "en", procurement);
  const tail = parseStructuredTail(fb.content);

  const session = await db.chatSession.create({
    data: {
      userId: user.id,
      title: question,
      language: "en",
      datasetId: res.batchId,
      datasetName: res.datasetName,
      datasetUploadedAt: new Date(res.datasetUploadedAt),
      datasetProductCount: res.productCount,
    },
  });
  await db.chatMessage.create({
    data: { sessionId: session.id, role: "user", content: question, language: "en" },
  });
  await db.chatMessage.create({
    data: {
      sessionId: session.id,
      role: "assistant",
      content: tail.cleanText || fb.content,
      insightCards: (fb.insightCards ?? undefined) as Prisma.InputJsonValue | undefined,
      reorder: (fb.reorder.length ? fb.reorder : undefined) as Prisma.InputJsonValue | undefined,
      language: "en",
    },
  });
  console.log(`  seeded Copilot conversation "${question}"`);

  console.log("\nDone. Sign in with this Google account on demo day and everything is ready.");
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
