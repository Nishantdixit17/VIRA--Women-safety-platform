export type RiskLevel =
  | "LOW"
  | "CAUTION"
  | "ELEVATED"
  | "HIGH"
  | "ACTIVE_INCIDENT";

export interface RiskFactorInput {
  slug?: string;
  name: string;
  corridorName?: string;
  lightingScore: number; // 0-100 (100 = bright LED street lighting)
  footfallScore: number; // 0-100 (100 = high bustling crowd)
  cctvCoverage: number; // 0-100
  totalReports: number;
  corroboratedReports: number;
  verifiedReports: number;
  baseSeverity: number; // 0-100
  recentIncidentDaysAgo: number;
  nearestPoliceName: string;
  nearestPoliceDistM: number;
  nearestHospitalName: string;
  nearestHospitalDistM: number;
  nearestTransitName: string;
  nearestTransitDistM: number;
  peakRiskHours: string;
  recentIncidentsSummary?: string[];
  hasActiveIncident?: boolean;
}

export interface RiskContextOptions {
  hourOfDay: number; // 0-23 (e.g., 22 for 10 PM)
  dayOfWeek?: number; // 0 (Sun) - 6 (Sat)
}

export interface RankedRiskFactor {
  id: string;
  label: string;
  weightPercent: number;
  contributionScore: number; // 0-100 impact on risk
  severity: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  explanation: string;
  preventiveAction: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number; // 0 to 1, sums to 1.0
  valueSummary: string;
}

export interface RiskEvaluationResult {
  score: number; // 0-100 (higher = higher risk)
  safetyScore: number; // 0-100 (100 - score, higher = safer)
  level: RiskLevel;
  levelLabel: string;
  badgeStyle: {
    borderStyle: "solid" | "dashed" | "double";
    borderWidthPx: number;
    iconName: "ShieldCheck" | "Info" | "Eye" | "AlertTriangle" | "Siren";
    outlineDescription: string;
  };
  headlineReason: string;
  whenRiskIncreases: string;
  howToAvoid: string;
  whoCanHelp: string;
  confidenceSummary: string;
  rankedFactors: RankedRiskFactor[];
  modelFeatureImportances: FeatureImportanceItem[];
  dynamicRadiusScale: number; // Multiplier for map zone visualization (e.g. 0.85 to 1.45)
}

const FEATURE_WEIGHTS = {
  incidentRecencyAndSeverity: 0.22,
  lightingDeficit: 0.20,
  footfallIsolation: 0.18,
  temporalPattern: 0.15,
  verifiedCorroborationRatio: 0.13,
  emergencyInfrastructureDistance: 0.12,
} as const;

export function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  if (normalized === 0) return "12:00 AM";
  if (normalized === 12) return "12:00 PM";
  if (normalized > 12) return `${normalized - 12}:00 PM`;
  return `${normalized}:00 AM`;
}

export function getRiskLevelFromScore(
  score: number,
  hasActiveIncident = false
): RiskLevel {
  if (hasActiveIncident || score >= 85) return "ACTIVE_INCIDENT";
  if (score >= 65) return "HIGH";
  if (score >= 45) return "ELEVATED";
  if (score >= 25) return "CAUTION";
  return "LOW";
}

export function getRiskBadgeMetadata(level: RiskLevel): RiskEvaluationResult["badgeStyle"] & {
  levelLabel: string;
} {
  switch (level) {
    case "LOW":
      return {
        levelLabel: "Low Risk · Verified Safe",
        borderStyle: "solid",
        borderWidthPx: 1,
        iconName: "ShieldCheck",
        outlineDescription: "1px solid rose border with ShieldCheck icon",
      };
    case "CAUTION":
      return {
        levelLabel: "Caution · Moderate Watch",
        borderStyle: "dashed",
        borderWidthPx: 1.5,
        iconName: "Info",
        outlineDescription: "1.5px dashed brand-pink outline with Info icon",
      };
    case "ELEVATED":
      return {
        levelLabel: "Elevated · Reduced Visibility",
        borderStyle: "solid",
        borderWidthPx: 2,
        iconName: "Eye",
        outlineDescription: "2px solid brand-pink outline with Eye icon",
      };
    case "HIGH":
      return {
        levelLabel: "High Risk · Avoid Alone Late",
        borderStyle: "double",
        borderWidthPx: 3,
        iconName: "AlertTriangle",
        outlineDescription: "3px double danger-red outline with AlertTriangle icon",
      };
    case "ACTIVE_INCIDENT":
      return {
        levelLabel: "Active Incident · Reroute Immediately",
        borderStyle: "solid",
        borderWidthPx: 2.5,
        iconName: "Siren",
        outlineDescription: "2.5px solid danger-red outline with animated Siren beacon",
      };
  }
}

/**
 * Computes temporal multiplier based on time of day (6 PM to 2 AM escalation) and day of week.
 */
export function computeTemporalRiskScore(hourOfDay: number, dayOfWeek = 5): number {
  const h = ((hourOfDay % 24) + 24) % 24;
  let baseTemporal = 20;

  if (h >= 6 && h < 17) {
    baseTemporal = 15; // Daytime baseline
  } else if (h >= 17 && h < 19) {
    baseTemporal = 32; // Dusk transition
  } else if (h >= 19 && h < 21) {
    baseTemporal = 54; // Evening commute drop-off
  } else if (h >= 21 && h < 23) {
    baseTemporal = 78; // Late evening isolation
  } else if (h === 23 || h < 3) {
    baseTemporal = 95; // Peak night vulnerability window (11 PM - 2 AM)
  } else {
    baseTemporal = 68; // Early dawn (3 AM - 6 AM)
  }

  // Weekend late nights or Sunday late evenings have slightly lower commuter footfall
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  if (isWeekend && (h >= 21 || h < 4)) {
    baseTemporal = Math.min(100, baseTemporal + 6);
  }

  return baseTemporal;
}

/**
 * Transparent, weighted, explainable scoring engine for road segments & zones.
 */
export function evaluateAreaRisk(
  input: RiskFactorInput,
  context: RiskContextOptions
): RiskEvaluationResult {
  const hour = ((context.hourOfDay % 24) + 24) % 24;
  const day = context.dayOfWeek ?? 4;
  const isNight = hour >= 18 || hour < 5;
  const isLateNight = hour >= 21 || hour < 3;

  // 1. Incident Recency & Severity (22%)
  const recencyDecay = Math.max(0.25, 1 - input.recentIncidentDaysAgo / 30);
  const incidentScore = Math.min(
    100,
    Math.round(input.baseSeverity * (0.65 + 0.35 * recencyDecay))
  );

  // 2. Lighting Deficit (20%) - amplified after sunset
  const rawLightingDeficit = Math.max(0, 100 - input.lightingScore);
  const lightingMultiplier = isLateNight ? 1.25 : isNight ? 1.12 : 0.45;
  const lightingRiskScore = Math.min(
    100,
    Math.round(rawLightingDeficit * lightingMultiplier)
  );

  // 3. Footfall & Activity Isolation (18%) - crowd thins out sharply late at night
  const rawFootfallDeficit = Math.max(0, 100 - input.footfallScore);
  const footfallNightShift = isLateNight ? 24 : isNight ? 12 : -15;
  const footfallRiskScore = Math.min(
    100,
    Math.max(5, Math.round(rawFootfallDeficit + footfallNightShift))
  );

  // 4. Temporal Risk Pattern (15%)
  const temporalRiskScore = computeTemporalRiskScore(hour, day);

  // 5. Verified & Corroborated Community Ratio (13%)
  const totalRep = Math.max(1, input.totalReports);
  const verifiedRatio =
    (input.verifiedReports * 1.0 + input.corroboratedReports * 0.6) / totalRep;
  const reportVolumeFactor = Math.min(1, input.totalReports / 18);
  const verifiedRiskScore = Math.min(
    100,
    Math.round(verifiedRatio * 65 * reportVolumeFactor + reportVolumeFactor * 35)
  );

  // 6. Emergency Infrastructure Distance (12%)
  // Police + Hospital + Transit proximity
  const policeNorm = Math.min(100, (input.nearestPoliceDistM / 1500) * 100);
  const hospitalNorm = Math.min(100, (input.nearestHospitalDistM / 2500) * 100);
  const transitNorm = Math.min(100, (input.nearestTransitDistM / 1200) * 100);
  const cctvMitigation = (input.cctvCoverage / 100) * 15;
  const infraRiskScore = Math.max(
    5,
    Math.min(
      100,
      Math.round(policeNorm * 0.5 + transitNorm * 0.3 + hospitalNorm * 0.2 - cctvMitigation)
    )
  );

  // Weighted aggregate
  const weightedRaw =
    incidentScore * FEATURE_WEIGHTS.incidentRecencyAndSeverity +
    lightingRiskScore * FEATURE_WEIGHTS.lightingDeficit +
    footfallRiskScore * FEATURE_WEIGHTS.footfallIsolation +
    temporalRiskScore * FEATURE_WEIGHTS.temporalPattern +
    verifiedRiskScore * FEATURE_WEIGHTS.verifiedCorroborationRatio +
    infraRiskScore * FEATURE_WEIGHTS.emergencyInfrastructureDistance;

  const finalScore = input.hasActiveIncident
    ? Math.max(88, Math.min(99, Math.round(weightedRaw + 18)))
    : Math.max(6, Math.min(98, Math.round(weightedRaw)));

  const safetyScore = Math.max(2, 100 - finalScore);
  const level = getRiskLevelFromScore(finalScore, input.hasActiveIncident);
  const badgeMeta = getRiskBadgeMetadata(level);

  const rawFactors: RankedRiskFactor[] = [
    {
      id: "lighting",
      label: "Street Lighting & Visibility",
      weightPercent: 20,
      contributionScore: lightingRiskScore,
      severity:
        lightingRiskScore >= 75
          ? "CRITICAL"
          : lightingRiskScore >= 55
          ? "HIGH"
          : lightingRiskScore >= 35
          ? "MODERATE"
          : "LOW",
      explanation:
        lightingRiskScore >= 55
          ? `Street lighting score is ${input.lightingScore}/100 with dark stretches along ${
              input.corridorName || input.name
            } at ${formatHourLabel(hour)}.`
          : `Lighting coverage is ${input.lightingScore}/100 with clear sightlines along the main carriageway.`,
      preventiveAction:
        "Use the main arterial sidewalk and avoid unlit service lanes or underpasses.",
    },
    {
      id: "incidents",
      label: "Recent Verified Incidents",
      weightPercent: 22,
      contributionScore: incidentScore,
      severity:
        incidentScore >= 75
          ? "CRITICAL"
          : incidentScore >= 55
          ? "HIGH"
          : incidentScore >= 35
          ? "MODERATE"
          : "LOW",
      explanation: `${input.verifiedReports} verified and ${input.corroboratedReports} corroborated reports out of ${input.totalReports} total community submissions (most recent ${input.recentIncidentDaysAgo} days ago).`,
      preventiveAction:
        "Switch to the Safest Route or activate Trusted Circle live monitoring before entering this segment.",
    },
    {
      id: "footfall",
      label: "Pedestrian Activity & Footfall",
      weightPercent: 18,
      contributionScore: footfallRiskScore,
      severity:
        footfallRiskScore >= 75
          ? "CRITICAL"
          : footfallRiskScore >= 55
          ? "HIGH"
          : footfallRiskScore >= 35
          ? "MODERATE"
          : "LOW",
      explanation:
        footfallRiskScore >= 55
          ? `Pedestrian activity drops sharply around ${formatHourLabel(
              hour
            )} (footfall index ${input.footfallScore}/100), reducing natural bystanders.`
          : `Consistent pedestrian and shop activity (${input.footfallScore}/100) provides natural surveillance.`,
      preventiveAction:
        "Stay near open commercial frontages and verified 24x7 Safe Havens.",
    },
    {
      id: "temporal",
      label: "Time-Window Escalation Pattern",
      weightPercent: 15,
      contributionScore: temporalRiskScore,
      severity:
        temporalRiskScore >= 75
          ? "CRITICAL"
          : temporalRiskScore >= 55
          ? "HIGH"
          : temporalRiskScore >= 35
          ? "MODERATE"
          : "LOW",
      explanation: `Historical risk peaks between ${input.peakRiskHours}; current evaluation window is ${formatHourLabel(
        hour
      )}.`,
      preventiveAction:
        "Schedule a 15-minute automated check-in timer if travelling during peak evening hours.",
    },
    {
      id: "infrastructure",
      label: "Emergency & Transit Proximity",
      weightPercent: 12,
      contributionScore: infraRiskScore,
      severity:
        infraRiskScore >= 70
          ? "HIGH"
          : infraRiskScore >= 45
          ? "MODERATE"
          : "LOW",
      explanation: `${input.nearestPoliceName} is ${input.nearestPoliceDistM}m away; ${input.nearestTransitName} is ${input.nearestTransitDistM}m away; CCTV coverage is ${input.cctvCoverage}%.`,
      preventiveAction: `Note nearest Safe Haven: ${input.nearestPoliceName} (${input.nearestPoliceDistM}m).`,
    },
    {
      id: "corroboration",
      label: "Community Verification Confidence",
      weightPercent: 13,
      contributionScore: verifiedRiskScore,
      severity:
        verifiedRiskScore >= 70
          ? "HIGH"
          : verifiedRiskScore >= 45
          ? "MODERATE"
          : "LOW",
      explanation: `${input.totalReports} reports, ${input.corroboratedReports} corroborated, ${input.verifiedReports} verified by local safety moderators.`,
      preventiveAction:
        "Review recent time-specific community notes before choosing a walking shortcut.",
    },
  ];
  const factors: RankedRiskFactor[] = [...rawFactors].sort(
    (a, b) => b.contributionScore - a.contributionScore
  );

  const topReasonPhrases: string[] = [];
  for (const f of factors.slice(0, 3)) {
    if (f.id === "lighting" && f.contributionScore >= 45) {
      topReasonPhrases.push(`poor lighting (${input.lightingScore}/100)`);
    } else if (f.id === "incidents" && f.contributionScore >= 45) {
      topReasonPhrases.push(
        `recent incidents (${input.verifiedReports} verified, ${input.corroboratedReports} corroborated)`
      );
    } else if (f.id === "footfall" && f.contributionScore >= 45) {
      topReasonPhrases.push(`low pedestrian activity at ${formatHourLabel(hour)}`);
    } else if (f.id === "infrastructure" && f.contributionScore >= 45) {
      topReasonPhrases.push(
        `emergency assistance ${input.nearestPoliceDistM}m away`
      );
    } else if (f.id === "temporal" && f.contributionScore >= 50) {
      topReasonPhrases.push(`late-hour risk escalation (${input.peakRiskHours})`);
    }
  }

  const headlineReason =
    topReasonPhrases.length > 0
      ? `Risk is ${level.toLowerCase().replace("_", " ")} at ${formatHourLabel(
          hour
        )} because of ${topReasonPhrases.join(", ")}.`
      : `Area maintains a low risk profile at ${formatHourLabel(
          hour
        )} due to strong street lighting (${input.lightingScore}/100), active footfall, and proximity to ${
          input.nearestPoliceName
        } (${input.nearestPoliceDistM}m).`;

  const confidenceSummary = `${input.totalReports} reports, ${input.corroboratedReports} corroborated, ${input.verifiedReports} verified`;

  // Dynamic radius multiplier for time-slider visualization on /explore
  const dynamicRadiusScale = Number(
    (0.82 + (finalScore / 100) * 0.62).toFixed(2)
  );

  return {
    score: finalScore,
    safetyScore,
    level,
    levelLabel: badgeMeta.levelLabel,
    badgeStyle: {
      borderStyle: badgeMeta.borderStyle,
      borderWidthPx: badgeMeta.borderWidthPx,
      iconName: badgeMeta.iconName,
      outlineDescription: badgeMeta.outlineDescription,
    },
    headlineReason,
    whenRiskIncreases: `Risk increases during ${input.peakRiskHours} as commercial shutters close and pedestrian footfall drops below 35%.`,
    howToAvoid: factors[0]?.preventiveAction || "Stay on well-lit arterial corridors.",
    whoCanHelp: `${input.nearestPoliceName} (${input.nearestPoliceDistM}m), ${input.nearestHospitalName} (${input.nearestHospitalDistM}m), and ${input.nearestTransitName} (${input.nearestTransitDistM}m).`,
    confidenceSummary,
    rankedFactors: factors,
    modelFeatureImportances: [
      {
        feature: "Incident Recency & Severity",
        importance: 0.22,
        valueSummary: `${input.verifiedReports} verified (${input.recentIncidentDaysAgo}d ago)`,
      },
      {
        feature: "Street Lighting Deficit",
        importance: 0.20,
        valueSummary: `${input.lightingScore}/100 lighting index`,
      },
      {
        feature: "Footfall & Crowd Isolation",
        importance: 0.18,
        valueSummary: `${input.footfallScore}/100 activity index`,
      },
      {
        feature: "Time-of-Day Multiplier",
        importance: 0.15,
        valueSummary: `${formatHourLabel(hour)} window`,
      },
      {
        feature: "Community Verification Ratio",
        importance: 0.13,
        valueSummary: confidenceSummary,
      },
      {
        feature: "Emergency Infrastructure Distance",
        importance: 0.12,
        valueSummary: `Police ${input.nearestPoliceDistM}m · CCTV ${input.cctvCoverage}%`,
      },
    ],
    dynamicRadiusScale,
  };
}
