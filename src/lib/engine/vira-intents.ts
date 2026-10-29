import { detectDistressMessage, sanitizeSpokenViraReply } from "./distress-detector";

export type ViraIntentType =
  | "NAVIGATE_PAGE"
  | "PLAN_ROUTE"
  | "CHECK_PLACE_SAFETY"
  | "RISKY_AREAS_TONIGHT"
  | "NEAREST_SAFE_HAVEN"
  | "START_CHECKIN"
  | "SHARE_TRUSTED_CIRCLE"
  | "TOGGLE_OFFLINE_MODE"
  | "START_GUIDED_TOUR"
  | "DISTRESS_ALERT"
  | "CANCEL_DISTRESS"
  | "EXPLAIN_PLATFORM"
  | "GENERAL_COMPANION";

export interface ViraTypedIntent {
  type: ViraIntentType;
  targetPath?: string;
  originPlace?: string;
  destinationPlace?: string;
  placeQuery?: string;
  timeQuery?: string;
  durationMinutes?: number;
  contactName?: string;
  offlineEnabled?: boolean;
  spokenReply: string;
  nextStepSuggestion: string;
}

export interface ViraContextSnapshot {
  currentPage: string;
  selectedPlaceName?: string;
  timeSliderHour?: number;
  nearestSafeHaven?: {
    name: string;
    category: string;
    distanceText: string;
    placeName: string;
  };
  activeRiskZones?: Array<{
    name: string;
    slug: string;
    score: number;
    level: string;
    headlineReason: string;
  }>;
}

const PAGE_MAP: Array<{ keywords: string[]; path: string; label: string }> = [
  { keywords: ["explore", "discovery map", "safety map", "open map"], path: "/explore", label: "Safety Discovery Map" },
  { keywords: ["planner", "safe journey", "route planner"], path: "/planner", label: "AI Safe Journey Planner" },
  { keywords: ["live journey", "monitored journey", "journey page"], path: "/journey", label: "Live Journey Monitor" },
  { keywords: ["trusted circle", "contacts", "my circle"], path: "/circle", label: "Trusted Circle" },
  { keywords: ["evidence", "vault", "timeline"], path: "/evidence", label: "Evidence Vault" },
  { keywords: ["review", "reviews", "community report"], path: "/reviews", label: "Community Safety Reviews" },
  { keywords: ["alert", "alerts", "advisories"], path: "/alerts", label: "Real-Time Safety Alerts" },
  { keywords: ["sos page", "emergency page"], path: "/sos", label: "Emergency SOS Center" },
  { keywords: ["setting", "settings", "privacy"], path: "/settings", label: "Offline and Privacy Settings" },
  { keywords: ["admin", "authority dashboard"], path: "/admin", label: "Institutional Safety Dashboard" },
];

/**
 * Deterministic parser that converts user natural-language commands into a typed intent + spoken reply.
 */
export function parseViraIntent(
  rawMessage: string,
  context: ViraContextSnapshot
): ViraTypedIntent {
  const text = rawMessage.trim();
  const lower = text.toLowerCase();

  const nearestHavenName =
    context.nearestSafeHaven?.name || "Connaught Place Police Aid Post";
  const nearestHavenDist =
    context.nearestSafeHaven?.distanceText || "180 meters away";

  // 1. Check distress or cancel first
  const distressCheck = detectDistressMessage(
    text,
    nearestHavenName,
    nearestHavenDist
  );

  if (distressCheck.isCancelOrSafe) {
    return {
      type: "CANCEL_DISTRESS",
      spokenReply: distressCheck.instantReassurance,
      nextStepSuggestion: "Would you like me to find the nearest safe haven or plan a route home?",
    };
  }

  if (distressCheck.isDistress) {
    return {
      type: "DISTRESS_ALERT",
      spokenReply: sanitizeSpokenViraReply(distressCheck.instantReassurance, true),
      nextStepSuggestion: "Tap Start SOS, Call 112, or Share Live Location.",
    };
  }

  // 2. Guided Tour / Explain how this works
  if (
    lower.includes("how does vira work") ||
    lower.includes("explain how this works") ||
    lower.includes("guided tour") ||
    lower.includes("what can you do")
  ) {
    return {
      type: "START_GUIDED_TOUR",
      targetPath: "/explore",
      spokenReply:
        "Vira predicts risk before an emergency, explains why an area is risky using lighting, footfall, and verified reports, and plans safer routes automatically. I can also start a guided tour across the discovery map, journey planner, trusted circle, and evidence vault. Would you like to step through the tour now?",
      nextStepSuggestion: "Step through the interactive guided tour",
    };
  }

  // 3. Plan route from X to Y ("plan my route from Hauz Khas Village to Connaught Place" or "plan my route")
  const fromToMatch = text.match(
    /(?:plan(?: my)? (?:safe )?(?:route|journey)|go|navigate|route)\s+from\s+([a-zA-Z0-9\s,.-]+?)\s+to\s+([a-zA-Z0-9\s,.-]+)/i
  );
  if (fromToMatch) {
    const origin = fromToMatch[1].trim();
    const destination = fromToMatch[2].trim();
    return {
      type: "PLAN_ROUTE",
      targetPath: "/planner",
      originPlace: origin,
      destinationPlace: destination,
      spokenReply: sanitizeSpokenViraReply(
        `I am opening the Safe Journey Planner from ${origin} to ${destination} and comparing the fastest, balanced, and safest routes against active risk zones. Would you like to start live journey monitoring once your safest route loads?`
      ),
      nextStepSuggestion: `Start monitored journey to ${destination}`,
    };
  }

  if (lower.includes("plan my route") || lower.includes("plan a safe route")) {
    return {
      type: "PLAN_ROUTE",
      targetPath: "/planner",
      originPlace: context.selectedPlaceName || "Connaught Place Inner Circle",
      destinationPlace: "Hauz Khas Metro Station",
      spokenReply:
        "Opening the AI Safe Journey Planner now. I have pre-filled a safe route comparison showing lighting, verified reports, and 24 by 7 safe stops along the way. Would you like me to select the safest route option?",
      nextStepSuggestion: "Select the Safest Route card",
    };
  }

  // 4. Nearest safe place / safe haven
  if (
    lower.includes("nearest safe") ||
    lower.includes("safe haven") ||
    lower.includes("safe place") ||
    lower.includes("where can i get help")
  ) {
    return {
      type: "NEAREST_SAFE_HAVEN",
      targetPath: "/explore",
      spokenReply: sanitizeSpokenViraReply(
        `The nearest verified safe haven is ${nearestHavenName}, located ${nearestHavenDist}. I have highlighted it on the Safety Discovery Map so you can head there directly.`
      ),
      nextStepSuggestion: `View directions to ${nearestHavenName}`,
    };
  }

  // 5. Which areas are risky tonight
  if (
    lower.includes("risky areas tonight") ||
    lower.includes("which areas are risky") ||
    lower.includes("high risk zones") ||
    lower.includes("red zones")
  ) {
    const zones = context.activeRiskZones || [];
    const topZones = [...zones].sort((a, b) => b.score - a.score).slice(0, 2);
    if (topZones.length > 0) {
      const summary = topZones
        .map((z) => `${z.name} with a risk score of ${z.score} because ${z.headlineReason.replace(/^Risk is [^b]+because of /i, "")}`)
        .join(" Next is ");
      return {
        type: "RISKY_AREAS_TONIGHT",
        targetPath: "/explore",
        spokenReply: sanitizeSpokenViraReply(
          `Tonight's highest risk corridor is ${summary} Would you like me to plan a route that avoids these segments?`
        ),
        nextStepSuggestion: "Plan a route avoiding elevated risk corridors",
      };
    }

    return {
      type: "RISKY_AREAS_TONIGHT",
      targetPath: "/explore",
      spokenReply:
        "Tonight, risk is highest along poorly lit underpass corridors and quiet service lanes between 9 PM and 1 AM. I am opening the discovery map so you can inspect the exact reasons for each road segment.",
      nextStepSuggestion: "Inspect road segments on the map",
    };
  }

  // 6. Is it safe to go to X at Y time?
  const safeToGoMatch = text.match(
    /is it safe (?:to go )?(?:to |in |near )?([a-zA-Z0-9\s-]+?)(?:\s+at\s+([0-9:apmAPM\s]+))?[?.!]*$/i
  );
  if (safeToGoMatch || lower.startsWith("is it safe")) {
    const placeRaw = safeToGoMatch?.[1]?.trim() || context.selectedPlaceName || "this area";
    const timeRaw = safeToGoMatch?.[2]?.trim() || "tonight";
    const matchingZone = (context.activeRiskZones || []).find(
      (z) =>
        z.name.toLowerCase().includes(placeRaw.toLowerCase()) ||
        placeRaw.toLowerCase().includes(z.name.toLowerCase().split(" ")[0])
    );

    if (matchingZone) {
      return {
        type: "CHECK_PLACE_SAFETY",
        placeQuery: matchingZone.name,
        timeQuery: timeRaw,
        targetPath: `/places/${matchingZone.slug}`,
        spokenReply: sanitizeSpokenViraReply(
          `For ${matchingZone.name} around ${timeRaw}, the risk score is ${matchingZone.score} out of 100. ${matchingZone.headlineReason} Would you like me to open its area safety page or plan a well-lit route there?`
        ),
        nextStepSuggestion: `Open ${matchingZone.name} safety breakdown`,
      };
    }

    return {
      type: "CHECK_PLACE_SAFETY",
      placeQuery: placeRaw,
      timeQuery: timeRaw,
      targetPath: "/explore",
      spokenReply: sanitizeSpokenViraReply(
        `Let us check ${placeRaw} for ${timeRaw}. Based on our current safety context, staying on main lit corridors and setting a check-in timer keeps your risk low. Would you like to compare safe routes to ${placeRaw}?`
      ),
      nextStepSuggestion: `Plan a safe route to ${placeRaw}`,
    };
  }

  // 7. Start check-in timer ("start check-in for 15 minutes")
  if (lower.includes("check-in") || lower.includes("check in")) {
    const minMatch = lower.match(/(\d+)\s*(?:min|minute)/);
    const minutes = minMatch ? parseInt(minMatch[1], 10) : 15;
    return {
      type: "START_CHECKIN",
      targetPath: "/journey",
      durationMinutes: minutes,
      spokenReply: `I have started a ${minutes}-minute safe-arrival check-in timer on your Live Journey monitor. If you miss the check-in, I will ask if you are okay before notifying your trusted circle.`,
      nextStepSuggestion: "View active check-in timer on Live Journey",
    };
  }

  // 8. Share journey with Trusted Circle ("share my journey with Mom")
  if (
    lower.includes("share my journey") ||
    lower.includes("share location with") ||
    lower.includes("notify trusted circle") ||
    lower.includes("share with")
  ) {
    const withMatch = text.match(/with\s+([a-zA-Z\s]+)$/i);
    const contactName = withMatch ? withMatch[1].trim() : "your Trusted Circle";
    return {
      type: "SHARE_TRUSTED_CIRCLE",
      targetPath: "/circle",
      contactName,
      spokenReply: sanitizeSpokenViraReply(
        `I have enabled temporary, consent-based journey sharing with ${contactName}. Sharing will automatically end as soon as you arrive safely.`
      ),
      nextStepSuggestion: "Manage consent settings in Trusted Circle",
    };
  }

  // 9. Turn on offline mode
  if (lower.includes("offline mode") || lower.includes("work offline")) {
    const enable = !lower.includes("off");
    return {
      type: "TOGGLE_OFFLINE_MODE",
      targetPath: "/settings",
      offlineEnabled: enable,
      spokenReply:
        "I have activated Offline Safety Mode and cached your local risk zones, safe havens, and emergency SMS fallback templates on this device. Would you like to review your offline emergency SMS card?",
      nextStepSuggestion: "Review Offline Safety Snapshot in Settings",
    };
  }

  // 10. Open any page
  for (const page of PAGE_MAP) {
    if (page.keywords.some((kw) => lower.includes(kw))) {
      return {
        type: "NAVIGATE_PAGE",
        targetPath: page.path,
        spokenReply: `Opening ${page.label} for you now. Let me know if you want me to explain any safety score on this screen.`,
        nextStepSuggestion: `Explore ${page.label}`,
      };
    }
  }

  // Default companion reply
  return {
    type: "GENERAL_COMPANION",
    spokenReply: sanitizeSpokenViraReply(
      `I am Vira, your predictive safety companion. Currently you are on ${context.currentPage}, and your nearest safe haven is ${nearestHavenName}, ${nearestHavenDist}. You can ask me to plan a safe route, check which areas are risky tonight, or start a check-in timer.`
    ),
    nextStepSuggestion: "Plan a safe route or inspect risky areas tonight",
  };
}
