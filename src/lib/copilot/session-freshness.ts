// Interim safeguard (no schema change): flag a Copilot conversation that was
// started before the user's most recent inventory import, so its answers may
// reflect newer data than the messages above them.

import type { ChatSessionSummary } from "../types";

/**
 * True when the conversation has messages and was created strictly before the
 * latest import — i.e. it predates the current inventory dataset.
 */
export function sessionPredatesImport(
  session: Pick<ChatSessionSummary, "createdAt" | "messageCount">,
  latestImportAt: string | null | undefined
): boolean {
  if (!latestImportAt || session.messageCount === 0) return false;
  return new Date(session.createdAt).getTime() < new Date(latestImportAt).getTime();
}
