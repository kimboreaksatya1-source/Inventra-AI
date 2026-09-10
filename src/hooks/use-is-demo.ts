"use client";

import { useSession } from "next-auth/react";

/**
 * True when the current session is the shared "Try Demo Instantly" account.
 * Client-side mirror of `session.user.isDemo` (set by the demo Credentials
 * provider). Used to hide load / import / replace-inventory controls — the demo
 * catalog is fixed. Returns false while the session is still loading.
 */
export function useIsDemo(): boolean {
  const { data } = useSession();
  return data?.user?.isDemo === true;
}
