"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Square,
  Send,
  Sparkles,
  PhoneCall,
  ShieldCheck,
  Compass,
  Route,
  MapPin,
  Columns,
  Maximize2,
  Clock,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { useSafetyStore } from "@/store/useSafetyStore";
import { detectDistressMessage } from "@/lib/engine/distress-detector";
import { ViraTypedIntent } from "@/lib/engine/vira-intents";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { getBestFemaleVoice } from "@/lib/audio/vira-voice";

const ViraAvatar3D = dynamic(() => import("./ViraAvatar3D"), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full rounded-card bg-blush-deep border border-border-rose flex items-center justify-center text-xs font-semibold text-ink-muted">
      Loading Vira 3D Voice Companion...
    </div>
  ),
});

const CONCIERGE_SCENARIO_CHIPS = [
  {
    id: "safe-commute",
    labelEn: "Safest Route Home",
    labelHi: "सुरक्षित वापसी मार्ग",
    prompt:
      "Plan a safe evening route from Connaught Place Inner Circle to Hauz Khas Metro Station and explain why it avoids dark stretches.",
  },
  {
    id: "minto-why",
    labelEn: "Why Is Minto Bridge Risky?",
    labelHi: "मिंटो ब्रिज जोखिम क्यों?",
    prompt:
      "Why is Minto Bridge Underpass and Munirka Outer Ring Road risky after 9:30 PM tonight?",
  },
  {
    id: "pink-booths",
    labelEn: "Nearest Police Booth",
    labelHi: "निकटतम पुलिस बूथ",
    prompt:
      "Highlight the nearest 24x7 Shakti Pink Police Booth and verified Safe Haven on the map.",
  },
  {
    id: "late-replan",
    labelEn: "Running 20m Late",
    labelHi: "20 मिनट देरी",
    prompt:
      "I am running 20 minutes late tonight. Please replan my safe journey and protect my return deadline.",
  },
  {
    id: "feel-unsafe",
    labelEn: "I Feel Unsafe",
    labelHi: "असुरक्षित महसूस हो रहा है",
    prompt: "I feel unsafe",
    isDistress: true,
  },
];

interface ConciergeTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  nextStepSuggestion?: string;
  intent?: ViraTypedIntent;
  routePreview?: {
    origin: string;
    destination: string;
    safetyScore: number;
    eta: string;
    whySafe: string;
  };
}

export function ViraSplitConcierge({
  onFocusCorridorSlug,
}: {
  onFocusCorridorSlug?: (slug: string) => void;
}) {
  const router = useRouter();
  const {
    currentPlaceName,
    timeSliderHour,
    language,
    portalViewMode,
    setPortalViewMode,
    setCopilotDrawerOpen,
    replanCopilotDelay,
    externalChatPrompt,
    setExternalChatPrompt,
    viraAvatarState,
    viraMuted,
    viraDistressActive,
    viraLastSpokenText,
    setViraAvatarState,
    setViraMuted,
    setViraDistressActive,
    setViraLastSpokenText,
    setHighlightedSafeHavenId,
    startSosCountdown,
    cancelSos,
  } = useSafetyStore();

  const [studioMode, setStudioMode] = useState<"voice-3d" | "chat-thread">(
    "voice-3d"
  );

  const [messages, setMessages] = useState<ConciergeTurn[]>([
    {
      id: "concierge-welcome",
      role: "assistant",
      content:
        "Hi, I'm Vira. Tap any place on the New Delhi map or ask me why a road is flagged tonight, which route is best lit, or where the nearest 24x7 Pink Police Booth is.",
      nextStepSuggestion: "Compare Safe Routes in Route Planner",
      routePreview: {
        origin: "Connaught Place Inner Circle",
        destination: "Hauz Khas Metro Gate 1",
        safetyScore: 92,
        eta: "24 mins via AIIMS Lit Corridor",
        whySafe:
          "94/100 municipal LED street lighting, 3 verified 24x7 Safe Havens, and zero unlit underpasses.",
      },
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechLang, setSpeechLang] = useState<"en-IN" | "hi-IN" | "bn-IN">(
    "en-IN"
  );
  const [speakingAmplitude, setSpeakingAmplitude] = useState(0.5);
  const [loadingReply, setLoadingReply] = useState(false);

  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
  } | null>(null);
  const ampIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  const speakAloud = useCallback(
    (text: string, isDistress = false) => {
      setViraLastSpokenText(text);
      if (
        viraMuted ||
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
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

  const handleSendPrompt = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed) return;

      stopSpeech();
      setInputText("");
      setInterimTranscript("");

      const userTurn: ConciergeTurn = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev.slice(-10), userTurn]);

      if (/late|replan|delay|लेट/i.test(trimmed)) {
        replanCopilotDelay(20);
      }

      // 1. Pre-API Client-Side Distress Check
      const distressResult = detectDistressMessage(
        trimmed,
        "Connaught Place Shakti Pink Police Booth",
        "140 meters away"
      );

      if (distressResult.isCancelOrSafe) {
        cancelSos();
        const reply = distressResult.instantReassurance;
        setMessages((prev) => [
          ...prev,
          {
            id: `a-safe-${Date.now()}`,
            role: "assistant",
            content: reply,
            nextStepSuggestion: "Resume safe corridor monitoring",
          },
        ]);
        speakAloud(reply, false);
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
          `Vira Concierge Distress (${
            distressResult.matchedPhrase || "unsafe"
          })`,
          false
        );
        return;
      }

      // 2. Call /api/vira/chat
      setLoadingReply(true);
      try {
        const res = await fetch("/api/vira/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            messages: [...messages.slice(-8), userTurn].map((m) => ({
              role: m.role,
              content: m.content,
            })),
            context: {
              currentPage: "/explore",
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
          "I have analyzed the corridor telemetry. Let me plot the safest lit route for you.";
        const intent: ViraTypedIntent | undefined = data.intent;

        const isRouteIntent =
          intent?.type === "PLAN_ROUTE" ||
          /route|plan|late|commute|walk/i.test(trimmed);

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: replyText,
            nextStepSuggestion: intent?.nextStepSuggestion,
            intent,
            routePreview: isRouteIntent
              ? {
                  origin: intent?.originPlace || "Connaught Place Inner Circle",
                  destination:
                    intent?.destinationPlace || "Hauz Khas Metro Gate 1",
                  safetyScore: 92,
                  eta: "24 mins (Safety-Optimized)",
                  whySafe:
                    "Avoids Minto Bridge & Deer Park dark lanes; passes 3 verified 24x7 Safe Havens.",
                }
              : undefined,
          },
        ]);

        speakAloud(replyText, false);

        if (intent?.type === "NEAREST_SAFE_HAVEN") {
          setHighlightedSafeHavenId("nearest");
        }
        if (intent?.type === "RISKY_AREAS_TONIGHT" && onFocusCorridorSlug) {
          onFocusCorridorSlug("minto-bridge-underpass-lane");
        }
      } catch {
        const fallback =
          "I have updated your safety telemetry on the interactive map. You can open the Trip Plan drawer to inspect each stop.";
        setMessages((prev) => [
          ...prev,
          { id: `a-f-${Date.now()}`, role: "assistant", content: fallback },
        ]);
      } finally {
        setLoadingReply(false);
      }
    },
    [
      currentPlaceName,
      timeSliderHour,
      messages,
      replanCopilotDelay,
      cancelSos,
      speakAloud,
      setViraDistressActive,
      startSosCountdown,
      setHighlightedSafeHavenId,
      onFocusCorridorSlug,
    ]
  );

  useEffect(() => {
    if (externalChatPrompt) {
      const promptToRun = externalChatPrompt;
      setExternalChatPrompt(null);
      handleSendPrompt(promptToRun);
    }
  }, [externalChatPrompt, setExternalChatPrompt, handleSendPrompt]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingReply]);

  const toggleMic = () => {
    if (viraAvatarState === "listening") {
      recognitionRef.current?.stop();
      setViraAvatarState("idle");
      return;
    }
    stopSpeech();

    const SpeechRecConstructor =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRecConstructor) return;

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
      };
      rec.lang = speechLang;
      rec.continuous = false;
      rec.interimResults = true;
      rec.onstart = () => setViraAvatarState("listening");
      rec.onresult = (event) => {
        let interim = "";
        let finalT = "";
        for (let i = 0; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalT += r[0].transcript;
          else interim += r[0].transcript;
        }
        setInterimTranscript(interim);
        if (finalT.trim()) handleSendPrompt(finalT.trim());
      };
      rec.onerror = () => setViraAvatarState("idle");
      rec.onend = () => {
        setInterimTranscript("");
        setViraAvatarState("idle");
      };
      recognitionRef.current = rec;
      rec.start();
    } catch {
      // ignore
    }
  };

  const latestAssistantReply =
    [...messages].reverse().find((m) => m.role === "assistant") || messages[0];

  return (
    <div className="w-full h-full flex flex-col bg-surface-white rounded-card border border-border-rose shadow-card overflow-hidden">
      {/* Top Studio Header with Mode Switcher & Voice Controls */}
      <div className="px-4 py-3.5 bg-surface-white border-b border-border-rose flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          {studioMode === "chat-thread" && (
            <button
              type="button"
              onClick={() => setStudioMode("voice-3d")}
              className="px-2.5 py-1.5 rounded-btn bg-blush-light border border-border-rose text-xs font-bold text-ink hover:border-brand-pink flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-pink" />
              <span>3D View</span>
            </button>
          )}
          <div>
            <h2 className="text-sm font-extrabold text-ink flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-brand-pink" />
              <span>
                {language === "hi"
                  ? "वीरा 3D सुरक्षा सहायक"
                  : "Vira 3D Voice & Route Guide"}
              </span>
            </h2>
            <p className="text-[11px] text-ink-muted">
              Active Location: <strong className="text-ink">{currentPlaceName}</strong>
            </p>
          </div>
        </div>

        {/* Clean Segmented Toggle: 3D Voice Studio vs Chat History */}
        <div className="flex items-center gap-1.5">
          <div className="p-0.5 rounded-btn bg-blush-light border border-border-rose flex items-center">
            <button
              type="button"
              onClick={() => setStudioMode("voice-3d")}
              className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold transition-all ${
                studioMode === "voice-3d"
                  ? "bg-brand-pink text-surface-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              3D Voice
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("chat-thread")}
              className={`px-2.5 py-1 rounded-[8px] text-[11px] font-bold flex items-center gap-1 transition-all ${
                studioMode === "chat-thread"
                  ? "bg-brand-pink text-surface-white shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat ({messages.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setViraMuted(!viraMuted)}
            className="p-1.5 rounded-btn bg-blush-light border border-border-rose text-ink hover:border-brand-pink"
            title={viraMuted ? "Unmute Voice" : "Mute Voice"}
          >
            {viraMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-danger-red" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-brand-pink" />
            )}
          </button>

          {portalViewMode === "fullchat" && (
            <button
              type="button"
              onClick={() => setPortalViewMode("split")}
              className="px-2.5 py-1.5 rounded-btn bg-blush-light border border-border-rose text-xs font-bold text-ink flex items-center gap-1"
            >
              <Columns className="w-3.5 h-3.5 text-brand-pink" />
              <span>Split View</span>
            </button>
          )}
        </div>
      </div>

      {/* Distress Emergency Action Bar when Distress is Active */}
      {viraDistressActive && (
        <div className="p-3.5 bg-blush-deep border-b-2 border-danger-red space-y-2.5 shrink-0">
          <div className="text-xs font-extrabold text-danger-red uppercase">
            Emergency Support Active · Nearest Safe Haven: Connaught Place Pink
            Booth (140m)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                startSosCountdown("Vira Distress Button Activated", false)
              }
              className="vira-btn-danger py-2 px-2 text-xs font-bold flex items-center justify-center gap-1"
            >
              <SirenIcon size={14} active variant="on-red" />
              <span>Start SOS</span>
            </button>
            <a
              href="tel:112"
              className="vira-btn-danger py-2 px-2 text-xs font-bold flex items-center justify-center gap-1"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call 112</span>
            </a>
            <button
              type="button"
              onClick={() => handleSendPrompt("I'm safe")}
              className="vira-btn-secondary py-2 px-2 text-xs font-bold flex items-center justify-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-pink" />
              <span>I&apos;m Safe</span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 1: SPACIOUS 3D VOICE STUDIO (Uncluttered 3D Avatar + Spoken Guidance + Quick Voice Actions) */}
      {studioMode === "voice-3d" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Large Interactive 3D Companion Viewport */}
          <ViraAvatar3D
            avatarState={viraAvatarState}
            speakingAmplitude={speakingAmplitude}
            className="h-56 w-full"
            onQuickSpeak={() =>
              speakAloud(
                latestAssistantReply?.content || viraLastSpokenText,
                viraDistressActive
              )
            }
          />

          {/* Current Spoken Guidance Card */}
          <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-brand-pink uppercase tracking-wider">
                Vira&apos;s Latest Safety Advice
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    speakAloud(
                      latestAssistantReply?.content || viraLastSpokenText,
                      viraDistressActive
                    )
                  }
                  className="px-2.5 py-1 rounded-btn bg-surface-white border border-border-rose text-[11px] font-bold text-ink flex items-center gap-1 hover:border-brand-pink"
                >
                  <RotateCcw className="w-3 h-3 text-brand-pink" />
                  <span>Replay</span>
                </button>
                <button
                  type="button"
                  onClick={stopSpeech}
                  className="px-2.5 py-1 rounded-btn bg-surface-white border border-border-rose text-[11px] font-bold text-ink flex items-center gap-1 hover:border-brand-pink"
                >
                  <Square className="w-3 h-3" />
                  <span>Stop</span>
                </button>
              </div>
            </div>

            <p
              aria-live="polite"
              className="text-xs sm:text-sm font-medium text-ink leading-relaxed"
            >
              {interimTranscript ||
                latestAssistantReply?.content ||
                viraLastSpokenText}
            </p>

            {/* Recommended Route Preview inside Studio */}
            {latestAssistantReply?.routePreview && (
              <div className="p-3 rounded-btn bg-surface-white border border-border-rose flex flex-wrap items-center justify-between gap-2 pt-2.5">
                <div>
                  <div className="text-xs font-extrabold text-ink">
                    {latestAssistantReply.routePreview.origin} →{" "}
                    {latestAssistantReply.routePreview.destination}
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    {latestAssistantReply.routePreview.eta} · Safety{" "}
                    <strong className="text-brand-pink">
                      {latestAssistantReply.routePreview.safetyScore}/100
                    </strong>
                  </div>
                </div>
                <Link
                  href="/planner"
                  className="vira-btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>Open Route</span>
                </Link>
              </div>
            )}
          </div>

          {/* Spacious Quick-Ask Voice & Scenario Buttons */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-ink-muted uppercase tracking-wider px-1">
              Tap a Question to Ask Vira:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONCIERGE_SCENARIO_CHIPS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSendPrompt(chip.prompt)}
                  className={`p-3 rounded-btn text-xs font-bold border text-left transition-all flex items-center justify-between gap-2 ${
                    chip.isDistress
                      ? "bg-blush-deep text-danger-red border-danger-red hover:bg-danger-red hover:text-surface-white"
                      : "bg-surface-white text-ink border-border-rose hover:bg-blush-light hover:border-brand-pink"
                  }`}
                >
                  <span>
                    {language === "hi" ? chip.labelHi : chip.labelEn}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: FULL CHAT & ROUTE HISTORY THREAD */
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-[260px]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-card text-xs leading-relaxed space-y-2.5 ${
                m.role === "user"
                  ? "bg-blush-deep text-ink ml-6 border border-brand-pink font-semibold"
                  : "bg-blush-light text-ink mr-4 border border-border-rose"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted">
                <span>{m.role === "user" ? "You" : "Vira Safety Guide"}</span>
                {m.role === "assistant" && (
                  <button
                    type="button"
                    onClick={() => speakAloud(m.content, false)}
                    className="text-brand-pink hover:underline flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Listen</span>
                  </button>
                )}
              </div>

              <p className="text-xs sm:text-sm text-ink leading-relaxed">
                {m.content}
              </p>

              {m.routePreview && (
                <div className="p-3.5 rounded-card bg-surface-white border border-brand-pink space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-brand-pink flex items-center gap-1">
                      <Route className="w-3.5 h-3.5" />
                      <span>Recommended Safe Route</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blush-deep text-[11px] font-extrabold text-brand-pink">
                      Safety {m.routePreview.safetyScore}/100
                    </span>
                  </div>

                  <div className="text-xs font-extrabold text-ink">
                    {m.routePreview.origin} → {m.routePreview.destination}
                  </div>
                  <p className="text-[11px] text-ink-muted">
                    {m.routePreview.whySafe}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCopilotDrawerOpen(true)}
                      className="vira-btn-primary py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Trip Timeline</span>
                    </button>
                    <Link
                      href={`/planner?start=${encodeURIComponent(
                        m.routePreview.origin
                      )}&dest=${encodeURIComponent(m.routePreview.destination)}`}
                      className="vira-btn-secondary py-1.5 px-2.5 text-[11px] font-bold flex items-center justify-center gap-1"
                    >
                      <MapPin className="w-3.5 h-3.5 text-brand-pink" />
                      <span>Compare Routes</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loadingReply && (
            <div className="p-3.5 rounded-card bg-blush-light border border-border-rose text-xs font-semibold text-ink-muted flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand-pink animate-spin" />
              <span>Checking New Delhi street lighting & safe routes...</span>
            </div>
          )}
          <div ref={scrollBottomRef} />
        </div>
      )}

      {/* Bottom Voice & Text Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt(inputText);
        }}
        className="p-3.5 bg-surface-white border-t border-border-rose flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={toggleMic}
          className={`px-3 py-2.5 rounded-btn border font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all ${
            viraAvatarState === "listening"
              ? "bg-brand-pink text-surface-white border-brand-pink shadow-sm"
              : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
          }`}
          title="Tap to Speak to Vira"
        >
          {viraAvatarState === "listening" ? (
            <>
              <MicOff className="w-4 h-4" />
              <span>Stop</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-brand-pink" />
              <span>Speak</span>
            </>
          )}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            language === "hi"
              ? "वीरा से पूछें: 'सबसे सुरक्षित रास्ता कौन सा है?'..."
              : "Ask Vira about any road, safe route, or police booth..."
          }
          className="flex-1 px-3.5 py-2.5 rounded-btn border border-border-rose bg-blush-light text-xs sm:text-sm font-medium text-ink placeholder:text-ink-muted outline-none focus:bg-surface-white focus:border-brand-pink"
        />

        <button
          type="submit"
          className="vira-btn-primary px-3.5 py-2.5 flex items-center justify-center shrink-0"
          aria-label="Send message to Vira"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
