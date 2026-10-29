export interface DistressDetectionResult {
  isDistress: boolean;
  isCancelOrSafe: boolean;
  isSelfHarm: boolean;
  matchedPhrase: string | null;
  language: "en" | "hi" | "bn" | null;
  instantReassurance: string;
}

const ENGLISH_DISTRESS_PHRASES = [
  "i feel unsafe",
  "feel unsafe",
  "feeling unsafe",
  "following me",
  "someone is behind me",
  "somebody is behind me",
  "stalking",
  "harass",
  "harassing",
  "attack",
  "attacked",
  "panic",
  "emergency",
  "scared",
  "i am scared",
  "im scared",
  "help me",
  "please help",
  "in danger",
  "unsafe here",
];

const HINDI_DISTRESS_PHRASES = [
  "bachao",
  "madad",
  "madad karo",
  "mujhe dar lag raha",
  "dar lag raha",
  "koi peecha kar raha",
  "peecha kar raha",
  "khatra",
  "asurakshit",
  "बचाओ",
  "मदद",
  "डर लग रहा",
  "पीछा कर रहा",
];

const BENGALI_DISTRESS_PHRASES = [
  "amake bachao",
  "bachao amake",
  "sahajyo koro",
  "bhoy lagche",
  "keu pichhone asche",
  "bipad",
  "আমাকে বাঁচাও",
  "বাঁচাও",
  "ভয় লাগছে",
  "সাহায্য",
];

const SELF_HARM_PHRASES = [
  "hurt myself",
  "end my life",
  "suicide",
  "kill myself",
  "want to die",
];

const SAFE_CANCEL_PHRASES = [
  "cancel",
  "i'm safe",
  "i am safe",
  "im safe",
  "stop sos",
  "cancel sos",
  "false alarm",
  "all good now",
  "main surakshit hoon",
  "ami nirapod",
];

/**
 * Runs synchronously on the client before any API call so Vira can respond in <20ms during distress.
 */
export function detectDistressMessage(
  rawText: string,
  nearestSafeHavenName = "Connaught Place Police Aid Post",
  nearestSafeHavenDistance = "180 meters away"
): DistressDetectionResult {
  const normalized = rawText.trim().toLowerCase();

  if (!normalized) {
    return {
      isDistress: false,
      isCancelOrSafe: false,
      isSelfHarm: false,
      matchedPhrase: null,
      language: null,
      instantReassurance: "",
    };
  }

  for (const phrase of SAFE_CANCEL_PHRASES) {
    if (normalized === phrase || normalized.includes(phrase)) {
      return {
        isDistress: false,
        isCancelOrSafe: true,
        isSelfHarm: false,
        matchedPhrase: phrase,
        language: "en",
        instantReassurance:
          "I have cancelled the alert countdown. I am still right here with you whenever you need me.",
      };
    }
  }

  for (const phrase of SELF_HARM_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isDistress: true,
        isCancelOrSafe: false,
        isSelfHarm: true,
        matchedPhrase: phrase,
        language: "en",
        instantReassurance:
          "I am with you and your life matters deeply. Please contact 112 or reach out to a trusted person right now so someone can support you immediately.",
      };
    }
  }

  // Check repeated "help" or standalone "help"
  const helpCount = (normalized.match(/\bhelp\b/g) || []).length;
  if (helpCount >= 1 || normalized === "sos") {
    return {
      isDistress: true,
      isCancelOrSafe: false,
      isSelfHarm: false,
      matchedPhrase: helpCount > 1 ? "repeated help" : "help",
      language: "en",
      instantReassurance: `I am with you. Move toward ${nearestSafeHavenName}, ${nearestSafeHavenDistance}. Starting the 5-second SOS countdown now, say cancel if you are safe.`,
    };
  }

  for (const phrase of ENGLISH_DISTRESS_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isDistress: true,
        isCancelOrSafe: false,
        isSelfHarm: false,
        matchedPhrase: phrase,
        language: "en",
        instantReassurance: `I am with you. Head toward a well-lit area near ${nearestSafeHavenName}, ${nearestSafeHavenDistance}. I am starting the 5-second SOS countdown now.`,
      };
    }
  }

  for (const phrase of BENGALI_DISTRESS_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isDistress: true,
        isCancelOrSafe: false,
        isSelfHarm: false,
        matchedPhrase: phrase,
        language: "bn",
        instantReassurance: `I am with you. Move toward ${nearestSafeHavenName}, ${nearestSafeHavenDistance}. Starting the 5-second SOS countdown now, say cancel if you are safe.`,
      };
    }
  }

  for (const phrase of HINDI_DISTRESS_PHRASES) {
    if (normalized.includes(phrase)) {
      return {
        isDistress: true,
        isCancelOrSafe: false,
        isSelfHarm: false,
        matchedPhrase: phrase,
        language: "hi",
        instantReassurance: `I am with you. Move toward ${nearestSafeHavenName}, ${nearestSafeHavenDistance}. Starting the 5-second SOS countdown now, say cancel if you are safe.`,
      };
    }
  }

  return {
    isDistress: false,
    isCancelOrSafe: false,
    isSelfHarm: false,
    matchedPhrase: null,
    language: null,
    instantReassurance: "",
  };
}

/**
 * Server-side post-processor that strips emojis, markdown, and caps distress replies at 3 short spoken sentences.
 */
export function sanitizeSpokenViraReply(
  text: string,
  isDistressMode = false
): string {
  // Strip markdown formatting, bullet points, and emojis
  let cleaned = text
    .replace(/[*_~`#>-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // Never allow "calm down"
  cleaned = cleaned.replace(/calm down/gi, "take a steady breath");

  if (isDistressMode) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return sentences.slice(0, 3).join(" ");
  }

  return cleaned;
}
