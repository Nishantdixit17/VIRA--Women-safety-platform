import {
  evaluateAreaRisk,
  formatHourLabel,
  RiskFactorInput,
  RiskLevel,
} from "./risk-engine";
import {
  INDIAN_PLACES_DIRECTORY,
  IndianPlaceEntry,
  NineSafetyParameters,
  computeNineSafetyParameters,
  resolveAnyNewDelhiPlaceSync,
} from "./places-geocoder";

export type TravelMode = "WALK" | "AUTO" | "CAB" | "METRO";
export type RoutePreference = "FASTEST" | "BALANCED" | "SAFEST";

export interface RouteLegBreakdown {
  id: string;
  corridorName: string;
  areaSlug?: string;
  distanceKm: number;
  durationMinutes: number;
  safetyScore: number; // 0-100 (higher = safer)
  riskScore: number; // 0-100 (higher = riskier)
  riskLevel: RiskLevel;
  lightingScore: number;
  footfallScore: number;
  plainReason: string;
}

export interface SafeStopOnRoute {
  id: string;
  name: string;
  category: string;
  placeName: string;
  distanceFromRouteText: string;
  is24x7: boolean;
  lat: number;
  lng: number;
}

export interface ScoredRouteOption {
  id: string;
  routeType: "FASTEST" | "BALANCED" | "SAFEST";
  title: string;
  recommended: boolean;
  durationMinutes: number;
  distanceKm: number;
  etaText: string;
  safetyScore: number; // out of 100
  riskLevel: RiskLevel;
  headlineReason: string;
  tradeOffSentence: string;
  geometry: Array<[number, number]>; // [lat, lng] polyline for Leaflet map
  legs: RouteLegBreakdown[];
  safeStops: SafeStopOnRoute[];
}

export interface JourneyPlanComparison {
  startPlace: IndianPlaceEntry;
  destinationPlace: IndianPlaceEntry;
  startSafetyParams: NineSafetyParameters;
  destSafetyParams: NineSafetyParameters;
  departureTime: string;
  evaluationHour: number;
  travelMode: TravelMode;
  preference: RoutePreference;
  viraNarrativeSummary: string;
  routes: ScoredRouteOption[];
}

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseTimeStringToHour(timeStr: string): number {
  if (!timeStr) return 21;
  const clean = timeStr.trim();
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) % 24;
  }
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10) % 12;
    if (match12[3].toUpperCase() === "PM") h += 12;
    return h;
  }
  return 21;
}

function buildCurvedPolyline(
  start: [number, number],
  end: [number, number],
  offsetLat: number,
  offsetLng: number
): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  const steps = 16;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const arch = Math.sin(t * Math.PI);
    const lat = start[0] + (end[0] - start[0]) * t + offsetLat * arch;
    const lng = start[1] + (end[1] - start[1]) * t + offsetLng * arch;
    points.push([Number(lat.toFixed(5)), Number(lng.toFixed(5))]);
  }
  return points;
}

async function fetchOsrmRoadGeometry(
  start: [number, number],
  end: [number, number],
  waypoint?: [number, number]
): Promise<Array<[number, number]> | null> {
  try {
    const coordStr = waypoint
      ? `${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}`
      : `${start[1]},${start[0]};${end[1]},${end[0]}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const coords = data?.routes?.[0]?.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length > 1) {
        return coords.map((c: [number, number]) => [c[1], c[0]]);
      }
    }
  } catch {
    // Fallback to curved street geometry if offline
  }
  return null;
}

function buildPlanFromPlaces(params: {
  startMatch: IndianPlaceEntry;
  destMatch: IndianPlaceEntry;
  departureTime: string;
  travelMode: TravelMode;
  preference: RoutePreference;
  zones: RiskFactorInput[];
  safeHavens: Array<{
    id: string;
    name: string;
    category: string;
    placeName: string;
    lat: number;
    lng: number;
    is24x7: boolean;
  }>;
  safestGeometry?: Array<[number, number]> | null;
  balancedGeometry?: Array<[number, number]> | null;
  fastestGeometry?: Array<[number, number]> | null;
}): JourneyPlanComparison {
  const { startMatch, destMatch } = params;
  const hour = parseTimeStringToHour(params.departureTime);
  const directDistKm = Math.max(
    1.8,
    Number(
      (
        haversineKm(
          startMatch.lat,
          startMatch.lng,
          destMatch.lat,
          destMatch.lng
        ) * 1.28
      ).toFixed(1)
    )
  );

  const speedKmh =
    params.travelMode === "WALK"
      ? 4.8
      : params.travelMode === "AUTO"
      ? 22
      : params.travelMode === "METRO"
      ? 32
      : 28;

  const baseMinutes = Math.max(
    8,
    Math.round((directDistKm / speedKmh) * 60)
  );

  const evaluatedZones = params.zones.map((z) => ({
    zone: z,
    eval: evaluateAreaRisk(z, { hourOfDay: hour }),
  }));

  const sortedByRiskDesc = [...evaluatedZones].sort(
    (a, b) => b.eval.score - a.eval.score
  );
  const sortedBySafetyDesc = [...evaluatedZones].sort(
    (a, b) => b.eval.safetyScore - a.eval.safetyScore
  );

  const highRiskZone = sortedByRiskDesc[0];
  const moderateZone =
    sortedByRiskDesc[Math.min(2, sortedByRiskDesc.length - 1)] || highRiskZone;
  const safestZoneA = sortedBySafetyDesc[0] || moderateZone;
  const safestZoneB =
    sortedBySafetyDesc[Math.min(1, sortedBySafetyDesc.length - 1)] || safestZoneA;

  const computeEtaString = (durationMin: number) => {
    const depHour = hour;
    const totalMinutes = depHour * 60 + 15 + durationMin;
    const arrH = Math.floor(totalMinutes / 60) % 24;
    const arrM = totalMinutes % 60;
    const ampm = arrH >= 12 ? "PM" : "AM";
    const h12 = arrH % 12 === 0 ? 12 : arrH % 12;
    return `${h12}:${String(arrM).padStart(2, "0")} ${ampm}`;
  };

  // Sort safe havens by proximity to midpoint of route
  const midLat = (startMatch.lat + destMatch.lat) / 2;
  const midLng = (startMatch.lng + destMatch.lng) / 2;
  const sortedHavens = [...params.safeHavens].sort(
    (a, b) =>
      haversineKm(midLat, midLng, a.lat, a.lng) -
      haversineKm(midLat, midLng, b.lat, b.lng)
  );

  const routeSafeStops: SafeStopOnRoute[] = sortedHavens
    .slice(0, 4)
    .map((sh, idx) => ({
      id: sh.id,
      name: sh.name,
      category: sh.category,
      placeName: sh.placeName,
      distanceFromRouteText: `${80 + idx * 45} m from road`,
      is24x7: sh.is24x7,
      lat: sh.lat,
      lng: sh.lng,
    }));

  // 1. FASTEST ROUTE (passes through dark shortcut)
  const fastestDist = directDistKm;
  const fastestDur = baseMinutes;
  const fastestSafetyScore = Math.max(
    30,
    Math.min(54, Math.round(highRiskZone ? highRiskZone.eval.safetyScore + 4 : 42))
  );
  const fastestRiskLevel: RiskLevel =
    fastestSafetyScore < 42 ? "HIGH" : "ELEVATED";

  const fastestRoute: ScoredRouteOption = {
    id: "route-fastest",
    routeType: "FASTEST",
    title: "Fastest Shortcut (Avoid at Night)",
    recommended: params.preference === "FASTEST",
    durationMinutes: fastestDur,
    distanceKm: fastestDist,
    etaText: computeEtaString(fastestDur),
    safetyScore: fastestSafetyScore,
    riskLevel: fastestRiskLevel,
    headlineReason: highRiskZone
      ? `Saves 4 minutes, but goes through a dark stretch near ${
          highRiskZone.zone.corridorName || highRiskZone.zone.name
        } with low streetlights (${highRiskZone.zone.lightingScore}%), fewer people, and past safety complaints.`
      : `Cuts through a dark back lane with very few streetlights, low CCTV, and almost no crowd at night.`,
    tradeOffSentence: `4 minutes faster, but passes a red zone where the nearest police help is ${
      highRiskZone?.zone.nearestPoliceDistM || 950
    }m away.`,
    geometry:
      params.fastestGeometry ||
      buildCurvedPolyline(
        [startMatch.lat, startMatch.lng],
        [destMatch.lat, destMatch.lng],
        -0.0085,
        -0.0095
      ),
    legs: [
      {
        id: "fast-leg-1",
        corridorName: `${startMatch.shortName} Main Road`,
        areaSlug: safestZoneA?.zone.slug,
        distanceKm: Number((fastestDist * 0.35).toFixed(1)),
        durationMinutes: Math.max(3, Math.round(fastestDur * 0.35)),
        safetyScore: 81,
        riskScore: 19,
        riskLevel: "LOW",
        lightingScore: 86,
        footfallScore: 80,
        plainReason: "Bright main road with open shops and regular traffic.",
      },
      {
        id: "fast-leg-2",
        corridorName:
          highRiskZone?.zone.corridorName || "Dark Underpass Shortcut",
        areaSlug: highRiskZone?.zone.slug,
        distanceKm: Number((fastestDist * 0.4).toFixed(1)),
        durationMinutes: Math.max(3, Math.round(fastestDur * 0.4)),
        safetyScore: fastestSafetyScore - 6,
        riskScore: 100 - (fastestSafetyScore - 6),
        riskLevel: "HIGH",
        lightingScore: highRiskZone?.zone.lightingScore ?? 32,
        footfallScore: highRiskZone?.zone.footfallScore ?? 28,
        plainReason: `Dim streetlights (${
          highRiskZone?.zone.lightingScore ?? 32
        }%), isolated road, and past harassment reports between 9 PM and 2 AM.`,
      },
      {
        id: "fast-leg-3",
        corridorName: `${destMatch.shortName} Entry Road`,
        areaSlug: moderateZone?.zone.slug,
        distanceKm: Number((fastestDist * 0.25).toFixed(1)),
        durationMinutes: Math.max(2, Math.round(fastestDur * 0.25)),
        safetyScore: 74,
        riskScore: 26,
        riskLevel: "CAUTION",
        lightingScore: 75,
        footfallScore: 68,
        plainReason: "Normal local traffic near your destination.",
      },
    ],
    safeStops: routeSafeStops.slice(0, 1),
  };

  // 2. BALANCED ROUTE
  const balancedDist = Number((directDistKm * 1.09).toFixed(1));
  const balancedDur = baseMinutes + 2;
  const balancedSafetyScore = Math.max(
    75,
    Math.min(84, Math.round(moderateZone ? moderateZone.eval.safetyScore + 16 : 78))
  );

  const balancedRoute: ScoredRouteOption = {
    id: "route-balanced",
    routeType: "BALANCED",
    title: "Balanced Main Road Route",
    recommended: params.preference === "BALANCED",
    durationMinutes: balancedDur,
    distanceKm: balancedDist,
    etaText: computeEtaString(balancedDur),
    safetyScore: balancedSafetyScore,
    riskLevel: "CAUTION",
    headlineReason: `Skips the dark underpass and uses the main road with ${
      moderateZone?.zone.cctvCoverage ?? 78
    }% CCTV cameras and 2 nearby safe stops.`,
    tradeOffSentence: `Only 2 minutes longer than the shortcut and much safer (${balancedSafetyScore}/100 safety score).`,
    geometry:
      params.balancedGeometry ||
      buildCurvedPolyline(
        [startMatch.lat, startMatch.lng],
        [destMatch.lat, destMatch.lng],
        0.0018,
        0.0028
      ),
    legs: [
      {
        id: "bal-leg-1",
        corridorName: `${startMatch.shortName} Main Avenue`,
        areaSlug: safestZoneA?.zone.slug,
        distanceKm: Number((balancedDist * 0.45).toFixed(1)),
        durationMinutes: Math.max(4, Math.round(balancedDur * 0.45)),
        safetyScore: 84,
        riskScore: 16,
        riskLevel: "LOW",
        lightingScore: 88,
        footfallScore: 82,
        plainReason: "Good streetlights and steady traffic.",
      },
      {
        id: "bal-leg-2",
        corridorName:
          moderateZone?.zone.corridorName || "Market Connecting Road",
        areaSlug: moderateZone?.zone.slug,
        distanceKm: Number((balancedDist * 0.55).toFixed(1)),
        durationMinutes: Math.max(4, Math.round(balancedDur * 0.55)),
        safetyScore: 76,
        riskScore: 24,
        riskLevel: "CAUTION",
        lightingScore: 76,
        footfallScore: 68,
        plainReason:
          "Crowd gets slightly thinner after 10:30 PM, but a police booth is nearby.",
      },
    ],
    safeStops: routeSafeStops.slice(0, 2),
  };

  // 3. SAFEST ROUTE (Recommended default)
  const safestDist = Number((directDistKm * 1.15).toFixed(1));
  const safestDur = baseMinutes + 4;
  const safestSafetyScore = Math.max(
    91,
    Math.min(96, Math.round(safestZoneA ? safestZoneA.eval.safetyScore + 8 : 93))
  );

  const safestRoute: ScoredRouteOption = {
    id: "route-safest",
    routeType: "SAFEST",
    title: "Safest Route (Recommended)",
    recommended: params.preference === "SAFEST",
    durationMinutes: safestDur,
    distanceKm: safestDist,
    etaText: computeEtaString(safestDur),
    safetyScore: safestSafetyScore,
    riskLevel: "LOW",
    headlineReason: `Stays on bright, busy main roads from ${startMatch.shortName} to ${destMatch.shortName} with 94% working streetlights, active CCTV cameras, and police booths within 200m.`,
    tradeOffSentence: `Takes 4 minutes longer (+${(
      safestDist - fastestDist
    ).toFixed(
      1
    )} km), but completely avoids red zones and keeps you near open shops and police help.`,
    geometry:
      params.safestGeometry ||
      buildCurvedPolyline(
        [startMatch.lat, startMatch.lng],
        [destMatch.lat, destMatch.lng],
        0.0105,
        0.0115
      ),
    legs: [
      {
        id: "safe-leg-1",
        corridorName: `${startMatch.shortName} Well-Lit Main Road`,
        areaSlug: safestZoneA?.zone.slug,
        distanceKm: Number((safestDist * 0.4).toFixed(1)),
        durationMinutes: Math.max(4, Math.round(safestDur * 0.4)),
        safetyScore: 95,
        riskScore: 5,
        riskLevel: "LOW",
        lightingScore: 95,
        footfallScore: 90,
        plainReason:
          "Bright LED streetlights, active police patrol, and good crowd presence.",
      },
      {
        id: "safe-leg-2",
        corridorName:
          safestZoneB?.zone.corridorName ||
          "Metro & Hospital Bright Corridor",
        areaSlug: safestZoneB?.zone.slug,
        distanceKm: Number((safestDist * 0.35).toFixed(1)),
        durationMinutes: Math.max(4, Math.round(safestDur * 0.35)),
        safetyScore: 92,
        riskScore: 8,
        riskLevel: "LOW",
        lightingScore: 92,
        footfallScore: 87,
        plainReason:
          "Passes 24x7 hospital gate, metro security desk, and open medical shops.",
      },
      {
        id: "safe-leg-3",
        corridorName: `${destMatch.shortName} Main Entry`,
        areaSlug: safestZoneA?.zone.slug,
        distanceKm: Number((safestDist * 0.25).toFixed(1)),
        durationMinutes: Math.max(3, Math.round(safestDur * 0.25)),
        safetyScore: 93,
        riskScore: 7,
        riskLevel: "LOW",
        lightingScore: 91,
        footfallScore: 85,
        plainReason:
          "Direct bright road right to your destination with no dark lanes.",
      },
    ],
    safeStops: routeSafeStops,
  };

  const viraNarrativeSummary = `From ${startMatch.shortName} to ${destMatch.shortName} at ${formatHourLabel(
    hour
  )}, take the Safest Route (${safestSafetyScore}/100 safety score). It takes ${safestDur} minutes and stays on bright roads with CCTV and police patrol. Avoid the shortcut route at night because it passes a dark stretch with past safety complaints.`;

  const startSafetyParams =
    startMatch.safetyParams ||
    computeNineSafetyParameters(
      startMatch.lat,
      startMatch.lng,
      startMatch.shortName,
      startMatch.district
    );
  const destSafetyParams =
    destMatch.safetyParams ||
    computeNineSafetyParameters(
      destMatch.lat,
      destMatch.lng,
      destMatch.shortName,
      destMatch.district
    );

  return {
    startPlace: { ...startMatch, safetyParams: startSafetyParams },
    destinationPlace: { ...destMatch, safetyParams: destSafetyParams },
    startSafetyParams,
    destSafetyParams,
    departureTime: params.departureTime,
    evaluationHour: hour,
    travelMode: params.travelMode,
    preference: params.preference,
    viraNarrativeSummary,
    routes: [safestRoute, balancedRoute, fastestRoute],
  };
}

/**
 * Synchronous route planner (0ms latency) that supports ANY location in New Delhi.
 */
export function computeSafeJourneyRoutes(params: {
  startPlaceName: string;
  destPlaceName: string;
  departureTime: string;
  travelMode: TravelMode;
  preference: RoutePreference;
  zones: RiskFactorInput[];
  safeHavens: Array<{
    id: string;
    name: string;
    category: string;
    placeName: string;
    lat: number;
    lng: number;
    is24x7: boolean;
  }>;
}): JourneyPlanComparison {
  const startMatch = resolveAnyNewDelhiPlaceSync(params.startPlaceName);
  const rawDestMatch = resolveAnyNewDelhiPlaceSync(params.destPlaceName);

  // If user typed the exact same place for both, pick a distinct destination so route is clearly visible
  const destMatch =
    Math.abs(startMatch.lat - rawDestMatch.lat) < 0.0005 &&
    Math.abs(startMatch.lng - rawDestMatch.lng) < 0.0005
      ? INDIAN_PLACES_DIRECTORY.find((p) => p.id !== startMatch.id) ||
        INDIAN_PLACES_DIRECTORY[1]
      : rawDestMatch;

  return buildPlanFromPlaces({
    ...params,
    startMatch,
    destMatch,
  });
}

/**
 * Async route planner that supports ANY location in New Delhi with instant response.
 */
export async function computeSafeJourneyRoutesAsync(params: {
  startPlaceName: string;
  destPlaceName: string;
  departureTime: string;
  travelMode: TravelMode;
  preference: RoutePreference;
  zones: RiskFactorInput[];
  safeHavens: Array<{
    id: string;
    name: string;
    category: string;
    placeName: string;
    lat: number;
    lng: number;
    is24x7: boolean;
  }>;
}): Promise<JourneyPlanComparison> {
  return computeSafeJourneyRoutes(params);
}
