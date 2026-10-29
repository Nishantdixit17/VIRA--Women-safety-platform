import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { appendEvidenceEvent } from "@/lib/repositories/evidence-repo";

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide name, valid email, and a password of at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const role = parsed.data.role || "USER";

    const created = await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash,
        role,
        phone: parsed.data.phone || "+91 98111 22334",
      },
    });

    // Seed one default trusted contact and genesis evidence block for new user
    await prisma.trustedContact.create({
      data: {
        userId: created.id,
        name: "Sunita (Emergency Family Contact)",
        relationship: "Mother",
        phone: "+91 98110 22334",
        email: "family.safety@example.in",
        consentWhen: "NIGHT_ONLY",
        consentWhatJson: JSON.stringify({
          location: true,
          route: true,
          eta: true,
          status: true,
        }),
        consentDurationMinutes: 45,
        isActive: true,
        currentlySharing: false,
      },
    });

    await appendEvidenceEvent({
      userId: created.id,
      eventType: "SAFE_CHECKIN",
      placeName: "Connaught Place Inner Circle, New Delhi",
      summary: "Privacy-first Vira account initialized with zero location data resale guarantee.",
      details: {
        privacyMode: "Auto-delete after 24h",
        hashChainInitialized: true,
      },
    });

    const sessionUser = {
      id: created.id,
      name: created.name,
      email: created.email,
      role: (created.role === "ADMIN" ? "ADMIN" : "USER") as "USER" | "ADMIN",
    };

    const token = createSessionToken(sessionUser);
    const res = NextResponse.json({
      user: sessionUser,
      redirectTo: sessionUser.role === "ADMIN" ? "/admin" : "/explore",
    });

    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json(
      { error: "Unable to create account right now." },
      { status: 500 }
    );
  }
}
