"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Maximize2,
  Minimize2,
  X,
  Send,
  Sparkles,
  PhoneCall,
  Users,
  ShieldCheck,
  Compass,
  ArrowRight,
} from "lucide-react";
import { useSafetyStore } from "@/store/useSafetyStore";
import { detectDistressMessage } from "@/lib/engine/distress-detector";
import { ViraTypedIntent } from "@/lib/engine/vira-intents";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { getBestFemaleVoice } from "@/lib/audio/vira-voice";

const ViraAvatar3D = dynamic(() => import("./ViraAvatar3D"), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full rounded-card bg-blush-deep border border-border-rose flex items-center justify-center text-xs font-semibold text-ink-muted">
      Loading Vira 3D Avatar...
    </div>
  ),
});

const QUICK_CHIPS = [
  "How does Vira work?",
  "Risky areas tonight",
  "Nearest safe place",
  "Plan my route",
  "I feel unsafe",
] as const;

const GUIDED_TOUR_STEPS = [
  {
    title: "1. Safety Discovery Map (/explore)",
    path: "/explore",
    narration:
      "This is the Safety Discovery Map. Slide the time bar from 6 PM to 2 AM to see how road segment risk changes dynamically, and click any zone to read why.",
  },
  {
    title: "2. AI Safe Journey Planner (/planner)",
    path: "/planner",
    narration:
      "This is the AI Safe Journey Planner. We compare Fastest, Balanced, and Safest routes using place names, showing lighting, verified reports, and 24 by 7 safe stops.",
  },
  {
    title: "3. Live Journey Monitor (/journey)",
    path: "/journey",
    narration:
      "During your commute, Live Journey watches for unexpected route deviations and runs your safe-arrival check-in timer.",
  },
  {
    title: "4. Consent-First Trusted Circle (/circle)",
    path: "/circle",
    narration:
      "Your Trusted Circle lets you choose who sees your journey, when, and for how long. Sharing ends automatically when you arrive.",
  },
  {
    title: "5. SHA-256 Evidence Vault (/evidence)",
    path: "/evidence",
    narration:
      "Every SOS, deviation, and distress alert is cryptographically chained in the Evidence Vault so tampering can always be detected.",
  },
];

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  nextStepSuggestion?: string;
  intent?: ViraTypedIntent;
}

export function ViraCompanionPanel() {
  const pathname = usePathname();
  const router = useRouter();

  const {
    currentPlaceName,
    timeSliderHour,
    viraOpen,
    viraFullScreen,
    viraAvatarState,
    viraMuted,
    viraDistressActive,
    viraLastSpokenText,
    viraGuidedTourActive,
    viraGuidedTourStep,
    setViraOpen,
    setViraFullScreen,
    setViraAvatarState,
    setViraMuted,
    setViraDistressActive,
    setViraLastSpokenText,
    setViraGuidedTour,
    setHighlightedSafeHavenId,
    startSosCountdown,
    cancelSos,
    setCheckInTimer,
    setOfflineModeEnabled,
  } = useSafetyStore();

  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hi, I am Vira, your predictive safety companion. Ask me why an area is risky, plan a safe route, or tap I feel unsafe for immediate support.",
      nextStepSuggestion: "Plan my safe route",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechLang, setSpeechLang] = useState<"en-IN" | "hi-IN" | "bn-IN">(
    "en-IN"
  );
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speakingAmplitude, setSpeakingAmplitude] = useState(0.5);
  const [loadingReply, setLoadingReply] = useState(false);

  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    abort: () => void;
  } | null>(null);
  const ampIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check Web Speech API support on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRec));
  }, []);

  // Speak text aloud using speechSynthesis
  const speakAloud = useCallback(
    (text: string, isDistress = false) => {
      setViraLastSpokenText(text);
      if (viraMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
        setViraAvatarState(isDistress ? "distress" : "idle");
        return;
      }

      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = speechLang;
        const voices = window.speechSynthesis.getVoices();
        const femaleVoice = getBestFemaleVoice(voices, speechLang);

        if (femaleVoice) utterance.voice = femaleVoice;
        utterance.rate = isDistress ? 0.90 : 0.96;
        utterance.pitch = isDistress ? 1.18 : 1.15;

        utterance.onstart = () => {
          setViraAvatarState(isDistress ? "distress" : "speaking");
          if (ampIntervalRef.current) clearInterval(ampIntervalRef.current);
          ampIntervalRef.current = setInterval(() => {
            setSpeakingAmplitude(0.35 + Math.random() * 0.65);
          }, 120);
        };

        utterance.onboundary = () => {
          setSpeakingAmplitude(0.5 + Math.random() * 0.5);
        };

        utterance.onend = () => {
          if (ampIntervalRef.current) clearInterval(ampIntervalRef.current);
          setViraAvatarState(
            isDistress || viraDistressActive ? "distress" : "idle"
          );
        };

        utterance.onerror = () => {
          if (ampIntervalRef.current) clearInterval(ampIntervalRef.current);
          setViraAvatarState(
            isDistress || viraDistressActive ? "distress" : "idle"
          );
        };

        window.speechSynthesis.speak(utterance);
      } catch {
        setViraAvatarState(isDistress ? "distress" : "idle");
      }
    },
    [viraMuted, viraDistressActive, setViraAvatarState, setViraLastSpokenText]
  );

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    if (ampIntervalRef.current) clearInterval(ampIntervalRef.current);
    setViraAvatarState(viraDistressActive ? "distress" : "idle");
  };

  // Execute typed intent actions dispatched by Vira
  const executeIntentAction = useCallback(
    (intent: ViraTypedIntent) => {
      switch (intent.type) {
        case "NAVIGATE_PAGE":
        case "RISKY_AREAS_TONIGHT":
        case "CHECK_PLACE_SAFETY":
          if (intent.targetPath && intent.targetPath !== pathname) {
            router.push(intent.targetPath);
          }
          break;
        case "PLAN_ROUTE": {
          const params = new URLSearchParams();
          if (intent.originPlace) params.set("start", intent.originPlace);
          if (intent.destinationPlace) params.set("dest", intent.destinationPlace);
          router.push(`/planner?${params.toString()}`);
          break;
        }
        case "NEAREST_SAFE_HAVEN":
          setHighlightedSafeHavenId("nearest");
          if (pathname !== "/explore") router.push("/explore");
          break;
        case "START_CHECKIN":
          setCheckInTimer(intent.durationMinutes || 15);
          if (pathname !== "/journey") router.push("/journey");
          break;
        case "SHARE_TRUSTED_CIRCLE":
          if (pathname !== "/circle") router.push("/circle");
          break;
        case "TOGGLE_OFFLINE_MODE":
          setOfflineModeEnabled(intent.offlineEnabled ?? true);
          break;
        case "START_GUIDED_TOUR":
          setViraGuidedTour(true, 0);
          router.push(GUIDED_TOUR_STEPS[0].path);
          break;
        case "CANCEL_DISTRESS":
          cancelSos();
          break;
        default:
          break;
      }
    },
    [
      pathname,
      router,
      setHighlightedSafeHavenId,
      setCheckInTimer,
      setOfflineModeEnabled,
      setViraGuidedTour,
      cancelSos,
    ]
  );

  // Send message (runs client-side distress detector BEFORE API call)
  const handleSendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      // Interrupt any active speech when user speaks/sends
      stopSpeech();
      setInputText("");
      setInterimTranscript("");

      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev.slice(-9), userTurn]);

      // 1. Client-side pre-API distress check (<20ms response)
      const distressResult = detectDistressMessage(
        trimmed,
        "Connaught Place Shakti Pink Police Booth",
        "140 meters away"
      );

      if (distressResult.isCancelOrSafe) {
        cancelSos();
        const safeReply = distressResult.instantReassurance;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: safeReply,
            nextStepSuggestion: "Plan a safe route home",
          },
        ]);
        speakAloud(safeReply, false);
        return;
      }

      if (distressResult.isDistress) {
        setViraDistressActive(true);
        const instantText = distressResult.instantReassurance;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-distress-${Date.now()}`,
            role: "assistant",
            content: instantText,
            nextStepSuggestion:
              "Move toward Connaught Place Shakti Pink Police Booth (140m)",
          },
        ]);
        speakAloud(instantText, true);
        startSosCountdown(
          `Vira Distress Detector (${
            distressResult.matchedPhrase || "unsafe"
          })`,
          false
        );

        // Log distress event automatically to Evidence Vault
        fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "DISTRESS_DETECTED",
            placeName: currentPlaceName,
            summary: `Vira client-side distress detector activated (${
              distressResult.language?.toUpperCase() || "EN"
            } phrase: "${distressResult.matchedPhrase}"). Instant reassurance and 5s SOS countdown started.`,
            details: {
              matchedPhrase: distressResult.matchedPhrase,
              language: distressResult.language,
              nearestSafeHaven: "Connaught Place Shakti Pink Police Booth (140m)",
            },
          }),
        }).catch(() => {});
        return;
      }

      // 2. Call /api/vira/chat for typed intent + contextual answer
      setLoadingReply(true);
      try {
        const res = await fetch("/api/vira/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            messages: [...messages.slice(-9), userTurn].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: {
              currentPage: pathname,
              selectedPlaceName: currentPlaceName,
              timeSliderHour,
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
                    "Risk is high because of poor lighting (28/100), 6 verified reports, and low footfall after 9:30 PM.",
                },
                {
                  name: "Hauz Khas Village Deer Park Approach Lane",
                  slug: "hauz-khas-deer-park-approach",
                  score: 74,
                  level: "HIGH",
                  headlineReason:
                    "Risk is elevated after 10 PM due to 44/100 park-wall lighting and 11 corroborated reports.",
                },
              ],
            },
          }),
        });

        const data = await res.json();
        const replyText =
          data.reply ||
          "I am here with you. Let me know how I can help make your journey safer.";
        const intent: ViraTypedIntent | undefined = data.intent;

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: replyText,
            nextStepSuggestion: intent?.nextStepSuggestion,
            intent,
          },
        ]);

        speakAloud(replyText, intent?.type === "DISTRESS_ALERT");
        if (intent) {
          executeIntentAction(intent);
        }
      } catch {
        const fallback =
          "I am right here with you. You can ask me to plan a safe route, highlight the nearest safe haven, or start a check-in timer.";
        setMessages((prev) => [
          ...prev,
          {
            id: `a-err-${Date.now()}`,
            role: "assistant",
            content: fallback,
          },
        ]);
        speakAloud(fallback, false);
      } finally {
        setLoadingReply(false);
      }
    },
    [
      currentPlaceName,
      pathname,
      timeSliderHour,
      messages,
      cancelSos,
      setViraDistressActive,
      speakAloud,
      startSosCountdown,
      executeIntentAction,
    ]
  );

  // Start microphone listening (asks permission ONLY when mic is tapped)
  const toggleListening = () => {
    if (viraAvatarState === "listening") {
      recognitionRef.current?.stop();
      setViraAvatarState(viraDistressActive ? "distress" : "idle");
      return;
    }

    stopSpeech();

    const SpeechRecConstructor =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecConstructor) {
      setSpeechSupported(false);
      return;
    }

    try {
      const rec = new SpeechRecConstructor() as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onstart: () => void;
        onresult: (event: {
          results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
        }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
        abort: () => void;
      };

      rec.lang = speechLang;
      rec.continuous = handsFreeMode;
      rec.interimResults = true;

      rec.onstart = () => {
        setViraAvatarState("listening");
      };

      rec.onresult = (event) => {
        let interim = "";
        let finalTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }
        setInterimTranscript(interim);
        if (finalTranscript.trim()) {
          handleSendMessage(finalTranscript.trim());
        }
      };

      rec.onerror = () => {
        setViraAvatarState(viraDistressActive ? "distress" : "idle");
      };

      rec.onend = () => {
        setInterimTranscript("");
        setViraAvatarState(viraDistressActive ? "distress" : "idle");
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setSpeechSupported(false);
    }
  };

  // Advance Guided Tour
  const handleNextTourStep = () => {
    const nextIdx = viraGuidedTourStep + 1;
    if (nextIdx >= GUIDED_TOUR_STEPS.length) {
      setViraGuidedTour(false, 0);
      speakAloud(
        "That completes our guided tour of Vira. I am always available in the corner whenever you need me.",
        false
      );
      return;
    }
    const step = GUIDED_TOUR_STEPS[nextIdx];
    setViraGuidedTour(true, nextIdx);
    router.push(step.path);
    speakAloud(step.narration, false);
  };

  // Floating closed launcher button (always visible on every page)
  if (!viraOpen) {
    return (
      <div className="fixed bottom-16 md:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end gap-2">
        {viraGuidedTourActive && (
          <div className="vira-card p-4 max-w-xs border-2 border-brand-pink bg-surface-white space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-brand-pink">
              <span>
                Guided Tour ({viraGuidedTourStep + 1}/{GUIDED_TOUR_STEPS.length})
              </span>
              <button
                type="button"
                onClick={() => setViraGuidedTour(false, 0)}
                className="text-ink-muted hover:text-ink"
              >
                End
              </button>
            </div>
            <div className="text-sm font-bold text-ink">
              {GUIDED_TOUR_STEPS[viraGuidedTourStep]?.title}
            </div>
            <p className="text-xs text-ink-muted">
              {GUIDED_TOUR_STEPS[viraGuidedTourStep]?.narration}
            </p>
            <button
              type="button"
              onClick={handleNextTourStep}
              className="vira-btn-primary w-full py-1.5 px-3 text-xs font-bold flex items-center justify-center gap-1"
            >
              <span>Next Tour Stop</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setViraOpen(true)}
          className={`px-4 py-3 rounded-full shadow-elevated flex items-center gap-2.5 font-bold text-sm border-2 transition-transform hover:-translate-y-0.5 ${
            viraDistressActive
              ? "bg-danger-red text-surface-white border-danger-red"
              : "bg-brand-pink text-surface-white border-surface-white"
          }`}
          aria-label="Open Vira 3D Voice Companion"
        >
          <Sparkles className="w-4 h-4" />
          <span>Talk to Vira 3D</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Vira 3D AI Safety Companion"
      className={
        viraFullScreen
          ? "fixed inset-0 z-[90] bg-blush-light p-4 sm:p-6 overflow-y-auto flex items-center justify-center"
          : "fixed bottom-0 left-0 right-0 md:left-auto md:bottom-5 md:right-5 z-[80] w-full md:w-[410px] max-h-[90vh] flex flex-col"
      }
    >
      <div
        className={`vira-card flex flex-col overflow-hidden bg-surface-white w-full ${
          viraFullScreen ? "max-w-4xl h-[88vh]" : "max-h-[86vh]"
        } ${
          viraDistressActive
            ? "border-2 border-danger-red"
            : "border border-border-rose"
        }`}
      >
        {/* Top Companion Header with Back Button */}
        <div className="px-4 py-3.5 bg-blush-deep border-b border-border-rose flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setViraFullScreen(false);
                setViraOpen(false);
              }}
              className="px-2.5 py-1 rounded-btn bg-surface-white border border-border-rose text-xs font-bold text-ink hover:border-brand-pink flex items-center gap-1"
            >
              <span>← Back</span>
            </button>
            <div>
              <h2 className="text-sm font-bold text-ink">
                Vira · 3D Voice Guide
              </h2>
              <p className="text-[11px] text-ink-muted">
                {viraDistressActive
                  ? "Emergency Support Active — I am with you"
                  : "Interactive 3D Safety Assistant"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language selector: en-IN, hi-IN, bn-IN */}
            <select
              aria-label="Voice Recognition Language"
              value={speechLang}
              onChange={(e) =>
                setSpeechLang(e.target.value as "en-IN" | "hi-IN" | "bn-IN")
              }
              className="text-[11px] font-bold px-2 py-1 rounded bg-surface-white border border-border-rose text-ink"
            >
              <option value="en-IN">EN-IN</option>
              <option value="hi-IN">हिन्दी</option>
              <option value="bn-IN">বাংলা</option>
            </select>

            <button
              type="button"
              onClick={() => setViraMuted(!viraMuted)}
              className="p-1.5 rounded bg-surface-white border border-border-rose text-ink hover:bg-blush-light"
              title={viraMuted ? "Unmute Vira Voice" : "Mute Vira Voice"}
              aria-label={viraMuted ? "Unmute Vira Voice" : "Mute Vira Voice"}
            >
              {viraMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-danger-red" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-brand-pink" />
              )}
            </button>

            <button
              type="button"
              onClick={() => speakAloud(viraLastSpokenText, viraDistressActive)}
              className="p-1.5 rounded bg-surface-white border border-border-rose text-ink hover:bg-blush-light"
              title="Replay Last Spoken Response"
              aria-label="Replay Last Spoken Response"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={stopSpeech}
              className="p-1.5 rounded bg-surface-white border border-border-rose text-ink hover:bg-blush-light"
              title="Stop Speaking"
              aria-label="Stop Speaking"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setViraFullScreen(!viraFullScreen)}
              className="p-1.5 rounded bg-surface-white border border-border-rose text-ink hover:bg-blush-light"
              title={
                viraFullScreen ? "Exit Full-Screen Mode" : "Talk to Vira Full-Screen"
              }
              aria-label={
                viraFullScreen ? "Exit Full-Screen Mode" : "Talk to Vira Full-Screen"
              }
            >
              {viraFullScreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                stopSpeech();
                setViraFullScreen(false);
                setViraOpen(false);
              }}
              className="p-1.5 rounded bg-surface-white border border-border-rose text-ink hover:bg-blush-light"
              title="Close Vira Panel"
              aria-label="Close Vira Panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 3D Avatar Viewport + Live Captions */}
        <div className="p-3 bg-blush-light border-b border-border-rose space-y-2.5">
          <ViraAvatar3D
            avatarState={viraAvatarState}
            speakingAmplitude={speakingAmplitude}
            className={viraFullScreen ? "h-64 w-full" : "h-40 w-full"}
          />

          {/* Accessible Live Captions (aria-live) */}
          <div
            aria-live="polite"
            aria-atomic="true"
            className="p-2.5 rounded-btn bg-surface-white border border-border-rose text-xs text-ink leading-relaxed"
          >
            <span className="font-bold text-brand-pink mr-1.5">
              Live Caption:
            </span>
            <span>{interimTranscript || viraLastSpokenText}</span>
          </div>

          {/* Instant Distress Action Bar when Distress is detected */}
          {viraDistressActive && (
            <div className="p-3 rounded-card bg-blush-deep border-2 border-danger-red space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-danger-red uppercase">
                  Distress Mode · Nearest Safe Haven: Connaught Place Pink Booth
                  (140m)
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    startSosCountdown("Vira Distress Button Activated", false)
                  }
                  className="vira-btn-danger py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <SirenIcon size={16} active variant="on-red" />
                  <span>Start SOS</span>
                </button>

                <a
                  href="tel:112"
                  className="vira-btn-danger py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call 112</span>
                </a>

                <button
                  type="button"
                  onClick={() => router.push("/circle")}
                  className="vira-btn-secondary py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 border-ink"
                >
                  <Users className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Share Live Location</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => handleSendMessage("I'm safe")}
                className="vira-btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-brand-pink" />
                <span>I&apos;m Safe — Exit Distress Mode</span>
              </button>
            </div>
          )}
        </div>

        {/* Guided Tour Banner inside Vira if active */}
        {viraGuidedTourActive && (
          <div className="px-4 py-2.5 bg-blush-deep border-b border-brand-pink flex items-center justify-between gap-2">
            <div className="text-xs">
              <span className="font-bold text-brand-pink">
                {GUIDED_TOUR_STEPS[viraGuidedTourStep]?.title}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextTourStep}
              className="vira-btn-primary px-3 py-1 text-xs font-bold"
            >
              Next Step
            </button>
          </div>
        )}

        {/* Quick Chips */}
        <div className="px-3 py-2 bg-surface-white border-b border-border-rose flex items-center gap-1.5 overflow-x-auto">
          {QUICK_CHIPS.map((chip) => {
            const isUnsafeChip = chip === "I feel unsafe";
            return (
              <button
                key={chip}
                type="button"
                onClick={() => handleSendMessage(chip)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                  isUnsafeChip
                    ? "bg-blush-deep text-danger-red border-danger-red hover:bg-danger-red hover:text-surface-white"
                    : "bg-blush-light text-ink border-border-rose hover:bg-blush-deep"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {/* Conversation Transcript List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-56">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-card text-xs leading-relaxed ${
                m.role === "user"
                  ? "bg-blush-deep text-ink ml-8 border border-border-rose font-semibold"
                  : "bg-blush-light text-ink mr-4 border border-border-rose"
              }`}
            >
              <div className="font-bold text-[10px] uppercase tracking-wider text-ink-muted mb-1">
                {m.role === "user" ? "You" : "Vira"}
              </div>
              <p>{m.content}</p>
              {m.nextStepSuggestion && m.role === "assistant" && (
                <div className="mt-2 pt-1.5 border-t border-border-rose flex items-center gap-1.5 text-[11px] font-bold text-brand-pink">
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  <span>Next step: {m.nextStepSuggestion}</span>
                </div>
              )}
            </div>
          ))}
          {loadingReply && (
            <div className="text-xs text-ink-muted italic px-2">
              Vira is analyzing safety context...
            </div>
          )}
        </div>

        {/* Input & Voice Controls Footer */}
        <div className="p-3 bg-surface-white border-t border-border-rose space-y-2">
          {!speechSupported && (
            <div className="text-[11px] text-ink-muted bg-blush-light px-2.5 py-1 rounded border border-border-rose">
              Browser voice recognition unavailable; text chat and spoken audio
              synthesis work normally.
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputText);
            }}
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-btn border font-bold text-xs flex items-center gap-1 shrink-0 ${
                viraAvatarState === "listening"
                  ? "bg-brand-pink text-surface-white border-brand-pink"
                  : "bg-blush-light text-ink border-border-rose hover:bg-blush-deep"
              }`}
              title="Tap to Speak (Push-to-Talk)"
              aria-label="Tap to Speak with Microphone"
            >
              {viraAvatarState === "listening" ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4 text-brand-pink" />
              )}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Vira or type 'plan my route'..."
              aria-label="Message Vira Safety Companion"
              className="flex-1 px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs sm:text-sm text-ink"
            />

            <button
              type="submit"
              className="vira-btn-primary p-2.5 flex items-center justify-center shrink-0"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          <div className="flex items-center justify-between text-[11px] text-ink-muted px-1">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={handsFreeMode}
                onChange={(e) => setHandsFreeMode(e.target.checked)}
                className="rounded border-border-rose text-brand-pink"
              />
              <span>Hands-free continuous mic</span>
            </label>
            <span>Privacy: Transcripts not stored</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
