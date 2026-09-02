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
}

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

/** Standard 401 body for API routes. */
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
