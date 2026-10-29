import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSafetyAlert,
  getSafetyAlerts,
} from "@/lib/repositories/safety-repo";

const alertSchema = z.object({
  title: z.string().min(4),
  description: z.string().min(6),
  areaSlug: z.string().default("minto-bridge-underpass-lane"),
  placeName: z.string().min(3),
  riskLevel: z
    .enum(["LOW", "CAUTION", "ELEVATED", "HIGH", "ACTIVE_INCIDENT"])
    .default("HIGH"),
  category: z.string().default("ADVISORY"),
  source: z.string().default("ADMIN_BROADCAST"),
  targetAudience: z
    .enum(["ALL", "POLICE", "MUNICIPAL", "UNIVERSITY"])
    .default("ALL"),
  whyReason: z.string().default("Official safety advisory issued by Nodal Safety Desk."),
  activeUntil: z.string().default("02:00 AM"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const audience = searchParams.get("audience") || "ALL";
  const alerts = await getSafetyAlerts(audience);
  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = alertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please complete all advisory broadcast fields." },
        { status: 400 }
      );
    }

    const created = await createSafetyAlert(parsed.data);
    return NextResponse.json({ alert: created });
  } catch (err) {
    console.error("/api/alerts POST error:", err);
    return NextResponse.json(
      { error: "Failed to broadcast safety alert." },
      { status: 500 }
    );
  }
}
