import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createTrustedContact,
  deleteTrustedContact,
  getTrustedContactsForUser,
  updateTrustedContactConsent,
} from "@/lib/repositories/safety-repo";
import { getSessionUserFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { appendEvidenceEvent } from "@/lib/repositories/evidence-repo";

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
  if (!userId) return NextResponse.json({ contacts: [] });
  const contacts = await getTrustedContactsForUser(userId);
  return NextResponse.json({ contacts });
}

const createContactSchema = z.object({
  name: z.string().min(2),
  relationship: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().or(z.literal("")),
  consentWhen: z
    .enum(["MANUAL", "NIGHT_ONLY", "HIGH_RISK_ZONE", "SOS_ONLY"])
    .default("NIGHT_ONLY"),
  consentWhat: z
    .object({
      location: z.boolean().default(true),
      route: z.boolean().default(true),
      eta: z.boolean().default(true),
      status: z.boolean().default(true),
    })
    .optional(),
  consentDurationMinutes: z.number().min(10).max(240).default(45),
});

export async function POST(req: Request) {
  try {
    const userId = await resolveActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "User session not found" }, { status: 401 });
    }
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please fill in contact name, relationship, and phone number." },
        { status: 400 }
      );
    }

    const created = await createTrustedContact({
      userId,
      name: parsed.data.name.trim(),
      relationship: parsed.data.relationship.trim(),
      phone: parsed.data.phone.trim(),
      email: parsed.data.email || "trusted.contact@example.in",
      consentWhen: parsed.data.consentWhen,
      consentWhatJson: JSON.stringify(
        parsed.data.consentWhat || {
          location: true,
          route: true,
          eta: true,
          status: true,
        }
      ),
      consentDurationMinutes: parsed.data.consentDurationMinutes,
    });

    return NextResponse.json({ contact: created });
  } catch (err) {
    console.error("/api/circle POST error:", err);
    return NextResponse.json(
      { error: "Unable to add trusted contact." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await resolveActiveUserId();
    const body = await req.json();
    const {
      contactId,
      consentWhen,
      consentWhat,
      consentDurationMinutes,
      currentlySharing,
      endAllSharingOnArrival,
      placeName,
    } = body;

    if (endAllSharingOnArrival && userId) {
      await prisma.trustedContact.updateMany({
        where: { userId },
        data: { currentlySharing: false },
      });

      await appendEvidenceEvent({
        userId,
        eventType: "SAFE_CHECKIN",
        placeName: placeName || "Destination Safe Arrival",
        summary:
          "Safe arrival confirmed. Temporary Trusted Circle location sharing ended automatically per user privacy policy.",
        details: { autoRevokedOnArrival: true },
      });

      const updatedList = await getTrustedContactsForUser(userId);
      return NextResponse.json({ contacts: updatedList });
    }

    if (!contactId) {
      return NextResponse.json({ error: "Missing contactId" }, { status: 400 });
    }

    const updated = await updateTrustedContactConsent(contactId, {
      ...(consentWhen ? { consentWhen } : {}),
      ...(consentWhat ? { consentWhatJson: JSON.stringify(consentWhat) } : {}),
      ...(typeof consentDurationMinutes === "number"
        ? { consentDurationMinutes }
        : {}),
      ...(typeof currentlySharing === "boolean" ? { currentlySharing } : {}),
    });

    if (currentlySharing && userId) {
      await appendEvidenceEvent({
        userId,
        eventType: "TRUSTED_CIRCLE_NOTIFIED",
        placeName: placeName || "Connaught Place Inner Circle, New Delhi",
        summary: `Temporary journey sharing activated for ${updated.name} (${updated.consentDurationMinutes} min window, auto-ends on arrival).`,
        details: {
          contactName: updated.name,
          consentWhen: updated.consentWhen,
          consentDurationMinutes: updated.consentDurationMinutes,
        },
      });
    }

    return NextResponse.json({ contact: updated });
  } catch (err) {
    console.error("/api/circle PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update consent settings." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteTrustedContact(id);
  return NextResponse.json({ ok: true });
}
