import { prisma } from "@/lib/db";
import {
  evaluateAreaRisk,
  RiskEvaluationResult,
  RiskFactorInput,
} from "@/lib/engine/risk-engine";

export interface EnrichedAreaZone extends RiskFactorInput {
  id: string;
  slug: string;
  city: string;
  district: string;
  summary: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  polygon: Array<[number, number]>;
  recentIncidentsSummary: string[];
  patrolRecommendation: string;
  evaluation: RiskEvaluationResult;
}

export async function getAllAreaZonesWithRisk(
  hourOfDay = 21,
  dayOfWeek = 5
): Promise<EnrichedAreaZone[]> {
  const rows = await prisma.areaZone.findMany({
    orderBy: { baseSeverity: "desc" },
  });

  return rows.map((row) => {
    let polygon: Array<[number, number]> = [];
    let recentIncidentsSummary: string[] = [];
    try {
      polygon = JSON.parse(row.polygonJson);
    } catch {
      polygon = [[row.centerLat, row.centerLng]];
    }
    try {
      recentIncidentsSummary = JSON.parse(row.recentIncidentsSummaryJson);
    } catch {
      recentIncidentsSummary = [];
    }

    const input: RiskFactorInput = {
      slug: row.slug,
      name: row.name,
      corridorName: row.corridorName,
      lightingScore: row.lightingScore,
      footfallScore: row.footfallScore,
      cctvCoverage: row.cctvCoverage,
      totalReports: row.totalReports,
      corroboratedReports: row.corroboratedReports,
      verifiedReports: row.verifiedReports,
      baseSeverity: row.baseSeverity,
      recentIncidentDaysAgo: row.recentIncidentDaysAgo,
      nearestPoliceName: row.nearestPoliceName,
      nearestPoliceDistM: row.nearestPoliceDistM,
      nearestHospitalName: row.nearestHospitalName,
      nearestHospitalDistM: row.nearestHospitalDistM,
      nearestTransitName: row.nearestTransitName,
      nearestTransitDistM: row.nearestTransitDistM,
      peakRiskHours: row.peakRiskHours,
      recentIncidentsSummary,
      hasActiveIncident: row.baseSeverity >= 86 && (hourOfDay >= 21 || hourOfDay < 3),
    };

    const evaluation = evaluateAreaRisk(input, { hourOfDay, dayOfWeek });

    return {
      ...input,
      id: row.id,
      slug: row.slug,
      city: row.city,
      district: row.district,
      summary: row.summary,
      centerLat: row.centerLat,
      centerLng: row.centerLng,
      radiusMeters: row.radiusMeters,
      polygon,
      recentIncidentsSummary,
      patrolRecommendation: row.patrolRecommendation,
      evaluation,
    };
  });
}

export async function getAreaZoneBySlug(
  slug: string,
  hourOfDay = 21
): Promise<EnrichedAreaZone | null> {
  const all = await getAllAreaZonesWithRisk(hourOfDay);
  return all.find((z) => z.slug === slug) || null;
}

export async function getAllSafeHavens(areaSlug?: string) {
  return prisma.safeHaven.findMany({
    where: areaSlug ? { areaSlug } : undefined,
    orderBy: { is24x7: "desc" },
  });
}


/**
 * Synchronous fallback data so the Planner page can initialize immediately (0ms)
 * without waiting for async DB/API calls. Replaced by live data once fetch completes.
 */
export const FALLBACK_ZONES: EnrichedAreaZone[] = [
  {
    id: "fallback-minto",
    slug: "minto-bridge-underpass-lane",
    name: "Minto Bridge Underpass Lane",
    corridorName: "Railway Underpass Dark Stretch",
    city: "New Delhi",
    district: "Central Delhi",
    summary: "Dark underpass with low lighting and past safety complaints.",
    centerLat: 28.6353,
    centerLng: 77.225,
    radiusMeters: 450,
    polygon: [
      [28.6365, 77.2225],
      [28.6365, 77.2275],
      [28.634, 77.2275],
      [28.634, 77.2225],
    ],
    recentIncidentsSummary: [
      "Two-wheeler following reported near railway bridge at 10 PM",
      "Dim streetlights under bridge (only 28% working)",
    ],
    patrolRecommendation: "Deploy PCR van 9 PM–1 AM + fix 4 LED streetlights",
    lightingScore: 28,
    footfallScore: 22,
    cctvCoverage: 32,
    totalReports: 14,
    corroboratedReports: 6,
    verifiedReports: 4,
    baseSeverity: 84,
    recentIncidentDaysAgo: 3,
    nearestPoliceName: "CP Police Station",
    nearestPoliceDistM: 1100,
    nearestHospitalName: "RML Hospital",
    nearestHospitalDistM: 1800,
    nearestTransitName: "Patel Chowk Metro",
    nearestTransitDistM: 650,
    peakRiskHours: "21:00-02:00",
    hasActiveIncident: false,
    evaluation: {
      score: 84,
      safetyScore: 16,
      level: "HIGH",
      levelLabel: "High Risk — Increased Vigilance",
      badgeStyle: {
        borderStyle: "solid",
        borderWidthPx: 2.5,
        iconName: "AlertTriangle",
        outlineDescription: "2.5px solid red border with AlertTriangle icon",
      },
      headlineReason:
        "Dark underpass with 28% lighting, 6 verified reports, and police help 1.1 km away.",
      whenRiskIncreases: "After 9 PM when foot traffic drops sharply",
      howToAvoid: "Use well-lit Barakhamba Road instead; avoid walking alone after dark",
      whoCanHelp: "CP Police Station (1.1 km), Dial 112",
      confidenceSummary: "6 corroborated reports in 30 days — high confidence",
      rankedFactors: [],
      modelFeatureImportances: [],
      dynamicRadiusScale: 1.35,
    },
  },
];

export const FALLBACK_SAFE_HAVENS: Array<{
  id: string;
  name: string;
  category: string;
  areaSlug: string;
  placeName: string;
  address: string;
  lat: number;
  lng: number;
  openHours: string;
  contactPhone: string;
  is24x7: boolean;
  distanceText: string;
}> = [
  {
    id: "haven-cp-booth",
    name: "CP Shakti Pink Booth",
    category: "POLICE_BOOTH",
    areaSlug: "connaught-place-inner-circle",
    placeName: "Connaught Place",
    address: "Gate 2, Rajiv Chowk Metro, CP",
    lat: 28.6315,
    lng: 77.2167,
    openHours: "24x7",
    contactPhone: "112 / 1091",
    is24x7: true,
    distanceText: "140m",
  },
  {
    id: "haven-aiims",
    name: "AIIMS Emergency Gate",
    category: "HOSPITAL_24X7",
    areaSlug: "aiims-green-park-corridor",
    placeName: "AIIMS & Green Park",
    address: "AIIMS Main Gate, Ansari Nagar",
    lat: 28.5672,
    lng: 77.21,
    openHours: "24x7",
    contactPhone: "011-2658-8500",
    is24x7: true,
    distanceText: "Direct entry",
  },
  {
    id: "haven-hauz-khas-metro",
    name: "Hauz Khas Metro Security Desk",
    category: "METRO_SECURITY",
    areaSlug: "hauz-khas-village-nightlife-strip",
    placeName: "Hauz Khas",
    address: "Gate 1, Hauz Khas Metro Station",
    lat: 28.5494,
    lng: 77.2001,
    openHours: "6 AM – 11:30 PM",
    contactPhone: "155370",
    is24x7: false,
    distanceText: "180m",
  },
  {
    id: "haven-safdarjung",
    name: "Safdarjung Hospital Emergency",
    category: "HOSPITAL_24X7",
    areaSlug: "safdarjung-area",
    placeName: "Safdarjung Enclave",
    address: "Safdarjung Hospital Main Rd",
    lat: 28.5685,
    lng: 77.2065,
    openHours: "24x7",
    contactPhone: "011-2616-4033",
    is24x7: true,
    distanceText: "250m",
  },
];
