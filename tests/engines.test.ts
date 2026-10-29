import { describe, it, expect } from "vitest";
import {
  evaluateAreaRisk,
  RiskFactorInput,
} from "../src/lib/engine/risk-engine";
import {
  computeEvidenceHash,
  GENESIS_PREV_HASH,
  StoredEvidenceNode,
  verifyEvidenceTimeline,
} from "../src/lib/engine/evidence-chain";
import { parseViraIntent } from "../src/lib/engine/vira-intents";
import { detectDistressMessage } from "../src/lib/engine/distress-detector";

describe("VIRA Explainable Risk Engine", () => {
  const sampleHighRiskCorridor: RiskFactorInput = {
    slug: "minto-bridge-underpass-lane",
    name: "Minto Bridge Underpass Service Corridor",
    corridorName: "Minto Road Railway Underpass",
    lightingScore: 28,
    footfallScore: 24,
    cctvCoverage: 42,
    totalReports: 19,
    corroboratedReports: 13,
    verifiedReports: 6,
    baseSeverity: 88,
    recentIncidentDaysAgo: 2,
    nearestPoliceName: "Barakhamba Road Police Booth",
    nearestPoliceDistM: 1120,
    nearestHospitalName: "LNJP Emergency Trauma Wing",
    nearestHospitalDistM: 1450,
    nearestTransitName: "Shivaji Bridge Station",
    nearestTransitDistM: 880,
    peakRiskHours: "21:30 - 02:00",
  };

  const sampleSafeCorridor: RiskFactorInput = {
    slug: "connaught-place-inner-circle",
    name: "Connaught Place Inner Circle Safe Corridor",
    corridorName: "Rajiv Chowk Block A-F Colonnade",
    lightingScore: 94,
    footfallScore: 90,
    cctvCoverage: 95,
    totalReports: 4,
    corroboratedReports: 3,
    verifiedReports: 0,
    baseSeverity: 16,
    recentIncidentDaysAgo: 26,
    nearestPoliceName: "Connaught Place Police Aid Post",
    nearestPoliceDistM: 140,
    nearestHospitalName: "RML Hospital Emergency",
    nearestHospitalDistM: 1100,
    nearestTransitName: "Rajiv Chowk Metro Gate 6",
    nearestTransitDistM: 110,
    peakRiskHours: "00:30 - 04:00",
  };

  it("scores a poorly lit underpass significantly higher at 11 PM than at 11 AM and explains why", () => {
    const dayEval = evaluateAreaRisk(sampleHighRiskCorridor, { hourOfDay: 11 });
    const nightEval = evaluateAreaRisk(sampleHighRiskCorridor, { hourOfDay: 23 });

    expect(nightEval.score).toBeGreaterThan(dayEval.score);
    expect(nightEval.score).toBeGreaterThanOrEqual(65);
    expect(["HIGH", "ACTIVE_INCIDENT"]).toContain(nightEval.level);
    expect(nightEval.headlineReason).toContain("because of");
    expect(nightEval.rankedFactors.length).toBe(6);
    expect(nightEval.confidenceSummary).toBe(
      "19 reports, 13 corroborated, 6 verified"
    );
  });

  it("scores a well-lit corridor with nearby police as LOW risk", () => {
    const safeEval = evaluateAreaRisk(sampleSafeCorridor, { hourOfDay: 20 });
    expect(safeEval.score).toBeLessThan(25);
    expect(safeEval.level).toBe("LOW");
    expect(safeEval.badgeStyle.iconName).toBe("ShieldCheck");
  });
});

describe("SHA-256 Hash-Chained Evidence Vault", () => {
  it("verifies an intact chain of safety events and detects payload tampering", () => {
    const block1Payload = {
      sequenceNumber: 1,
      userId: "user-1",
      eventType: "TRUSTED_CIRCLE_NOTIFIED",
      placeName: "Connaught Place Inner Circle",
      summary: "Trusted Circle sharing started",
      detailsJson: JSON.stringify({ contact: "Mom" }),
      timestampIso: "2026-10-28T15:00:00.000Z",
      prevHash: GENESIS_PREV_HASH,
    };
    const hash1 = computeEvidenceHash(block1Payload);

    const block2Payload = {
      sequenceNumber: 2,
      userId: "user-1",
      eventType: "SOS_TRIGGERED",
      placeName: "Minto Bridge Underpass Service Corridor",
      summary: "Emergency SOS triggered by user",
      detailsJson: JSON.stringify({ countdown: 0 }),
      timestampIso: "2026-10-28T15:12:00.000Z",
      prevHash: hash1,
    };
    const hash2 = computeEvidenceHash(block2Payload);

    const chain: StoredEvidenceNode[] = [
      { id: "ev-1", ...block1Payload, currentHash: hash1 },
      { id: "ev-2", ...block2Payload, currentHash: hash2 },
    ];

    const intactResult = verifyEvidenceTimeline(chain);
    expect(intactResult.valid).toBe(true);
    expect(intactResult.verifiedCount).toBe(2);

    // Tamper with block 1 placeName
    const tamperedChain: StoredEvidenceNode[] = [
      {
        ...chain[0],
        placeName: "Altered Place Name After Incident",
      },
      chain[1],
    ];

    const tamperedResult = verifyEvidenceTimeline(tamperedChain);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.tamperedSequenceNumber).toBe(1);
  });
});

describe("Vira Typed Intent Parser & Multilingual Distress Detector", () => {
  const sampleContext = {
    currentPage: "/explore",
    selectedPlaceName: "Connaught Place Inner Circle",
    nearestSafeHaven: {
      name: "Connaught Place Shakti Pink Police Booth",
      category: "POLICE_BOOTH",
      distanceText: "140 meters away",
      placeName: "Connaught Place Inner Circle",
    },
    activeRiskZones: [
      {
        name: "Minto Bridge Underpass Service Corridor",
        slug: "minto-bridge-underpass-lane",
        score: 84,
        level: "HIGH",
        headlineReason:
          "Risk is high because of poor lighting (28/100) and 6 verified reports.",
      },
    ],
  };

  it("detects distress phrases in English, Hindi, and Bengali immediately", () => {
    const en = detectDistressMessage("Someone is behind me and I feel unsafe");
    expect(en.isDistress).toBe(true);
    expect(en.language).toBe("en");

    const hi = detectDistressMessage("Mujhe dar lag raha hai koi peecha kar raha");
    expect(hi.isDistress).toBe(true);
    expect(hi.language).toBe("hi");

    const bn = detectDistressMessage("Amake bachao bhoy lagche");
    expect(bn.isDistress).toBe(true);
    expect(bn.language).toBe("bn");

    const cancel = detectDistressMessage("I'm safe now cancel");
    expect(cancel.isCancelOrSafe).toBe(true);
  });

  it("parses route planning, check-in timers, trusted circle sharing, and safety queries", () => {
    const routeIntent = parseViraIntent(
      "plan my route from Connaught Place to Hauz Khas",
      sampleContext
    );
    expect(routeIntent.type).toBe("PLAN_ROUTE");
    expect(routeIntent.originPlace).toBe("Connaught Place");
    expect(routeIntent.destinationPlace).toBe("Hauz Khas");

    const checkinIntent = parseViraIntent(
      "start check-in for 15 minutes",
      sampleContext
    );
    expect(checkinIntent.type).toBe("START_CHECKIN");
    expect(checkinIntent.durationMinutes).toBe(15);

    const shareIntent = parseViraIntent(
      "share my journey with Mom",
      sampleContext
    );
    expect(shareIntent.type).toBe("SHARE_TRUSTED_CIRCLE");
    expect(shareIntent.contactName).toBe("Mom");

    const riskyIntent = parseViraIntent(
      "which areas are risky tonight",
      sampleContext
    );
    expect(riskyIntent.type).toBe("RISKY_AREAS_TONIGHT");
    expect(riskyIntent.spokenReply).toContain("Minto Bridge Underpass");
  });
});
