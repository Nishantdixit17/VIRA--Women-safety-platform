import crypto from "crypto";

export interface EvidenceChainPayload {
  sequenceNumber: number;
  userId: string;
  eventType: string;
  placeName: string;
  summary: string;
  detailsJson: string;
  timestampIso: string;
  prevHash: string;
}

export interface StoredEvidenceNode extends EvidenceChainPayload {
  id: string;
  currentHash: string;
}

export interface ChainVerificationResult {
  valid: boolean;
  totalRecords: number;
  verifiedCount: number;
  tamperedSequenceNumber: number | null;
  tamperedRecordId: string | null;
  reason: string;
}

export const GENESIS_PREV_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Computes deterministic SHA-256 hash of previous hash + canonical event fields.
 */
export function computeEvidenceHash(payload: EvidenceChainPayload): string {
  const canonical = [
    payload.prevHash,
    String(payload.sequenceNumber),
    payload.userId,
    payload.eventType,
    payload.placeName,
    payload.summary,
    payload.detailsJson,
    payload.timestampIso,
  ].join("|");

  return crypto.createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Verifies an ordered list of evidence records from oldest (sequenceNumber 1) to newest.
 */
export function verifyEvidenceTimeline(
  records: StoredEvidenceNode[]
): ChainVerificationResult {
  if (records.length === 0) {
    return {
      valid: true,
      totalRecords: 0,
      verifiedCount: 0,
      tamperedSequenceNumber: null,
      tamperedRecordId: null,
      reason: "Timeline is empty and ready to record tamper-evident safety events.",
    };
  }

  const ordered = [...records].sort(
    (a, b) => a.sequenceNumber - b.sequenceNumber
  );

  let expectedPrevHash = GENESIS_PREV_HASH;

  for (let i = 0; i < ordered.length; i++) {
    const rec = ordered[i];

    if (rec.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        totalRecords: ordered.length,
        verifiedCount: i,
        tamperedSequenceNumber: rec.sequenceNumber,
        tamperedRecordId: rec.id,
        reason: `Chain link broken at event #${rec.sequenceNumber} (${rec.eventType} at ${rec.placeName}): previous hash does not match parent block.`,
      };
    }

    const recomputed = computeEvidenceHash({
      sequenceNumber: rec.sequenceNumber,
      userId: rec.userId,
      eventType: rec.eventType,
      placeName: rec.placeName,
      summary: rec.summary,
      detailsJson: rec.detailsJson,
      timestampIso: rec.timestampIso,
      prevHash: rec.prevHash,
    });

    if (recomputed !== rec.currentHash) {
      return {
        valid: false,
        totalRecords: ordered.length,
        verifiedCount: i,
        tamperedSequenceNumber: rec.sequenceNumber,
        tamperedRecordId: rec.id,
        reason: `Cryptographic SHA-256 mismatch detected at event #${rec.sequenceNumber} (${rec.eventType} at ${rec.placeName}). Event payload was modified after creation.`,
      };
    }

    expectedPrevHash = rec.currentHash;
  }

  return {
    valid: true,
    totalRecords: ordered.length,
    verifiedCount: ordered.length,
    tamperedSequenceNumber: null,
    tamperedRecordId: null,
    reason: `All ${ordered.length} hash-chained evidence blocks verified with SHA-256 integrity. Zero tampering detected.`,
  };
}
