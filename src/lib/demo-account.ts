// Inventra AI — the shared "Try Demo Instantly" account.
//
// One real User row that every guest signs into via the `demo` Credentials
// provider (see src/auth.ts). Because every query in the app is scoped
// `where: { userId }`, this row is isolated from real accounts by the exact
// same mechanism that isolates real accounts from each other — nothing extra
// to build. The catalog is the existing DEMO_CATALOG, imported through the
// existing commitImport() pipeline.
//
// Node runtime only. Never import this from src/auth.config.ts / middleware.

import { db } from "./db";
import { commitImport } from "./import";
import { DEMO_CATALOG, DEMO_FILE_NAME } from "./demo-catalog";

/**
 * FIXED id for the shared demo row. Must never change — every demo JWT ever
 * issued carries this as `user.id`, so re-seeding with a fresh cuid (the old
 * behaviour) stranded every existing demo session on a deleted row and dumped
 * them on the empty-state screen. A stable id keeps old sessions valid forever.
 */
export const DEMO_ACCOUNT_ID = "demo-shared-account";
/** RFC 2606 `.invalid` TLD — can never be a real mailbox or Google account. */
export const DEMO_ACCOUNT_EMAIL = "demo@inventra.invalid";
export const DEMO_ACCOUNT_NAME = "Demo Explorer";
const DEMO_BUSINESS_NAME = "Phnom Penh Mini-Mart";

/**
 * Resolve the shared demo user by its FIXED id, self-healing on first use:
 *  - create the row (id = DEMO_ACCOUNT_ID) if it does not exist yet
 *  - one-time migrate: drop any legacy demo row that only matches on email
 *  - import the demo catalog if the account has no products
 *
 * Idempotent and safe to call on every demo sign-in. Always returns
 * `{ id: DEMO_ACCOUNT_ID }`.
 */
export async function ensureDemoAccount(): Promise<{ id: string }> {
  const existing = await db.user.findUnique({
    where: { id: DEMO_ACCOUNT_ID },
    select: { id: true },
  });

  if (!existing) {
    // Migrate off any pre-stable-id row (random cuid, same email) and recreate
    // with the fixed id. Cascades clear its old products/snapshot/sessions.
    await db.user
      .deleteMany({ where: { email: DEMO_ACCOUNT_EMAIL, NOT: { id: DEMO_ACCOUNT_ID } } })
      .catch(() => {});
    try {
      await db.user.create({
        data: {
          id: DEMO_ACCOUNT_ID,
          email: DEMO_ACCOUNT_EMAIL,
          name: DEMO_ACCOUNT_NAME,
          businessName: DEMO_BUSINESS_NAME,
        },
      });
    } catch {
      // Lost a race with a concurrent first sign-in — the row exists now.
    }
  }

  const productCount = await db.product.count({ where: { userId: DEMO_ACCOUNT_ID } });
  if (productCount === 0) {
    await commitImport(DEMO_ACCOUNT_ID, {
      fileName: DEMO_FILE_NAME,
      rows: DEMO_CATALOG,
    });
  }

  // Housekeeping only — the UX guarantee is the Copilot hiding history, not this.
  // Clears conversations left by earlier visitors without touching anything an
  // active visitor is still using (updated within the last 2 hours).
  try {
    await db.chatSession.deleteMany({
      where: {
        userId: DEMO_ACCOUNT_ID,
        updatedAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      },
    });
  } catch {
    /* never block demo sign-in on cleanup */
  }

  return { id: DEMO_ACCOUNT_ID };
}
