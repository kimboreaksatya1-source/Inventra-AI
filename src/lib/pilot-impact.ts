// Inventra AI — pilot-programme impact numbers shown in the Brief footer.
//
// FACTUAL ONLY. Set this to real figures from businesses you have actually run
// Inventra against. Leave it `null` to hide the line entirely — never show a
// fabricated number in a demo.
//
// Example (once you have real pilots):
//   export const PILOT_IMPACT: PilotImpact = { businesses: 6, revenueProtectedUsd: 21400 };

export interface PilotImpact {
  /** Number of distinct businesses whose data Inventra has analyzed. */
  businesses: number;
  /** Total 30-day revenue-at-risk covered by actions those owners took, in USD. */
  revenueProtectedUsd: number;
}

export const PILOT_IMPACT: PilotImpact | null = null;
