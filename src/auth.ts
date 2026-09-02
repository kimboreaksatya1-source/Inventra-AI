// Inventra AI — Auth.js v5 entrypoint (Node runtime).
// This is the only file that pulls in the Prisma adapter / `@/lib/db`, so it
// must never be imported from middleware or any edge module. Import `authConfig`
// (edge-safe) there instead.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
});
