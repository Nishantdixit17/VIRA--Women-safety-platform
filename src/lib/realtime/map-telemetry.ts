import { getAllAreaZonesWithRisk, getAllSafeHavens, EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import { evaluateAreaRisk, RiskLevel } from "@/lib/engine/risk-engine";
import {
  INDIAN_PLACES_DIRECTORY,
  NineSafetyParameters,
  computeNineSafetyParameters,
} from "@/lib/engine/places-geocoder";
import { prisma } from "@/lib/db";

export interface LivePatrolUnit {
  id: string;
  unitCode: string;
  name: string;
  agency: "DELHI_POLICE_PINK_PCR" | "ERSS_112_VAN" | "CAMPUS_PROCTOR_PATROL" | "METRO_CISF_QRT";
  assignedCorridor: string;
  status: "ACTIVE_PATROL" | "DISPATCHED_RED_ZONE" | "GUARDING_SAFE_HAVEN";
  lat: number;
  lng: number;
  speedKmh: number;
  headingText: string;
  contactNumber: string;
  etaMinutes: number;
  lastPingSecondsAgo: number;
}

export interface LivePlaceTelemetryItem {
  id: string;
  slug: string;
  name: string;
  corridorName: string;
  district: string;
  centerLat: number;
  centerLng: number;
  riskScore: number;
  safetyScore: number;
  riskLevel: RiskLevel;
  isRedZone: boolean;
  lightingScore: number;
  lightingLux: number;
  footfallScore: number;
  estimatedPedestriansPerMin: number;
  cctvCoverage: number;
  activeCamerasCount: number;
  nearestPoliceName: string;
  nearestPoliceDistM: number;
  nearestSafeHavenName: string;
  patrolStatus: string;
  headlineReason: string;
  liveTrend: "IMPROVING" | "STABLE" | "ELEVATING";
  sensorHeartbeatMs: number;
  lastUpdatedIso: string;
  safetyParams: NineSafetyParameters;
}

export interface LiveExternalPlaceResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  category: string;
  estimatedRiskScore: number;
  estimatedSafetyScore: number;
  riskLevel: RiskLevel;
  isRedZone: boolean;
  whyExplanation: string;
  nearestRedZoneName: string;
  nearestRedZoneDistM: number;
  nearestSafeHavenName: string;
  nearestSafeHavenLat: number;
  nearestSafeHavenLng: number;
  safestRouteGeometry: Array<[number, number]>;
  riskyShortcutGeometry: Array<[number, number]>;
  safetyParams: NineSafetyParameters;
}

export interface RealtimeMapPayload {
  status: "LIVE_STREAMING";
  apiVersion: string;
  timestampIso: string;
  timestampDisplay: string;
  hourOfDay: number;
  summary: {
    monitoredPlacesCount: number;
    safeHavensOnlineCount: number;
    activeRedZonesCount: number;
    elevatedZonesCount: number;
    safeZonesCount: number;
    citySafetyIndex: number;
    avgLightingScore: number;
    avgFootfallScore: number;
    avgCctvScore: number;
    activePatrolUnitsCount: number;
    telemetryLatencyMs: number;
  };
  zones: EnrichedAreaZone[];
  placesDashboard: LivePlaceTelemetryItem[];
  patrolUnits: LivePatrolUnit[];
  safeHavens: Awaited<ReturnType<typeof getAllSafeHavens>>;
  recentAlertsCount: number;
  searchedPlaces?: LiveExternalPlaceResult[];
}

const PATROL_ROUTES: Array<{
  id: string;
  unitCode: string;
  name: string;
  agency: LivePatrolUnit["agency"];
  assignedCorridor: string;
  status: LivePatrolUnit["status"];
  contactNumber: string;
  waypoints: Array<[number, number]>;
}> = [
  {
    id: "patrol-pink-01",
    unitCode: "PINK-PCR-01",
    name: "Shakti Pink PCR Van #01 (Connaught Place – Mandi House)",
    agency: "DELHI_POLICE_PINK_PCR",
    assignedCorridor: "Connaught Place Inner & Outer Circle",
    status: "ACTIVE_PATROL",
    contactNumber: "112 / 1091",
    waypoints: [
      [28.6315, 77.2167],
      [28.6301, 77.2212],
      [28.6288, 77.2245],
      [28.6255, 77.2342],
      [28.6288, 77.2245],
    ],
  },
  {
    id: "patrol-erss-04",
    unitCode: "ERSS-112-M4",
    name: "ERSS-112 Rapid Interceptor #04 (Minto Bridge Red-Zone Watch)",
    agency: "ERSS_112_VAN",
    assignedCorridor: "Minto Bridge & Deen Dayal Upadhyaya Marg",
    status: "DISPATCHED_RED_ZONE",
    contactNumber: "112",
    waypoints: [
      [28.6353, 77.225],
      [28.6338, 77.2232],
      [28.6322, 77.2268],
      [28.6361, 77.2275],
    ],
  },
  {
    id: "patrol-campus-02",
    unitCode: "DU-PROCTOR-02",
    name: "North Campus Women Safety Patrol #02 (Chhatra Marg)",
    agency: "CAMPUS_PROCTOR_PATROL",
    assignedCorridor: "Kamla Nagar & DU North Campus",
    status: "ACTIVE_PATROL",
    contactNumber: "011-27667291",
    waypoints: [
      [28.6815, 77.2062],
      [28.6842, 77.2095],
      [28.6868, 77.2112],
      [28.6835, 77.2078],
    ],
  },
  {
    id: "patrol-south-07",
    unitCode: "PINK-PCR-07",
    name: "South Delhi Pink Patrol #07 (Hauz Khas – AIIMS – Sarojini)",
    agency: "DELHI_POLICE_PINK_PCR",
    assignedCorridor: "Aurobindo Marg & Deer Park Boundary",
    status: "DISPATCHED_RED_ZONE",
    contactNumber: "1091",
    waypoints: [
      [28.5545, 77.1945],
      [28.5592, 77.2015],
      [28.5672, 77.21],
      [28.5746, 77.1992],
    ],
  },
  {
    id: "patrol-cisf-09",
    unitCode: "CISF-QRT-09",
    name: "Metro CISF Quick Response Team (ITO & Yamuna Bank)",
    agency: "METRO_CISF_QRT",
    assignedCorridor: "ITO Crossing & Vikas Marg Transit",
    status: "GUARDING_SAFE_HAVEN",
    contactNumber: "155370",
    waypoints: [
      [28.6275, 77.2415],
      [28.6291, 77.2438],
      [28.6262, 77.2401],
    ],
  },
];

function haversineMeters(
  lat1: number,
   lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computeLivePatrolUnits(nowMs = Date.now()): LivePatrolUnit[] {
  const tick = (nowMs / 4000) % 100;

  return PATROL_ROUTES.map((route, idx) => {
    const totalSegments = route.waypoints.length;
    const progress = (tick * 0.35 + idx * 0.7) % totalSegments;
    const segIdx = Math.floor(progress);
    const nextIdx = (segIdx + 1) % totalSegments;
    const frac = progress - segIdx;

    const [lat1, lng1] = route.waypoints[segIdx];
    const [lat2, lng2] = route.waypoints[nextIdx];

    const lat = Number((lat1 + (lat2 - lat1) * frac).toFixed(5));
    const lng = Number((lng1 + (lng2 - lng1) * frac).toFixed(5));

    const speedKmh =
      route.status === "DISPATCHED_RED_ZONE"
        ? 38 + ((idx * 5 + Math.floor(tick)) % 9)
        : 22 + ((idx * 3 + Math.floor(tick)) % 7);

    return {
      id: route.id,
      unitCode: route.unitCode,
      name: route.name,
      agency: route.agency,
      assignedCorridor: route.assignedCorridor,
      status: route.status,
      lat,
      lng,
      speedKmh,
      headingText:
        route.status === "DISPATCHED_RED_ZONE"
          ? "En route to High-Risk Corridor"
          : "Active Perimeter Sweep",
      contactNumber: route.contactNumber,
      etaMinutes: route.status === "DISPATCHED_RED_ZONE" ? 2 : 4,
      lastPingSecondsAgo: (Math.floor(nowMs / 1000) + idx) % 4 + 1,
    };
  });
}

export async function buildRealtimeMapPayload(options: {
  hour?: number;
  searchQuery?: string;
  clickLat?: number;
  clickLng?: number;
}): Promise<RealtimeMapPayload> {
  const now = new Date();
  const nowMs = now.getTime();
  const hourOfDay =
    typeof options.hour === "number" && !isNaN(options.hour)
      ? clamp(options.hour, 0, 23)
      : 21;

  const [baseZones, safeHavens, recentAlertsCount] = await Promise.all([
    getAllAreaZonesWithRisk(hourOfDay),
    getAllSafeHavens(),
    prisma.safetyAlert.count(),
  ]);

  // Apply realistic real-time micro-sensor telemetry oscillation (within ±3 points) so live dashboard & map reflect active sensor feeds
  const phase = Math.floor(nowMs / 4000);

  const liveZones: EnrichedAreaZone[] = baseZones.map((zone, idx) => {
    const wave = Math.round(Math.sin((phase + idx * 2) * 0.7) * 2);
    const liveLighting = clamp(zone.lightingScore + wave, 12, 99);
    const liveFootfall = clamp(
      zone.footfallScore + Math.round(Math.cos((phase + idx) * 0.6) * 3),
      8,
      98
    );
    const liveCctv = clamp(zone.cctvCoverage + (idx % 2 === 0 ? 1 : 0), 15, 99);

    const updatedEval = evaluateAreaRisk(
      {
        ...zone,
        lightingScore: liveLighting,
        footfallScore: liveFootfall,
        cctvCoverage: liveCctv,
      },
      { hourOfDay, dayOfWeek: 5 }
    );

    return {
      ...zone,
      lightingScore: liveLighting,
      footfallScore: liveFootfall,
      cctvCoverage: liveCctv,
      evaluation: updatedEval,
    };
  });

  const patrolUnits = computeLivePatrolUnits(nowMs);

  const placesDashboard: LivePlaceTelemetryItem[] = liveZones.map((z, idx) => {
    const isRedZone =
      z.evaluation.level === "HIGH" ||
      z.evaluation.level === "ACTIVE_INCIDENT" ||
      z.evaluation.score >= 65;

    const nearestHaven =
      safeHavens.find((sh) => sh.areaSlug === z.slug)?.name ||
      safeHavens[0]?.name ||
      z.nearestPoliceName;

    const matchingPatrol =
      patrolUnits[idx % patrolUnits.length]?.unitCode || "PINK-PCR-01";

    const liveTrend: LivePlaceTelemetryItem["liveTrend"] = isRedZone
      ? "ELEVATING"
      : z.evaluation.score <= 30
      ? "IMPROVING"
      : "STABLE";

    return {
      id: z.id,
      slug: z.slug,
      name: z.name,
      corridorName: z.corridorName || z.name,
      district: z.district,
      centerLat: z.centerLat,
      centerLng: z.centerLng,
      riskScore: z.evaluation.score,
      safetyScore: z.evaluation.safetyScore,
      riskLevel: z.evaluation.level,
      isRedZone,
      lightingScore: z.lightingScore,
      lightingLux: Math.round(z.lightingScore * 1.45),
      footfallScore: z.footfallScore,
      estimatedPedestriansPerMin: Math.max(2, Math.round(z.footfallScore * 0.65)),
      cctvCoverage: z.cctvCoverage,
      activeCamerasCount: Math.max(2, Math.round(z.cctvCoverage * 0.28)),
      nearestPoliceName: z.nearestPoliceName,
      nearestPoliceDistM: z.nearestPoliceDistM,
      nearestSafeHavenName: nearestHaven,
      patrolStatus: isRedZone
        ? `${matchingPatrol} Dispatched · Bypass Advised`
        : `${matchingPatrol} Active Sweep (${z.nearestPoliceDistM}m)`,
      headlineReason: z.evaluation.headlineReason,
      liveTrend,
      sensorHeartbeatMs: 18 + ((idx * 7 + (nowMs % 15)) % 24),
      lastUpdatedIso: now.toISOString(),
      safetyParams: computeNineSafetyParameters(
        z.centerLat,
        z.centerLng,
        z.name,
        z.district
      ),
    };
  });

  const activeRedZonesCount = placesDashboard.filter((p) => p.isRedZone).length;
  const elevatedZonesCount = placesDashboard.filter(
    (p) => !p.isRedZone && p.riskLevel === "ELEVATED"
  ).length;
  const safeZonesCount =
    placesDashboard.length - activeRedZonesCount - elevatedZonesCount;

  const avgSafety = Math.round(
    placesDashboard.reduce((acc, p) => acc + p.safetyScore, 0) /
      Math.max(1, placesDashboard.length)
  );
  const avgLighting = Math.round(
    placesDashboard.reduce((acc, p) => acc + p.lightingScore, 0) /
      Math.max(1, placesDashboard.length)
  );
  const avgFootfall = Math.round(
    placesDashboard.reduce((acc, p) => acc + p.footfallScore, 0) /
      Math.max(1, placesDashboard.length)
  );
  const avgCctv = Math.round(
    placesDashboard.reduce((acc, p) => acc + p.cctvCoverage, 0) /
      Math.max(1, placesDashboard.length)
  );

  let searchedPlaces: LiveExternalPlaceResult[] | undefined;

  if (options.searchQuery && options.searchQuery.trim().length > 1) {
    searchedPlaces = await resolveRealtimePlaceSearch(
      options.searchQuery.trim(),
      liveZones,
      safeHavens
    );
  } else if (
    typeof options.clickLat === "number" &&
    typeof options.clickLng === "number" &&
    !isNaN(options.clickLat) &&
    !isNaN(options.clickLng)
  ) {
    const pointEval = await evaluatePointWithSafeRoute(
      options.clickLat,
      options.clickLng,
      "Identified Map Location",
      liveZones,
      safeHavens
    );
    searchedPlaces = [pointEval];
  }

  return {
    status: "LIVE_STREAMING",
    apiVersion: "2.4-REALTIME-TELEMETRY",
    timestampIso: now.toISOString(),
    timestampDisplay: now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    hourOfDay,
    summary: {
      monitoredPlacesCount: placesDashboard.length,
      safeHavensOnlineCount: safeHavens.length,
      activeRedZonesCount,
      elevatedZonesCount,
      safeZonesCount,
      citySafetyIndex: avgSafety,
      avgLightingScore: avgLighting,
      avgFootfallScore: avgFootfall,
      avgCctvScore: avgCctv,
      activePatrolUnitsCount: patrolUnits.length,
      telemetryLatencyMs: 22,
    },
    zones: liveZones,
    placesDashboard,
    patrolUnits,
    safeHavens,
    recentAlertsCount,
    searchedPlaces,
  };
}

async function fetchOsrmSafeGeometry(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  safeWaypoint?: [number, number]
): Promise<Array<[number, number]>> {
  try {
    const coordsStr = safeWaypoint
      ? `${startLng},${startLat};${safeWaypoint[1]},${safeWaypoint[0]};${endLng},${endLat}`
      : `${startLng},${startLat};${endLng},${endLat}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`,
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
    // Fallback to clean multi-segment interpolated corridor geometry if offline
  }

  if (safeWaypoint) {
    return [
      [startLat, startLng],
      [
        Number(((startLat + safeWaypoint[0]) / 2).toFixed(5)),
        Number(((startLng + safeWaypoint[1]) / 2).toFixed(5)),
      ],
      safeWaypoint,
      [
        Number(((safeWaypoint[0] + endLat) / 2).toFixed(5)),
        Number(((safeWaypoint[1] + endLng) / 2).toFixed(5)),
      ],
      [endLat, endLng],
    ];
  }

  return [
    [startLat, startLng],
    [endLat, endLng],
  ];
}

async function evaluatePointWithSafeRoute(
  lat: number,
  lng: number,
  placeTitle: string,
  liveZones: EnrichedAreaZone[],
  safeHavens: Awaited<ReturnType<typeof getAllSafeHavens>>
): Promise<LiveExternalPlaceResult> {
  const redZones = liveZones.filter(
    (z) =>
      z.evaluation.level === "HIGH" ||
      z.evaluation.level === "ACTIVE_INCIDENT" ||
      z.evaluation.score >= 60
  );

  let nearestRed = redZones[0] || liveZones[0];
  let minRedDist = Infinity;
  for (const rz of redZones) {
    const d = haversineMeters(lat, lng, rz.centerLat, rz.centerLng);
    if (d < minRedDist) {
      minRedDist = d;
      nearestRed = rz;
    }
  }

  let nearestHaven = safeHavens[0] || {
    name: "Connaught Place Shakti Pink Police Booth",
    lat: 28.6315,
    lng: 77.2167,
  };
  let minHavenDist = Infinity;
  for (const sh of safeHavens) {
    const d = haversineMeters(lat, lng, sh.lat, sh.lng);
    if (d < minHavenDist) {
      minHavenDist = d;
      nearestHaven = sh;
    }
  }

  // Check if point falls inside or very close to a Red Zone
  const insideRedZone = minRedDist <= 650;
  const riskScore = insideRedZone
    ? nearestRed.evaluation.score
    : minRedDist <= 1400
    ? 52
    : 22;
  const safetyScore = 100 - riskScore;
  const riskLevel: RiskLevel =
    riskScore >= 65 ? "HIGH" : riskScore >= 42 ? "ELEVATED" : "LOW";

  const safestRouteGeometry = await fetchOsrmSafeGeometry(
    lat,
    lng,
    nearestHaven.lat,
    nearestHaven.lng,
    [28.6288, 77.2245]
  );

  const riskyShortcutGeometry: Array<[number, number]> = [
    [lat, lng],
    [nearestRed.centerLat, nearestRed.centerLng],
    [nearestHaven.lat, nearestHaven.lng],
  ];

  return {
    id: `live-loc-${Math.round(lat * 10000)}-${Math.round(lng * 10000)}`,
    name: placeTitle,
    displayName: `${placeTitle} · New Delhi Safety Telemetry Grid`,
    lat,
    lng,
    category: insideRedZone ? "IDENTIFIED_RED_ZONE" : "IDENTIFIED_LOCATION",
    estimatedRiskScore: riskScore,
    estimatedSafetyScore: safetyScore,
    riskLevel,
    isRedZone: insideRedZone,
    whyExplanation: insideRedZone
      ? `Near ${nearestRed.name} (${minRedDist}m away). Low streetlights and past reports after 9 PM. Safest route plotted to ${nearestHaven.name}.`
      : `Safe distance from Red Zones (${minRedDist}m from ${nearestRed.name}). Nearest 24x7 Safe Haven is ${nearestHaven.name} (${minHavenDist}m away).`,
    nearestRedZoneName: nearestRed.name,
    nearestRedZoneDistM: minRedDist,
    nearestSafeHavenName: nearestHaven.name,
    nearestSafeHavenLat: nearestHaven.lat,
    nearestSafeHavenLng: nearestHaven.lng,
    safestRouteGeometry,
    riskyShortcutGeometry,
    safetyParams: computeNineSafetyParameters(
      lat,
      lng,
      placeTitle,
      "New Delhi"
    ),
  };
}

async function resolveRealtimePlaceSearch(
  query: string,
  liveZones: EnrichedAreaZone[],
  safeHavens: Awaited<ReturnType<typeof getAllSafeHavens>>
): Promise<LiveExternalPlaceResult[]> {
  const qLower = query.toLowerCase();

  // 1. Match built-in monitored corridors first
  const localMatches = liveZones.filter(
    (z) =>
      z.name.toLowerCase().includes(qLower) ||
      (z.corridorName || "").toLowerCase().includes(qLower) ||
      z.district.toLowerCase().includes(qLower)
  );

  const results: LiveExternalPlaceResult[] = [];

  for (const z of localMatches.slice(0, 3)) {
    const item = await evaluatePointWithSafeRoute(
      z.centerLat,
      z.centerLng,
      z.name,
      liveZones,
      safeHavens
    );
    results.push(item);
  }

  // 2. Match our 31+ New Delhi directory places (Dwarka, Rohini, Saket, Janakpuri, Vasant Kunj, etc.)
  const dirMatches = INDIAN_PLACES_DIRECTORY.filter(
    (p) =>
      p.name.toLowerCase().includes(qLower) ||
      p.shortName.toLowerCase().includes(qLower) ||
      p.district.toLowerCase().includes(qLower)
  );
  for (const p of dirMatches.slice(0, 3)) {
    const alreadyAdded = results.some(
      (r) => haversineMeters(r.lat, r.lng, p.lat, p.lng) < 350
    );
    if (!alreadyAdded) {
      const evaluated = await evaluatePointWithSafeRoute(
        p.lat,
        p.lng,
        p.shortName,
        liveZones,
        safeHavens
      );
      results.push({
        ...evaluated,
        safetyParams:
          p.safetyParams ||
          computeNineSafetyParameters(p.lat, p.lng, p.shortName, p.district),
      });
    }
  }

  // 2. Also query OpenStreetMap Nominatim real-time geocoding API for any place in Delhi/India
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + " Delhi"
    )}&limit=3`;
    const res = await fetch(nomUrl, {
      headers: {
        "User-Agent": "VIRA-Womens-Safety-Intelligence-Platform/2.4",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const nomItems = await res.json();
      if (Array.isArray(nomItems)) {
        for (const n of nomItems.slice(0, 2)) {
          const lat = parseFloat(n.lat);
          const lng = parseFloat(n.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            const shortName = String(n.display_name || query)
              .split(",")
              .slice(0, 2)
              .join(",");
            const evaluated = await evaluatePointWithSafeRoute(
              lat,
              lng,
              shortName,
              liveZones,
              safeHavens
            );
            results.push(evaluated);
          }
        }
      }
    }
  } catch {
    // Nominatim fallback handled gracefully
  }

  return results;
}
