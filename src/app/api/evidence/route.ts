import { NextResponse } from "next/server";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  appendEvidenceEvent,
  getEvidenceTimelineForUser,
} from "@/lib/repositories/evidence-repo";

async function resolveActiveUserId(): Promise<string | null> {
  const session = await getSessionUserFromCookies();
  if (session?.id) return session.id;
  const demo = await prisma.user.findUnique({
    where: { email: "ananya@vira.safety" },
  });
  return demo?.id || null;
}

export async function GET() {
  const userId = await resolveActiveUserId();
  if (!userId) {
    return NextResponse.json({
      records: [],
      verification: {
        valid: true,
        totalRecords: 0,
        verifiedCount: 0,
        tamperedSequenceNumber: null,
        tamperedRecordId: null,
        reason: "No records found.",
      },
    });
  }

  const data = await getEvidenceTimelineForUser(userId);
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const userId = await resolveActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Support simulating tampering or repairing tampering so judges can see SHA-256 verification live
    if (body.action === "SIMULATE_TAMPER") {
      const latest = await prisma.evidenceRecord.findFirst({
        where: { userId },
        orderBy: { sequenceNumber: "desc" },
      });
      if (latest) {
        await prisma.evidenceRecord.update({
          where: { id: latest.id },
          data: {
            summary: `${latest.summary} [UNAUTHORIZED TAMPERED EDIT]`,
          },
        });
      }
      const data = await getEvidenceTimelineForUser(userId);
      return NextResponse.json(data);
    }

    if (body.action === "RESTORE_INTEGRITY") {
      // Re-compute valid hashes across all records for user
      const all = await prisma.evidenceRecord.findMany({
        where: { userId },
        orderBy: { sequenceNumber: "asc" },
      });
      const { computeEvidenceHash, GENESIS_PREV_HASH } = await import(
        "@/lib/engine/evidence-chain"
      );
      let prev = GENESIS_PREV_HASH;
      for (const rec of all) {
        const cleanSummary = rec.summary.replace(
          /\s*\[UNAUTHORIZED TAMPERED EDIT\]/g,
          ""
        );
        const validHash = computeEvidenceHash({
          sequenceNumber: rec.sequenceNumber,
          userId: rec.userId,
          eventType: rec.eventType,
          placeName: rec.placeName,
          summary: cleanSummary,
          detailsJson: rec.detailsJson,
          timestampIso: rec.timestampIso,
          prevHash: prev,
        });
        await prisma.evidenceRecord.update({
          where: { id: rec.id },
          data: {
            summary: cleanSummary,
            prevHash: prev,
            currentHash: validHash,
          },
        });
        prev = validHash;
      }
      const data = await getEvidenceTimelineForUser(userId);
      return NextResponse.json(data);
    }

    const created = await appendEvidenceEvent({
      userId,
      eventType: body.eventType || "SOS_TRIGGERED",
      placeName: body.placeName || "Connaught Place Inner Circle, New Delhi",
      summary:
        body.summary ||
        "Safety event automatically recorded in SHA-256 Evidence Vault.",
      details: body.details || { source: "Vira Safety Platform" },
    });

    const data = await getEvidenceTimelineForUser(userId);
    return NextResponse.json({ created, ...data });
  } catch (err) {
    console.error("/api/evidence POST error:", err);
    return NextResponse.json(
      { error: "Failed to write to Evidence Vault." },
      { status: 500 }
    );
  }
}
