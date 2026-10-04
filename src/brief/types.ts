import type { EvidenceStatus } from "../domain/types";

/**
 * Brief-layer types. Owned by P4.
 *
 * These deliberately live outside src/domain/types.ts, which is frozen for the
 * duration of the build as the shared four-lane contract.
 */

/** Where a single claim's numbers came from. */
export type ClaimBasis = {
  source: string;
  sourceUrl: string;
  status: EvidenceStatus;
  retrievedAt: string;
  observedAt?: string;
};

export type BriefClaim = {
  id: string;
  label: string;
  statement: string;
  basis: ClaimBasis[];
};

/**
 * The suggested pathway. `pathwayId` is undefined when the evidence does not
 * support picking one, in which case the UI must not highlight either route.
 */
export type Recommendation = {
  pathwayId?: "a" | "b";
  headline: string;
  rationale: string;
  basis: ClaimBasis[];
};

export type PlanningBrief = {
  title: string;
  confidence: "high" | "limited" | "insufficient";
  recommendation: Recommendation;
  claims: BriefClaim[];
  /** What the underlying sources do and do not measure. */
  limitations: string[];
  disclaimer: string;
};
