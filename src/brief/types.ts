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
 * The comparison in words: a difference between two declared pathways, never a pick.
 * `abstained` is true when the evidence cannot support any comparison.
 */
export type BriefSummary = {
  abstained: boolean;
  headline: string;
  detail: string;
  basis: ClaimBasis[];
};

export type PlanningBrief = {
  title: string;
  confidence: "high" | "limited" | "insufficient";
  summary: BriefSummary;
  claims: BriefClaim[];
  /** Inputs that are saved, stale or unavailable in this run. */
  uncertainty: string[];
  /** What the underlying sources do and do not measure. */
  limitations: string[];
  disclaimer: string;
};
