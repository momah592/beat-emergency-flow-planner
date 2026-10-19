import type { EvidenceEnvelope } from "../domain/types";

const fmt = (iso: string) => new Date(iso).toLocaleString("en-IE", { dateStyle: "medium", timeStyle: iso.length > 10 ? "short" : undefined });

/** One plain-language line saying how current an envelope is. Never implies freshness it does not have. */
export function freshnessLabel(evidence: EvidenceEnvelope<unknown>): string {
  if (evidence.status === "unavailable") return "Unavailable";
  const when = evidence.observedAt ? fmt(evidence.observedAt) : undefined;
  if (evidence.status === "replayed") return when ? `Saved snapshot from ${when}` : "Saved snapshot, observation time not supplied";
  if (evidence.freshnessSeconds !== undefined) return `Live, observed ${evidence.freshnessSeconds}s before retrieval`;
  return when ? `Live, observed ${when}` : "Live, observation time not supplied";
}

export const statusLabel = (status: EvidenceEnvelope<unknown>["status"]) =>
  status === "replayed" ? "saved snapshot" : status;
