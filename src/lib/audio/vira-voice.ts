/**
 * Vira Voice Engine - High Quality Female Voice Synthesis
 * Dynamically selects and tunes the best natural female voice across Windows, Mac, iOS, Android, and Linux.
 */

export interface ViraSpeechOptions {
  isDistress?: boolean;
  lang?: "en-IN" | "hi-IN" | "bn-IN" | string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
}

// Preferred high-quality natural female voices across OS and browsers
const PREFERRED_FEMALE_VOICES = [
  // Windows 10/11 & Edge Natural Neural Voices
  "microsoft zira",
  "microsoft aria online (natural)",
  "microsoft aria",
  "microsoft jenny online (natural)",
  "microsoft jenny",
  "microsoft neerja online (natural)",
  "microsoft neerja",
  "microsoft swara",
  "microsoft veena",
  "microsoft heera",

  // macOS / iOS Siri & System Female Voices
  "samantha",
  "siri",
  "karen",
  "victoria",
  "serena",
  "tessa",
  "moira",
  "fiona",

  // Google Chrome & Android Natural Voices
  "google us english female",
  "google us english",
  "google uk english female",
  "google हिन्दी",
  "google bengali",
];

export function getBestFemaleVoice(
  voices: SpeechSynthesisVoice[],
  lang: string = "en-IN"
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const langPrefix = lang.split("-")[0].toLowerCase();

  // 1. Match preferred high-quality female voice by name in preferred language
  for (const preferred of PREFERRED_FEMALE_VOICES) {
    const match = voices.find(
      (v) =>
        v.name.toLowerCase().includes(preferred) &&
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (match) return match;
  }

  // 2. Match any preferred female voice across English if target is en
  for (const preferred of PREFERRED_FEMALE_VOICES) {
    const match = voices.find((v) => v.name.toLowerCase().includes(preferred));
    if (match) return match;
  }

  // 3. Search for voices with "female", "woman", or "girl" in the name
  const genericFemale = voices.find((v) => {
    const n = v.name.toLowerCase();
    return (
      (n.includes("female") || n.includes("woman") || n.includes("girl")) &&
      v.lang.toLowerCase().startsWith(langPrefix)
    );
  });
  if (genericFemale) return genericFemale;

  // 4. Any voice matching language
  const langMatch = voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );
  if (langMatch) return langMatch;

  // 5. Fallback to first voice (pitch tuning will give feminine tone)
  return voices[0] || null;
}

export function playViraVoice(
  text: string,
  options: ViraSpeechOptions = {}
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return null;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const targetLang = options.lang || "en-IN";
    utterance.lang = targetLang;

    const femaleVoice = getBestFemaleVoice(voices, targetLang);
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Set feminine pitch (1.14 - 1.18) and natural conversational pacing (0.94 - 0.98)
    const isDistress = Boolean(options.isDistress);
    utterance.pitch = options.pitch ?? (isDistress ? 1.18 : 1.14);
    utterance.rate = options.rate ?? (isDistress ? 0.90 : 0.96);

    if (options.onStart) utterance.onstart = options.onStart;
    if (options.onEnd) utterance.onend = options.onEnd;
    if (options.onError) utterance.onerror = options.onError;

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch (err) {
    console.warn("Vira voice synthesis warning:", err);
    if (options.onError) options.onError();
    return null;
  }
}
