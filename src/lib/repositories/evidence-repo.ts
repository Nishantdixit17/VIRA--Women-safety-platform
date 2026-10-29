import { prisma } from "@/lib/db";
import {
  ChainVerificationResult,
  computeEvidenceHash,
  GENESIS_PREV_HASH,
  verifyEvidenceTimeline,
} from "@/lib/engine/evidence-chain";

export async function getEvidenceTimelineForUser(userId: string) {
  const records = await prisma.evidenceRecord.findMany({
    where: { userId },
    orderBy: { sequenceNumber: "asc" },
  });
  const verification: ChainVerificationResult = verifyEvidenceTimeline(records);
  return {
    records: [...records].reverse(), // Newest first for UI display
    chronologicalRecords: records,
    verification,
  };
}

export async function appendEvidenceEvent(params: {
  userId: string;
  eventType: string;
  placeName: string;
  summary: string;
  details: Record<string, unknown>;
}) {
  const existing = await prisma.evidenceRecord.findMany({
    where: { userId: params.userId },
    orderBy: { sequenceNumber: "asc" },
  });

  const lastRecord = existing[existing.length - 1];
  const sequenceNumber = lastRecord ? lastRecord.sequenceNumber + 1 : 1;
  const prevHash = lastRecord ? lastRecord.currentHash : GENESIS_PREV_HASH;
  const timestampIso = new Date().toISOString();
  const detailsJson = JSON.stringify(params.details);

  const currentHash = computeEvidenceHash({
    sequenceNumber,
    userId: params.userId,
    eventType: params.eventType,
    placeName: params.placeName,
    summary: params.summary,
    detailsJson,
    timestampIso,
    prevHash,
  });

  return prisma.evidenceRecord.create({
    data: {
      userId: params.userId,
      sequenceNumber,
      eventType: params.eventType,
      placeName: params.placeName,
      summary: params.summary,
      detailsJson,
      timestampIso,
      prevHash,
      currentHash,
    },
  });
}
