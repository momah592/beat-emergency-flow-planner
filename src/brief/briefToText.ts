import type { PlanningBrief } from "./types";

/**
 * Flattens a brief to plain text for copy-out. Every claim carries its source
 * and retrieval time inline, so attribution cannot be separated from the number.
 */
export function briefToText(brief: PlanningBrief): string {
  const lines: string[] = [
    brief.title,
    "",
    `Suggested route: ${brief.recommendation.headline}`,
    brief.recommendation.rationale,
    "",
    `Evidence confidence: ${brief.confidence}`,
    "",
  ];

  for (const claim of brief.claims) {
    lines.push(`${claim.label}: ${claim.statement}`);
    for (const basis of claim.basis) {
      const observed = basis.observedAt ? `, observed ${basis.observedAt}` : "";
      lines.push(`  Source: ${basis.source} (${basis.status}), retrieved ${basis.retrievedAt}${observed}`);
    }
    lines.push("");
  }

  lines.push("What this data does not measure:");
  for (const limitation of brief.limitations) {
    lines.push(`  - ${limitation}`);
  }
  lines.push("", brief.disclaimer);

  return lines.join("\n");
}
