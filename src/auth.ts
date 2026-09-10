// Inventra AI — Auth.js v5 entrypoint (Node runtime).
// This is the only file that pulls in the Prisma adapter / `@/lib/db`, so it
// must never be imported from middleware or any edge module. Import `authConfig`
// (edge-safe) there instead.

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    // "Try Demo Instantly" — no credentials, no account creation. Signs the
    // visitor into the one shared demo User row (self-healing seed). Every
    // query in the app is `where: { userId }`, so this session is sandboxed to
    // the demo catalog by the same wall that separates real accounts.
    // Credentials only works with the JWT session strategy — already configured.
    Credentials({
      id: "demo",
      name: "Demo",
      credentials: {},
      async authorize() {
        // Lazy import keeps the heavy import pipeline (commitImport → analysis,
        // brief, AI, …) out of the module graph of every route that just needs
        // `auth()` — it loads only when someone actually clicks the demo button.
        const { ensureDemoAccount, DEMO_ACCOUNT_NAME } = await import(
          "@/lib/demo-account"
        );
        const user = await ensureDemoAccount();
        return { id: user.id, name: DEMO_ACCOUNT_NAME, isDemo: true };
      },
    }),
  ],
});
