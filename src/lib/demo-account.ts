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

/** RFC 2606 `.invalid` TLD — can never be a real mailbox or Google account. */
export const DEMO_ACCOUNT_EMAIL = "demo@inventra.invalid";
export const DEMO_ACCOUNT_NAME = "Demo Explorer";
const DEMO_BUSINESS_NAME = "Phnom Penh Mini-Mart";

/**
 * Resolve the shared demo user, self-healing on first use:
 *  - create the User row if it does not exist yet
 *  - import the demo catalog if the account has no products
 *
 * Idempotent and safe to call on every demo sign-in. The common path is two
 * indexed reads (find user, count products); the import only runs when the
 * account is genuinely empty (first ever sign-in, or after a manual wipe).
 */
export async function ensureDemoAccount(): Promise<{ id: string }> {
  let user = await db.user.findUnique({
    where: { email: DEMO_ACCOUNT_EMAIL },
    select: { id: true },
  });

  if (!user) {
    try {
      user = await db.user.create({
        data: {
          email: DEMO_ACCOUNT_EMAIL,
          name: DEMO_ACCOUNT_NAME,
          businessName: DEMO_BUSINESS_NAME,
        },
        select: { id: true },
      });
    } catch {
      // Lost a race with a concurrent first sign-in — the row exists now.
      user = await db.user.findUniqueOrThrow({
        where: { email: DEMO_ACCOUNT_EMAIL },
        select: { id: true },
      });
    }
  }

  const productCount = await db.product.count({ where: { userId: user.id } });
  if (productCount === 0) {
    await commitImport(user.id, {
      fileName: DEMO_FILE_NAME,
      rows: DEMO_CATALOG,
    });
  }

  return user;
}
