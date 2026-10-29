import { NextRequest, NextResponse } from "next/server";
import { getAllAreaZonesWithRisk } from "@/lib/repositories/zones-repo";
import { prisma } from "@/lib/db";

/**
 * Express-powered Unified Bootstrap Endpoint (/api/express/bootstrap)
 * Returns pre-computed corridor risk scores, 24x7 Safe Havens, recent alerts,
 * Trusted Circle contacts, and community reviews in a single fast response
 * so tab switching across VIRA is instantaneous.
 */
export async function GET(req: NextRequest) {
  try {
    const hourParam = req.nextUrl.searchParams.get("hour");
    const hour = hourParam !== null ? parseInt(hourParam, 10) : 21;

    const [zones, safeHavens, alerts, contacts, reviews] = await Promise.all([
      getAllAreaZonesWithRisk(isNaN(hour) ? 21 : hour),
      prisma.safeHaven.findMany({ orderBy: { name: "asc" } }),
      prisma.safetyAlert.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.trustedContact.findMany({
        orderBy: { createdAt: "asc" },
      }),
      prisma.communityReview.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
      }),
    ]);

    return NextResponse.json({
      engine: "VIRA-Express-Unified-Router",
      timestamp: new Date().toISOString(),
      hour,
      zones,
      safeHavens,
      alerts,
      contacts,
      reviews,
      modules: [
        { id: "explore", href: "/explore", label: "Safety Map & AI", status: "connected" },
        { id: "planner", href: "/planner", label: "Safe Route Planner", status: "connected" },
        { id: "journey", href: "/journey", label: "Live Journey Monitor", status: "connected" },
        { id: "circle", href: "/circle", label: "Trusted Circle", status: "connected" },
        { id: "reviews", href: "/reviews", label: "Community Reviews", status: "connected" },
        { id: "alerts", href: "/alerts", label: "Live Dispatches", status: "connected" },
        { id: "evidence", href: "/evidence", label: "Evidence Vault", status: "connected" },
        { id: "sos", href: "/sos", label: "SOS Command Center", status: "connected" },
        { id: "settings", href: "/settings", label: "Offline & Privacy", status: "connected" },
        { id: "admin", href: "/admin", label: "Authority Analytics", status: "connected" },
      ],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Express bootstrap failed", details: String(error) },
      { status: 500 }
    );
  }
}
