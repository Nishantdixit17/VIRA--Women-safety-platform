import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAllAreaZonesWithRisk,
  getAllSafeHavens,
} from "@/lib/repositories/zones-repo";
import {
  computeSafeJourneyRoutesAsync,
  parseTimeStringToHour,
} from "@/lib/engine/route-planner";
import { prisma } from "@/lib/db";
import { getSessionUserFromCookies } from "@/lib/auth";

const plannerSchema = z.object({
  startPlaceName: z.string().min(2),
  destPlaceName: z.string().min(2),
  departureTime: z.string().default("21:30"),
  travelMode: z.enum(["WALK", "AUTO", "CAB", "METRO"]).default("WALK"),
  preference: z.enum(["FASTEST", "BALANCED", "SAFEST"]).default("SAFEST"),
  savePlan: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = plannerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please provide valid start and destination place names." },
        { status: 400 }
      );
    }

    const hour = parseTimeStringToHour(parsed.data.departureTime);
    const [zones, safeHavens] = await Promise.all([
      getAllAreaZonesWithRisk(hour),
      getAllSafeHavens(),
    ]);

    const comparison = await computeSafeJourneyRoutesAsync({
      startPlaceName: parsed.data.startPlaceName,
      destPlaceName: parsed.data.destPlaceName,
      departureTime: parsed.data.departureTime,
      travelMode: parsed.data.travelMode,
      preference: parsed.data.preference,
      zones,
      safeHavens,
    });

    if (parsed.data.savePlan) {
      const session = await getSessionUserFromCookies();
      const demoUser = session
        ? { id: session.id }
        : await prisma.user.findUnique({ where: { email: "ananya@vira.safety" } });

      if (demoUser) {
        const recommendedRoute =
          comparison.routes.find((r) => r.recommended) || comparison.routes[0];
        await prisma.savedJourneyPlan.create({
          data: {
            userId: demoUser.id,
            startPlaceName: comparison.startPlace.shortName,
            destPlaceName: comparison.destinationPlace.shortName,
            departureTime: parsed.data.departureTime,
            travelMode: parsed.data.travelMode,
            preference: parsed.data.preference,
            selectedRouteType: recommendedRoute.routeType,
            safetyScore: recommendedRoute.safetyScore,
            etaMinutes: recommendedRoute.durationMinutes,
            distanceKm: recommendedRoute.distanceKm,
            explanationSummary: recommendedRoute.headlineReason,
          },
        });
      }
    }

    return NextResponse.json(comparison);
  } catch (err) {
    console.error("/api/planner error:", err);
    return NextResponse.json(
      { error: "Failed to compute safe journey routes." },
      { status: 500 }
    );
  }
}
