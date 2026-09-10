// Inventra AI — server-side auth guards. Every route handler and every RSC that
// touches user data goes through one of these.

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export interface SessionUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  /** True only for the shared "Try Demo Instantly" account. */
  isDemo?: boolean;
}

/** Exact message shown when the shared demo account attempts a catalog write. */
export const DEMO_READ_ONLY_MESSAGE =
  "Demo mode uses a shared sample inventory and cannot be modified. Sign in with Google to import your own business data.";

/**
 * RSC / server action guard. Returns the signed-in user, or redirects to /login.
 * The redirect throws, so callers can treat the return value as always present.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user as SessionUser;
}

/** Route-handler guard. Returns the user id, or null (caller returns 401). */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Route-handler guard for catalog-write routes. Returns the user id plus whether
 * this is the shared demo account, in one `auth()` call.
 */
export async function getSessionUserContext(): Promise<{
  userId: string | null;
  isDemo: boolean;
}> {
  const session = await auth();
  return {
    userId: session?.user?.id ?? null,
    isDemo: session?.user?.isDemo === true,
  };
}

/** Standard 401 body for API routes. */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** 403 body for a catalog write attempted by the shared demo account. */
export function demoReadOnly() {
  return NextResponse.json({ error: DEMO_READ_ONLY_MESSAGE }, { status: 403 });
}
