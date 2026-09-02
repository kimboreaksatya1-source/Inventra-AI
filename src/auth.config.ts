// Inventra AI — Auth.js v5 shared config.
// Edge-safe: NO Prisma adapter, NO `@/lib/db` import here. The middleware imports
// this file, so it must run on the edge runtime. The DB adapter lives in `auth.ts`.

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { NextResponse } from "next/server";

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the user id onto the JWT at sign-in.
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    // Expose the user id on the session object consumed by RSC / route handlers.
    session({ session, token }) {
      if (token.id && session.user) session.user.id = token.id as string;
      return session;
    },
    // Runs in middleware for every matched request.
    authorized({ auth, request }) {
      if (auth?.user) return true;
      if (request.nextUrl.pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return false; // → NextAuth redirects to pages.signIn ("/login")
    },
  },
} satisfies NextAuthConfig;
