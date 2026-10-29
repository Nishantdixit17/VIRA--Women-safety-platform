"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Route,
  Bell,
  BarChart3,
  MessageSquare,
  MapPin,
  Clock,
  ArrowRight,
  Lock,
  Eye,
  Users,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sparkles,
  FileCheck2,
  WifiOff,
  Compass,
  Volume2,
  Mic,
  Layers,
  Navigation,
  PhoneCall,
  Smartphone,
  Monitor,
  Zap,
} from "lucide-react";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { useSafetyStore } from "@/store/useSafetyStore";
import { RiskLevel } from "@/lib/engine/risk-engine";
import { INDIAN_PLACES_DIRECTORY } from "@/lib/engine/places-geocoder";
import { ALL_PLATFORM_MODULES } from "@/components/layout/AppShell";
import { EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import { SafeHavenMapItem } from "@/components/map/SafetyMapCanvas";
import { playViraVoice } from "@/lib/audio/vira-voice";

const SafetyMapCanvas = dynamic(
  () => import("@/components/map/SafetyMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[520px] w-full rounded-card bg-blush-deep border border-border-rose flex items-center justify-center text-xs font-bold text-ink-muted">
        Loading Live Red-Zone & Safe-Route Map...
      </div>
    ),
  }
);

const ViraAvatar3D = dynamic(() => import("@/components/vira/ViraAvatar3D"), {
  ssr: false,
  loading: () => (
    <div className="h-52 w-full rounded-card bg-blush-deep border border-border-rose flex items-center justify-center text-xs font-semibold text-ink-muted">
      Loading Phase 6 Vira 3D VRM Companion...
    </div>
  ),
});

const SIX_CORE_MODULES = [
  {
    number: "01",
    title: "Danger Zone Map (6 PM – 2 AM)",
    icon: Eye,
    badge: "Check Any Area in New Delhi",
    description:
      "Shows which roads are safe and which roads become unsafe at night based on streetlights, crowd, CCTV, and past complaints.",
    exampleQuote:
      "Simple reason shown: “Risk is high here after 9 PM due to dim streetlights and past complaints.”",
    href: "/explore",
    ctaLabel: "Open Safety Map",
  },
  {
    number: "02",
    title: "Safe Route Finder",
    icon: Route,
    badge: "Safest Road vs. Shortcut",
    description:
      "Enter your start and destination in New Delhi to see the safest well-lit road with police booths and open shops along the way.",
    exampleQuote:
      "Shows travel time, safety score out of 100, and nearest police station.",
    href: "/planner",
    ctaLabel: "Find Safe Route",
  },
  {
    number: "03",
    title: "Quick SOS & 112 Police Call",
    icon: Radio,
    badge: "5-Second Countdown · Loud or Silent",
    description:
      "One tap starts a 5-second emergency alert, calls 112 Police, and sends your location to your family.",
    exampleQuote:
      "Can be used with a loud siren or silently if you cannot speak.",
    href: "/sos",
    ctaLabel: "Open SOS Help",
  },
  {
    number: "04",
    title: "Share Trip with Family (Trusted Circle)",
    icon: Users,
    badge: "Stops Automatically When You Reach",
    description:
      "Choose which family members or friends can see your live trip and arrival time. Sharing stops automatically once you arrive safely.",
    exampleQuote:
      "You stay in full control of who sees your trip and for how long.",
    href: "/circle",
    ctaLabel: "Manage Trusted Contacts",
  },
  {
    number: "05",
    title: "Local Safety Reviews",
    icon: MessageSquare,
    badge: "Real Feedback from Women",
    description:
      "Read safety ratings from other women or share your own experience about streetlights, crowd, or unsafe corners on any road.",
    exampleQuote:
      "Can be posted with your name or anonymously.",
    href: "/reviews",
    ctaLabel: "Read & Write Reviews",
  },
  {
    number: "06",
    title: "Live Trip & Route Change Monitor",
    icon: Navigation,
    badge: "Watches Your Cab or Walk Live",
    description:
      "Tracks your live journey on the New Delhi map, runs a safe-arrival timer, and asks 'Are you okay?' if your cab or auto goes off-route.",
    exampleQuote:
      "Automatically alerts your family if you miss a check-in.",
    href: "/trip",
    ctaLabel: "Open Trip Monitor",
  },
];

const EXTENDED_ECOSYSTEM_FEATURES = [
  {
    number: "07",
    title: "Live Area Safety Alerts",
    badge: "Live Updates",
    description:
      "See live warnings about dark streets, crowd changes, and all 9 safety parameters for New Delhi areas.",
    href: "/alerts",
    icon: Bell,
  },
  {
    number: "08",
    title: "24x7 Police & Safe Stops",
    badge: "Police · Hospital · Metro",
    description:
      "Finds the closest 24x7 Police Booth, Hospital, or Metro Station where you can step in for immediate help.",
    href: "/explore",
    icon: Compass,
  },
  {
    number: "09",
    title: "Safe-Arrival Timer",
    badge: "15 / 30 / 45 Min Timer",
    description:
      "Set a simple timer before your walk or cab ride; alerts your family if you don't mark yourself safe in time.",
    href: "/trip",
    icon: Clock,
  },
  {
    number: "10",
    title: "Offline Safety Mode",
    badge: "Works Without Internet",
    description:
      "Saves your route, emergency helpline numbers (112 / 1091), and family contacts even if your phone loses internet.",
    href: "/settings",
    icon: WifiOff,
  },
  {
    number: "11",
    title: "3D Voice Guide — Vira",
    badge: "Speaks Hindi & English",
    description:
      "Talk to Vira in simple Hindi or English to ask if an area is safe or find the safest road home.",
    href: "/explore",
    icon: Sparkles,
  },
];

const FOUR_STEP_CAMPUSGUARD_CYCLE = [
  {
    step: "01",
    title: "Report",
    subtitle: "Community & Infrastructure Signals",
    description:
      "Users and audits report safety concerns, street lighting deficits, or positive observations with place-name and time-of-day tags.",
  },
  {
    step: "02",
    title: "Analyze",
    subtitle: "Explainable Weighted AI Engine",
    description:
      "AI processes reports, lighting audits, footfall patterns, and help proximity to detect emerging time-window risk zones.",
  },
  {
    step: "03",
    title: "Warn",
    subtitle: "Plain-Language Early Explanations",
    description:
      "Real-time alerts and plain-language factor breakdowns notify users why risk is elevated before they enter an isolated stretch.",
  },
  {
    step: "04",
    title: "Protect",
    subtitle: "Safer Routes, Circle & ERSS-112",
    description:
      "Safe routes, consent-based Trusted Circle monitoring, and emergency response tools keep women protected end-to-end.",
  },
];

const FIVE_STEP_SYSTEM_FLOW = [
  {
    step: "01",
    title: "Collect Safety Signals",
    detail:
      "Combines community reports, lighting and environment ratings, time-of-day patterns, and nearby Safe Haven availability.",
  },
  {
    step: "02",
    title: "Analyze and Predict",
    detail:
      "The risk engine estimates whether a road segment has Low, Caution, Elevated, High, or Active Incident risk for the selected hour.",
  },
  {
    step: "03",
    title: "Explain and Recommend",
    detail:
      "Explains the main reasons behind the score in plain language and suggests a safer route or nearby 24x7 Safe Haven.",
  },
  {
    step: "04",
    title: "Monitor with Consent",
    detail:
      "If the user starts a journey, Vira tracks progress, check-ins, and route deviations while sharing updates only as permitted.",
  },
  {
    step: "05",
    title: "Respond and Learn",
    detail:
      "If an SOS or missed check-in occurs, Vira triggers the escalation workflow, logs SHA-256 evidence, and updates community intelligence.",
  },
];

const FIVE_RISK_LEVELS: Array<{
  level: RiskLevel;
  score: number;
  label: string;
  meaning: string;
  exampleCorridor: string;
}> = [
  {
    level: "LOW",
    score: 93,
    label: "Low Risk",
    meaning:
      "Well-lit corridor (90+/100), active pedestrian presence, and verified police or metro assistance within 250m.",
    exampleCorridor: "Connaught Place Inner Circle (93/100)",
  },
  {
    level: "CAUTION",
    score: 76,
    label: "Caution",
    meaning:
      "Generally safe main road with moderate evening footfall thinning after 10:00 PM; stay on primary lit carriageway.",
    exampleCorridor: "IIT Delhi Main Gate — Jia Sarai (76/100)",
  },
  {
    level: "ELEVATED",
    score: 58,
    label: "Elevated Risk",
    meaning:
      "Noticeable lighting gaps or commercial shuttering after 9:30 PM; Vira recommends Balanced or Safest route alternative.",
    exampleCorridor: "Kamla Nagar — North Campus Ridge (58/100)",
  },
  {
    level: "HIGH",
    score: 84,
    label: "High Risk",
    meaning:
      "Multiple corroborated reports, poor lighting (<40/100), and emergency help >800m away. Automatically bypassed by Safest route.",
    exampleCorridor: "Minto Bridge Underpass Lane (84/100 Risk)",
  },
  {
    level: "ACTIVE_INCIDENT",
    score: 94,
    label: "Active Incident",
    meaning:
      "Live verified safety advisory or total feeder streetlight outage in progress. Immediate detour and alert broadcast active.",
    exampleCorridor: "Live Outage / Perimeter Advisory Zone",
  },
];

const PILLAR_TABS = {
  PREDICT: {
    stage: "Stage 01 · Predict",
    heading: "Predict When & Where Risk Escalates Before You Leave",
    body: "Safety shouldn't begin when an SOS button is pressed. Vira models hourly shifts between 6:00 PM and 2:00 AM, forecasting how street lighting deficits and closing commercial shutters transform a busy daytime street into an isolated night corridor.",
    metric: "6 Weighted Signals Evaluated Per Road Segment",
    actionHref: "/explore",
    actionLabel: "Explore Dynamic Risk Map",
  },
  EXPLAIN: {
    stage: "Stage 02 · Explain",
    heading: "Explain the Exact Reasons Behind Every Safety Score",
    body: "We never show a mysterious red zone or label a neighborhood permanently dangerous. Every score breaks down exact contributors: e.g., 'Risk is elevated on Minto Bridge Underpass Lane between 9 PM and 12 AM due to low lighting (28/100), 6 verified reports, and police assistance 1.1 km away.'",
    metric: "100% Transparent Feature Importances",
    actionHref: "/places/minto-bridge-underpass-lane",
    actionLabel: "Inspect Area Explainability Page",
  },
  PREVENT: {
    stage: "Stage 03 · Prevent",
    heading: "Prevent Exposure with AI Safety-Optimized Routing",
    body: "Standard navigation apps optimize purely for speed, often routing women through dark underpasses to save 3 minutes. Vira compares Fastest, Balanced, and Safest corridors side-by-side with plain-language trade-offs and verified 24x7 Safe Havens.",
    metric: "3 Route Alternatives Scored in Real Time",
    actionHref: "/planner",
    actionLabel: "Compare Safe Routes Now",
  },
  PROTECT: {
    stage: "Stage 04 · Protect",
    heading: "Protect Every Journey with Consent-Based Trusted Circle",
    body: "Share temporary journey status with family or friends strictly on your terms (WHO, WHAT, WHEN, HOW LONG)—with automatic revocation upon safe arrival. During your commute, Vira monitors for 150m route deviations and runs your safe-arrival check-in timer.",
    metric: "Consent-First · Zero Permanent Tracking",
    actionHref: "/circle",
    actionLabel: "Configure Trusted Circle Consent",
  },
  RESPOND: {
    stage: "Stage 05 · Respond",
    heading: "Respond Instantly with 5s SOS, 3D Companion & SHA-256 Vault",
    body: "If you feel unsafe, miss a check-in, or say 'I feel unsafe' to Vira in English, Hindi, or Bengali, the platform highlights the nearest Safe Haven immediately, starts a 5-second cancelable SOS countdown, bridges to ERSS-112, and locks tamper-evident SHA-256 evidence.",
    metric: "Pre-API Distress Detection + SHA-256 Evidence Chain",
    actionHref: "/sos",
    actionLabel: "Open SOS & Evidence Vault",
  },
} as const;

const PREVIEW_HOURS = [
  { hour: 18, label: "6:00 PM", mintoScore: 68, mintoLevel: "CAUTION" as RiskLevel, cpScore: 95 },
  { hour: 20, label: "8:00 PM", mintoScore: 49, mintoLevel: "ELEVATED" as RiskLevel, cpScore: 93 },
  { hour: 21, label: "9:30 PM", mintoScore: 28, mintoLevel: "HIGH" as RiskLevel, cpScore: 91 },
  { hour: 23, label: "11:00 PM", mintoScore: 19, mintoLevel: "HIGH" as RiskLevel, cpScore: 88 },
  { hour: 1, label: "1:00 AM", mintoScore: 14, mintoLevel: "ACTIVE_INCIDENT" as RiskLevel, cpScore: 85 },
];

export default function LandingPage() {
  const router = useRouter();
  const {
    startSosCountdown,
    setViraOpen,
    setViraFullScreen,
    setViraGuidedTour,
    setCopilotDrawerOpen,
    setPortalViewMode,
    mobilePreviewMode,
    setMobilePreviewMode,
  } = useSafetyStore();

  const [startPlace, setStartPlace] = useState(
    INDIAN_PLACES_DIRECTORY[0].shortName
  );
  const [destPlace, setDestPlace] = useState(
    INDIAN_PLACES_DIRECTORY[1].shortName
  );
  const [depTime, setDepTime] = useState("21:30");
  const [activeTab, setActiveTab] =
    useState<keyof typeof PILLAR_TABS>("PREDICT");
  const [featureCategoryTab, setFeatureCategoryTab] = useState<
    "core6" | "extended" | "all17"
  >("core6");
  const [architectureTab, setArchitectureTab] = useState<
    "cycle4" | "pipeline5" | "risk5"
  >("cycle4");
  const [previewHourIdx, setPreviewHourIdx] = useState(2); // 9:30 PM default
  const [liveZones, setLiveZones] = useState<EnrichedAreaZone[]>([]);
  const [liveHavens, setLiveHavens] = useState<SafeHavenMapItem[]>([]);
  const [selectedMapSlug, setSelectedMapSlug] = useState(
    "minto-bridge-underpass-lane"
  );
  const [demoAvatarState, setDemoAvatarState] = useState<
    "idle" | "listening" | "speaking" | "distress"
  >("speaking");
  const [demoSpokenLine, setDemoSpokenLine] = useState(
    "Risk on Minto Bridge Underpass Lane rises after 9 PM due to 28/100 lighting and 6 verified reports. I recommend the Barakhamba—Mandi House lit corridor (+3 mins, 91/100 safety score) passing Shakti Pink Police Booth."
  );

  // Pre-prefetch all 10 platform modules & unregister stale service workers
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (window.location.hostname === "localhost") {
        navigator.serviceWorker
          .getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
    }
    ALL_PLATFORM_MODULES.forEach((m) => {
      try {
        router.prefetch(m.href);
      } catch {
        // Ignore
      }
    });
  }, [router]);

  const activePreviewHour = PREVIEW_HOURS[previewHourIdx];

  useEffect(() => {
    fetch(`/api/risk?hour=${activePreviewHour.hour}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.zones) setLiveZones(d.zones);
        if (d.safeHavens) setLiveHavens(d.safeHavens);
      })
      .catch(() => {});
  }, [activePreviewHour.hour]);

  const handleQuickPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({
      start: startPlace,
      dest: destPlace,
      time: depTime,
    });
    router.push(`/planner?${params.toString()}`);
  };

  const triggerDemoVoicePrompt = (
    promptType: "explain" | "route" | "haven" | "distress"
  ) => {
    if (promptType === "explain") {
      setDemoAvatarState("speaking");
      setDemoSpokenLine(
        "Risk on Minto Bridge Underpass Lane is elevated between 9 PM and 12 AM due to low lighting (28/100), 6 corroborated community reports, and police help 1.1 km away."
      );
    } else if (promptType === "route") {
      setDemoAvatarState("speaking");
      setDemoSpokenLine(
        "Comparing 3 routes from Connaught Place to Hauz Khas: Safest Route scores 92/100 via outer lit ring and 24x7 Metro corridors, adding only 3 minutes over the dark shortcut."
      );
    } else if (promptType === "haven") {
      setDemoAvatarState("speaking");
      setDemoSpokenLine(
        "Your nearest verified Safe Haven is Connaught Place Shakti Pink Police Booth, 140 meters away on the lit Inner Circle, staffed 24x7 with PCR patrol connectivity."
      );
    } else {
      setDemoAvatarState("distress");
      setDemoSpokenLine(
        "I am right here with you. Stay on the lit main road toward Connaught Place Shakti Pink Police Booth (140m). You can start the 5-second SOS countdown or call 112 immediately."
      );
    }

    playViraVoice(
      promptType === "explain"
        ? "Risk on Minto Bridge Underpass Lane is elevated between 9 PM and 12 AM due to low lighting and six community reports."
        : promptType === "route"
        ? "Safest route scores 92 out of 100 via well-lit metro corridors, adding only 3 minutes."
        : promptType === "haven"
        ? "Nearest safe haven is Connaught Place Shakti Pink Police Booth, 140 meters away."
        : "I am with you. Move toward Connaught Place Pink Police Booth, 140 meters away.",
      {
        lang: "en-IN",
        pitch: 1.15,
        rate: 0.95,
      }
    );
  };

  const pageBody = (
    <div
      className={`min-h-screen flex flex-col bg-blush-light text-ink ${
        mobilePreviewMode ? "vira-mobile-viewport" : ""
      }`}
    >
      {/* (1) Sticky Navbar + Quick-Switch Feature Dock */}
      <header className="sticky top-0 z-40 bg-surface-white/95 backdrop-blur-md border-b border-border-rose shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/explore");
                }
              }}
              className="px-3 py-1.5 rounded-btn bg-blush-light border border-border-rose text-xs font-bold text-ink hover:border-brand-pink transition-colors flex items-center gap-1"
            >
              <span>← Back</span>
            </button>
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold text-xl tracking-tight text-ink"
            >
              <span className="w-9 h-9 rounded-btn bg-brand-pink text-surface-white flex items-center justify-center font-bold text-lg shadow-sm">
                V
              </span>
              <div>
                <span className="font-extrabold">Vira</span>
                <span className="hidden sm:inline-flex items-center gap-1 ml-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blush-deep text-brand-pink border border-border-rose">
                  <Zap className="w-3 h-3" />
                  <span>New Delhi Safety Guide</span>
                </span>
              </div>
            </Link>
          </div>

          <nav
            aria-label="Landing Page Sections"
            className="hidden lg:flex items-center gap-6 text-sm font-semibold text-ink-muted"
          >
            <a
              href="#live-portal-preview"
              className="hover:text-brand-pink transition-colors"
            >
              Live Studio
            </a>
            <a
              href="#features"
              className="hover:text-brand-pink transition-colors"
            >
              17 Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-brand-pink transition-colors"
            >
              How It Works
            </a>
            <a
              href="#impact"
              className="hover:text-brand-pink transition-colors"
            >
              Impact & Privacy
            </a>
          </nav>

          <div className="flex items-center gap-2.5">
            {/* 1-Click Mobile App Ratio Preview Button */}
            <button
              type="button"
              onClick={() => setMobilePreviewMode(!mobilePreviewMode)}
              className={`hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold border transition-all ${
                mobilePreviewMode
                  ? "bg-brand-pink text-surface-white border-brand-pink"
                  : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
              }`}
              title="Preview VIRA in 430px Mobile App Ratio"
            >
              {mobilePreviewMode ? (
                <>
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop Mode</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Mobile App View</span>
                </>
              )}
            </button>

            <Link
              href="/login?role=user"
              className="vira-btn-secondary px-3.5 py-2 text-xs sm:text-sm font-bold"
            >
              User Sign In
            </Link>
            <Link
              href="/login?role=admin"
              className="px-3.5 py-2 rounded-btn bg-ink text-surface-white text-xs sm:text-sm font-bold hover:bg-brand-pink transition-colors inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-brand-pink" />
              <span>Admin Portal Sign In</span>
            </Link>
            <Link
              href="/explore"
              className="vira-btn-primary px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-1.5"
            >
              <span>Open Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Express Instant Module Bar (Connects all 10 tabs directly from Landing Page) */}
        <div className="border-t border-border-rose bg-blush-light/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink mr-1 shrink-0">
              Quick Launch:
            </span>
            {ALL_PLATFORM_MODULES.map((mod) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={mod.href}
                  href={mod.href}
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 border transition-all ${
                    mod.isDanger
                      ? "bg-blush-deep text-danger-red border-danger-red hover:bg-danger-red hover:text-surface-white"
                      : "bg-surface-white text-ink border-border-rose hover:border-brand-pink hover:text-brand-pink"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span>{mod.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* (2) Hero Section — Spacious, Airy, High-Impact with warm, golden silhouette background */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-border-rose bg-blush-light relative overflow-hidden">
        {/* Clearly visible golden silhouette background image */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden"
        >
          <div
            className="absolute inset-0 bg-cover bg-center sm:bg-[center_28%]"
            style={{
              backgroundImage: "url('/images/hero-silhouette.jpg')",
              opacity: 0.85,
            }}
          />
          {/* Subtle light scrim ensuring text has high contrast and is 100% readable without washing out the image */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 244, 246, 0.35) 45%, rgba(255, 244, 246, 0.75) 85%, #FFF4F6 100%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blush-deep border border-brand-pink text-xs sm:text-sm font-bold text-ink"
          >
            <ShieldCheck className="w-4 h-4 text-brand-pink" />
            <span>
              Predictive Safety Intelligence · Predict → Explain → Prevent →
              Protect → Respond
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink"
          >
            Vira
          </motion.h1>

          <p className="text-xl sm:text-2xl font-bold text-ink max-w-3xl mx-auto">
            Your Simple, Everyday Women&apos;s Safety & Safe Route Guide for New Delhi
          </p>

          <p className="text-base sm:text-lg text-ink-muted max-w-3xl mx-auto leading-relaxed">
            Check the safety of any area in New Delhi, see all 9 safety parameters, find the safest well-lit road home, and stay connected with your family and 112 Police help.
          </p>

          {/* Primary Hero Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link
              href="/explore"
              className="vira-btn-primary px-6 py-3.5 text-base font-bold inline-flex items-center gap-2 shadow-elevated"
            >
              <span>Open New Delhi Safety Map</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/planner"
              className="vira-btn-secondary px-5 py-3.5 text-base font-bold inline-flex items-center gap-2 border-brand-pink"
            >
              <Route className="w-4 h-4 text-brand-pink" />
              <span>Find Safest Route</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setViraOpen(true);
                setViraFullScreen(false);
              }}
              className="vira-btn-secondary px-5 py-3.5 text-base font-bold inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-brand-pink" />
              <span>Ask Vira 3D Voice Guide</span>
            </button>
            <Link
              href="/login?role=admin"
              className="px-5 py-3.5 rounded-btn bg-ink text-surface-white text-base font-bold hover:bg-brand-pink transition-colors inline-flex items-center gap-2"
            >
              <Lock className="w-4 h-4 text-brand-pink" />
              <span>Admin Portal Sign In</span>
            </Link>
          </div>

          {/* Quick-Start Safe Journey Planner Card */}
          <div className="mt-10 vira-card p-6 sm:p-8 text-left max-w-4xl mx-auto bg-surface-white">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                  Quick Safe Route Finder
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-ink">
                  Type Any Two Places in New Delhi to Find the Safest Road
                </h2>
              </div>
              <span className="text-xs font-semibold text-ink-muted">
                Supports all New Delhi localities
              </span>
            </div>

            <form
              onSubmit={handleQuickPlan}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
            >
              <div>
                <label
                  htmlFor="hero-start"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  Starting Place in New Delhi
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                  <input
                    id="hero-start"
                    type="text"
                    list="hero-delhi-places"
                    value={startPlace}
                    onChange={(e) => setStartPlace(e.target.value)}
                    placeholder="e.g. Connaught Place, Dwarka..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm font-medium text-ink"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="hero-dest"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  Destination in New Delhi
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                  <input
                    id="hero-dest"
                    type="text"
                    list="hero-delhi-places"
                    value={destPlace}
                    onChange={(e) => setDestPlace(e.target.value)}
                    placeholder="e.g. Hauz Khas, Saket, Rohini..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm font-medium text-ink"
                  />
                </div>
              </div>

              <datalist id="hero-delhi-places">
                {INDIAN_PLACES_DIRECTORY.map((place) => (
                  <option key={place.id} value={place.shortName}>
                    {place.name}
                  </option>
                ))}
              </datalist>

              <div>
                <label
                  htmlFor="hero-time"
                  className="block text-xs font-bold text-ink mb-1.5"
                >
                  Travel Time
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                  <input
                    id="hero-time"
                    type="time"
                    value={depTime}
                    onChange={(e) => setDepTime(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-sm font-medium text-ink"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="vira-btn-primary w-full py-2.5 px-4 text-base font-bold flex items-center justify-center gap-2"
              >
                <Route className="w-4 h-4" />
                <span>Find Safe Route</span>
              </button>
            </form>
          </div>

          {/* Preview Row: Live Safety Score Card, Red-Zone Alert Card, Animated Siren SOS Button */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto pt-4 text-left">
            <div
              onClick={() => {
                setSelectedMapSlug("connaught-place-inner-circle");
                document
                  .getElementById("live-portal-preview")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              role="button"
              tabIndex={0}
              className="vira-card p-5 bg-surface-white space-y-2.5 cursor-pointer hover:border-brand-pink transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                  Locate Safe Corridor on Map →
                </span>
                <RiskBadge level="LOW" score={93} compact />
              </div>
              <div className="text-base font-bold text-ink">
                Connaught Place Inner Circle
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                94/100 LED street lighting, active pedestrian footfall, and
                Shakti Pink Police Booth 140m away.
              </p>
            </div>

            <div
              onClick={() => {
                setSelectedMapSlug("minto-bridge-underpass-lane");
                document
                  .getElementById("live-portal-preview")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              role="button"
              tabIndex={0}
              className="vira-card p-5 bg-surface-white space-y-2.5 border-2 border-danger-red cursor-pointer hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-danger-red flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Locate Red Zone on Map →
                </span>
                <RiskBadge level="HIGH" score={84} compact />
              </div>
              <div className="text-base font-bold text-ink">
                Minto Bridge Underpass Lane
              </div>
              <p className="text-xs text-ink-muted leading-relaxed">
                Why: Poor lighting (28/100), 6 verified reports, low activity
                after 9:30 PM, and police help 1.1 km away.
              </p>
            </div>

            <div className="vira-card p-5 flex flex-col justify-between bg-blush-deep">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-danger-red">
                  Instant Emergency Bridge
                </span>
                <div className="text-base font-bold text-ink">
                  5-Second Cancelable SOS & 112
                </div>
                <p className="text-xs text-ink-muted">
                  Notifies Trusted Circle with live place name and writes to
                  SHA-256 Evidence Vault.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  startSosCountdown("Landing Page SOS Preview Activated", false)
                }
                className="mt-3 vira-btn-danger group w-full py-2.5 px-4 flex items-center justify-center gap-2"
              >
                <SirenIcon size={20} variant="on-red" />
                <span>Trigger Emergency SOS</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* (2.5) Interactive Split-Screen Map Simulator + Phase 6 3D Vira Companion Live Showcase */}
      <section
        id="live-portal-preview"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-white border-b border-border-rose"
      >
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blush-deep text-xs font-bold uppercase tracking-wider text-brand-pink border border-border-rose">
                <Layers className="w-3.5 h-3.5" />
                <span>
                  Interactive Split-Screen Portal + Phase 6 3D Voice Companion
                </span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Experience Dynamic Risk Forecasting & 3D AI Guidance Live
              </h2>
              <p className="text-sm sm:text-base text-ink-muted max-w-2xl">
                Slide the evening time window (6:00 PM – 1:00 AM) to see how
                corridor safety scores shift dynamically, and test Vira&apos;s
                3D lip-synced voice explanations right here.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setPortalViewMode("split");
                  router.push("/explore");
                }}
                className="vira-btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <Compass className="w-4 h-4" />
                <span>Open Full Split-Screen Map + AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCopilotDrawerOpen(true);
                  router.push("/explore");
                }}
                className="vira-btn-secondary px-4 py-2.5 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-brand-pink" />
                <span>Open AI Safe Journey Copilot</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Full-Width Enlarged Interactive Map of New Delhi */}
            <div className="vira-card p-4 sm:p-5 bg-blush-light space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                    Enlarged New Delhi Safety Map (6 PM – 2 AM)
                  </span>
                  <h3 className="text-lg font-extrabold text-ink">
                    Search Any Place in New Delhi, See 9 Safety Parameters & Plot Safe Routes (Time:{" "}
                    <span className="text-brand-pink">
                      {activePreviewHour.label}
                    </span>
                    )
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {PREVIEW_HOURS.map((item, idx) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setPreviewHourIdx(idx)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                        previewHourIdx === idx
                          ? "bg-brand-pink text-surface-white"
                          : "bg-surface-white text-ink border border-border-rose hover:bg-blush-deep"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <SafetyMapCanvas
                zones={liveZones}
                safeHavens={liveHavens}
                selectedSlug={selectedMapSlug}
                onSelectZone={(z) => setSelectedMapSlug(z.slug)}
                showSafeHavens={true}
                activeHourLabel={activePreviewHour.label}
              />
            </div>

            {/* 3D Vira Voice Guide Preview Card Below Map */}
            <div className="vira-card p-6 bg-surface-white grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              <div className="lg:col-span-5">
                <ViraAvatar3D
                  avatarState={demoAvatarState}
                  speakingAmplitude={0.75}
                  className="h-60 w-full"
                />
              </div>
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                      3D Voice Safety Guide
                    </span>
                    <h3 className="text-xl font-extrabold text-ink">
                      Meet Vira — Ask About Any Area or Route
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setViraGuidedTour(true, 0);
                      router.push("/explore");
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-blush-deep border border-brand-pink text-xs font-bold text-brand-pink hover:bg-brand-pink hover:text-surface-white transition-colors"
                  >
                    Open Full Voice Guide
                  </button>
                </div>

                <div
                  aria-live="polite"
                  className="p-3.5 rounded-xl bg-blush-light border border-border-rose text-xs sm:text-sm text-ink leading-relaxed"
                >
                  <span className="font-bold text-brand-pink mr-1.5">
                    Vira says:
                  </span>
                  <span>{demoSpokenLine}</span>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-ink-muted">
                    Click a button below to hear Vira speak:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => triggerDemoVoicePrompt("explain")}
                      className="px-3 py-2 rounded-xl bg-blush-light border border-border-rose text-xs font-bold text-ink hover:border-brand-pink text-left flex items-center gap-1.5"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                      <span>Why Area is Unsafe</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDemoVoicePrompt("route")}
                      className="px-3 py-2 rounded-xl bg-blush-light border border-border-rose text-xs font-bold text-ink hover:border-brand-pink text-left flex items-center gap-1.5"
                    >
                      <Route className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                      <span>Best Safe Route</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDemoVoicePrompt("haven")}
                      className="px-3 py-2 rounded-xl bg-blush-light border border-border-rose text-xs font-bold text-ink hover:border-brand-pink text-left flex items-center gap-1.5"
                    >
                      <Compass className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                      <span>Nearest Police</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerDemoVoicePrompt("distress")}
                      className="px-3 py-2 rounded-xl bg-blush-deep border border-danger-red text-xs font-bold text-danger-red hover:bg-danger-red hover:text-surface-white text-left flex items-center gap-1.5 transition-colors"
                    >
                      <Mic className="w-3.5 h-3.5 shrink-0" />
                      <span>“I feel unsafe”</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* (3) Comprehensive Safety Intelligence — Tabbed Framer Motion Explorer (Uncluttered!) */}
      <section
        id="features"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-blush-light border-b border-border-rose"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-block px-3.5 py-1 rounded-full bg-surface-white text-xs font-bold uppercase tracking-wider text-brand-pink border border-border-rose">
                Integrated Safety Ecosystem
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
                Comprehensive Safety Intelligence
              </h2>
              <p className="text-base text-ink-muted">
                Switch between our Six Core Safety Intelligence Modules and our
                Extended Protection, Verification & Phase 6 Voice Capabilities.
              </p>
            </div>

            {/* Clean Category Switcher so cards are spacious and never congested */}
            <div className="p-1.5 rounded-full bg-surface-white border border-border-rose flex items-center gap-1 self-start">
              {[
                { id: "core6" as const, label: "6 Core Modules (01–06)" },
                { id: "extended" as const, label: "Protection & 3D AI (07–14)" },
                { id: "all17" as const, label: "Show All" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFeatureCategoryTab(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition-colors ${
                    featureCategoryTab === t.id
                      ? "bg-brand-pink text-surface-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {(featureCategoryTab === "core6" ||
              featureCategoryTab === "all17") && (
              <motion.div
                key="core6-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {SIX_CORE_MODULES.map((mod) => {
                  const Icon = mod.icon;
                  const isSos = mod.number === "03";
                  return (
                    <Link
                      key={mod.title}
                      href={mod.href}
                      className={`vira-card p-6 bg-surface-white flex flex-col justify-between hover:-translate-y-1 transition-all ${
                        isSos ? "border-2 border-danger-red" : ""
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            className={`w-11 h-11 rounded-btn flex items-center justify-center border ${
                              isSos
                                ? "bg-danger-red text-surface-white border-danger-red"
                                : "bg-blush-deep text-brand-pink border-border-rose"
                            }`}
                          >
                            {isSos ? (
                              <SirenIcon size={22} variant="on-red" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blush-light text-ink-muted border border-border-rose">
                            {mod.badge}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-xs font-extrabold text-brand-pink">
                            Core Feature {mod.number}
                          </span>
                          <h3 className="text-xl font-bold text-ink">
                            {mod.title}
                          </h3>
                        </div>

                        <p className="text-sm text-ink-muted leading-relaxed">
                          {mod.description}
                        </p>

                        <div className="p-3 rounded-btn bg-blush-light border border-border-rose text-xs text-ink leading-relaxed">
                          {mod.exampleQuote}
                        </div>
                      </div>

                      <div
                        className={`pt-4 mt-4 border-t border-border-rose flex items-center justify-between text-xs font-bold ${
                          isSos ? "text-danger-red" : "text-brand-pink"
                        }`}
                      >
                        <span>{mod.ctaLabel}</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </Link>
                  );
                })}
              </motion.div>
            )}

            {(featureCategoryTab === "extended" ||
              featureCategoryTab === "all17") && (
              <motion.div
                key="extended-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2"
              >
                {EXTENDED_ECOSYSTEM_FEATURES.map((feat) => {
                  const Icon = feat.icon;
                  return (
                    <Link
                      key={feat.title}
                      href={feat.href}
                      className="vira-card p-5 bg-surface-white hover:border-brand-pink hover:-translate-y-0.5 transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="w-9 h-9 rounded-btn bg-blush-deep text-brand-pink border border-border-rose flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blush-light text-ink-muted border border-border-rose">
                            {feat.badge}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-ink">
                          {feat.title}
                        </h4>
                        <p className="text-xs text-ink-muted leading-relaxed">
                          {feat.description}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-brand-pink inline-flex items-center gap-1 pt-2 border-t border-border-rose">
                        <span>Open Module</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </Link>
                  );
                })}

                <div className="vira-card p-5 bg-blush-deep border-2 border-danger-red flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-9 h-9 rounded-btn bg-danger-red text-surface-white flex items-center justify-center">
                        <PhoneCall className="w-4 h-4" />
                      </span>
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-surface-white text-danger-red border border-danger-red">
                        ERSS-112 Bridge
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-ink">
                      Official Emergency Complement
                    </h4>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      Vira complements, and never replaces, official emergency
                      services. One-tap direct 112 calling is available on every
                      screen.
                    </p>
                  </div>
                  <a
                    href="tel:112"
                    className="text-xs font-bold text-danger-red inline-flex items-center gap-1 pt-2 border-t border-border-rose hover:underline"
                  >
                    <span>Dial 112 Emergency Line</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* (4) How It Works & 5 Dynamic Risk Levels — Clean Tabbed Architecture Explorer */}
      <section
        id="how-it-works"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-blush-deep border-b border-border-rose"
      >
        <div className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-block px-3.5 py-1 rounded-full bg-surface-white text-xs font-bold uppercase tracking-wider text-brand-pink border border-border-rose">
                Proactive Prevention Architecture
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
                How VIRA Works & Scores Risk
              </h2>
              <p className="text-base text-ink-muted">
                Explore the 4-Step Intelligence Cycle, the 5-Stage System
                Pipeline, and our 5 Accessible Dynamic Risk Levels.
              </p>
            </div>

            <div className="p-1.5 rounded-full bg-surface-white border border-border-rose flex items-center gap-1 self-start">
              {[
                { id: "cycle4" as const, label: "4-Step Cycle (01–04)" },
                { id: "pipeline5" as const, label: "5-Stage Pipeline (01–05)" },
                { id: "risk5" as const, label: "5 Dynamic Risk Levels" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setArchitectureTab(t.id)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold transition-colors ${
                    architectureTab === t.id
                      ? "bg-brand-pink text-surface-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {architectureTab === "cycle4" && (
              <motion.div
                key="arch-cycle4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative"
              >
                <div
                  aria-hidden="true"
                  className="hidden lg:block absolute top-1/2 left-8 right-8 -translate-y-1/2 border-t-2 border-dashed border-brand-pink/40 z-0"
                />
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {FOUR_STEP_CAMPUSGUARD_CYCLE.map((item) => (
                    <div
                      key={item.step}
                      className="vira-card p-6 bg-surface-white space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl font-extrabold text-brand-pink">
                          {item.step}
                        </span>
                        <span className="px-2.5 py-1 rounded bg-blush-light text-xs font-bold text-ink border border-border-rose">
                          Step {item.step}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-ink">
                        {item.title}
                      </h3>
                      <div className="text-xs font-bold text-brand-pink">
                        {item.subtitle}
                      </div>
                      <p className="text-sm text-ink-muted leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {architectureTab === "pipeline5" && (
              <motion.div
                key="arch-pipeline5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="vira-card p-6 sm:p-8 bg-surface-white space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {FIVE_STEP_SYSTEM_FLOW.map((s) => (
                    <div
                      key={s.step}
                      className="p-5 rounded-card bg-blush-light border border-border-rose space-y-2.5"
                    >
                      <div className="text-xs font-extrabold text-brand-pink">
                        STAGE {s.step}
                      </div>
                      <div className="text-base font-bold text-ink">
                        {s.title}
                      </div>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {s.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {architectureTab === "risk5" && (
              <motion.div
                key="arch-risk5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid grid-cols-1 md:grid-cols-5 gap-4"
              >
                {FIVE_RISK_LEVELS.map((item) => (
                  <div
                    key={item.level}
                    className="vira-card p-5 bg-surface-white flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-3">
                      <RiskBadge level={item.level} score={item.score} />
                      <h3 className="text-base font-bold text-ink">
                        {item.label}
                      </h3>
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {item.meaning}
                      </p>
                    </div>
                    <div className="pt-3 border-t border-border-rose text-[11px] font-bold text-ink">
                      {item.exampleCorridor}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* (5) Impact Stats, 5-Stage Segmented Pillar Tabs & Privacy by Design Checklist */}
      <section
        id="impact"
        className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-surface-white border-b border-border-rose"
      >
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="vira-card p-6 bg-blush-light text-center space-y-1.5">
              <div className="text-4xl font-extrabold text-brand-pink">
                24/7
              </div>
              <div className="text-lg font-bold text-ink">
                Live Risk Scoring
              </div>
              <p className="text-xs text-ink-muted">
                Dynamic road-segment scoring that adapts to evening lighting and
                footfall shifts between 6 PM and 2 AM.
              </p>
            </div>

            <div className="vira-card p-6 bg-blush-light text-center space-y-1.5">
              <div className="text-4xl font-extrabold text-brand-pink">5</div>
              <div className="text-lg font-bold text-ink">
                Dynamic Risk Levels
              </div>
              <p className="text-xs text-ink-muted">
                Accessible badges (Low, Caution, Elevated, High, Active
                Incident) with distinct icons, borders, and explanations.
              </p>
            </div>

            <div className="vira-card p-6 bg-blush-light text-center space-y-1.5">
              <div className="text-4xl font-extrabold text-brand-pink">0</div>
              <div className="text-lg font-bold text-ink">
                Location Data Sold
              </div>
              <p className="text-xs text-ink-muted">
                Strict consent-first sharing that revokes automatically as soon
                as your journey ends.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 vira-card p-6 sm:p-8 bg-surface-white space-y-6">
              <div className="flex flex-wrap gap-2 p-1.5 rounded-full bg-blush-light border border-border-rose">
                {(
                  Object.keys(PILLAR_TABS) as Array<keyof typeof PILLAR_TABS>
                ).map((tabKey) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => setActiveTab(tabKey)}
                    className={`flex-1 py-2 px-3 rounded-full text-xs sm:text-sm font-bold transition-colors ${
                      activeTab === tabKey
                        ? "bg-brand-pink text-surface-white"
                        : "text-ink hover:bg-blush-deep"
                    }`}
                  >
                    {tabKey}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block px-3 py-1 rounded-full bg-blush-deep text-xs font-bold text-brand-pink border border-border-rose">
                    {PILLAR_TABS[activeTab].stage}
                  </span>
                  <span className="inline-block px-3 py-1 rounded-full bg-blush-light text-xs font-bold text-ink border border-border-rose">
                    {PILLAR_TABS[activeTab].metric}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-ink">
                  {PILLAR_TABS[activeTab].heading}
                </h3>
                <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                  {PILLAR_TABS[activeTab].body}
                </p>
                <div className="pt-2">
                  <Link
                    href={PILLAR_TABS[activeTab].actionHref}
                    className="vira-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold"
                  >
                    <span>{PILLAR_TABS[activeTab].actionLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 vira-card p-6 sm:p-8 bg-blush-light space-y-4">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-brand-pink" />
                <h3 className="text-xl font-bold text-ink">
                  Privacy by Design Checklist
                </h3>
              </div>
              <p className="text-xs text-ink-muted">
                Built so safety intelligence never becomes surveillance.
              </p>

              <ul className="space-y-3 text-sm text-ink">
                {[
                  "Granular Trusted Circle consent (WHO, WHAT, WHEN, HOW LONG) with automatic expiry upon safe arrival.",
                  "Zero raw GPS coordinates displayed or exposed; human-readable place names everywhere.",
                  "Anonymous-by-default community safety reporting with corroborated vs. unverified distinction.",
                  "Camera or microphone permission is requested ONLY when you actively tap voice or evidence controls.",
                  "We never sell, monetize, or broker user location or voice transcripts.",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0 mt-1" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* (6) CTA Section */}
      {/* Dedicated Admin, Police & Civic Command Portal Sign-In Section on Landing Page */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-surface-white border-b border-border-rose">
        <div className="max-w-6xl mx-auto vira-card p-6 sm:p-8 bg-blush-deep border-2 border-brand-pink flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ink text-surface-white text-xs font-extrabold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5 text-brand-pink" />
              <span>Admin, Police & Civic Command Portal</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
              Authorized Sign-In for Police, Civic Teams & Platform Admins
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              Police & Civic Reviews, Tamper-Evident Evidence Vault, Combined
              Users Activity Dashboard, Current Cases Data Check, and the
              Emergency Complaints Solved/Unsolved Tracker are housed inside the
              dedicated Admin Portal.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-ink">
              <span className="px-2.5 py-1 rounded-lg bg-surface-white border border-border-rose">
                ✓ Police & Civic Reviews Section
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-white border border-border-rose">
                ✓ SHA-256 Evidence Section
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-white border border-border-rose">
                ✓ Combined Users Activity Dashboard
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-white border border-border-rose">
                ✓ Current Cases Data Check
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-white border border-border-rose">
                ✓ Emergency Complaints (Solved / Unsolved Tracker)
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full lg:w-auto">
            <Link
              href="/login?role=admin"
              className="px-6 py-3.5 rounded-btn bg-ink text-surface-white text-sm font-extrabold hover:bg-brand-pink transition-colors flex items-center justify-center gap-2 shadow-elevated"
            >
              <Lock className="w-4 h-4 text-brand-pink" />
              <span>Sign In to Admin Portal →</span>
            </Link>
            <Link
              href="/admin"
              className="vira-btn-secondary px-6 py-2.5 text-xs font-bold text-center"
            >
              Quick Open Admin Demo Desk
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-blush-deep border-b border-border-rose text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-ink">
            Ready to Make Every Journey Safer?
          </h2>
          <p className="text-base sm:text-lg text-ink-muted">
            Join Vira to inspect explainable risk zones, plan safety-optimized
            routes, talk to our 3D AI safety companion, and travel with your
            consent-based Trusted Circle.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/explore"
              className="vira-btn-primary px-6 py-3.5 text-base font-bold inline-flex items-center gap-2"
            >
              <span>Open Interactive Map & AI Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login?role=user"
              className="vira-btn-secondary px-6 py-3.5 text-base font-bold"
            >
              User Sign In
            </Link>
            <Link
              href="/login?role=admin"
              className="px-6 py-3.5 rounded-btn bg-ink text-surface-white text-base font-bold hover:bg-brand-pink transition-colors"
            >
              Admin Portal Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* (7) Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-surface-white text-ink">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-1">
            <div className="font-bold text-base text-ink">
              Vira — Building safer communities through predictive, explainable
              intelligence.
            </div>
            <p className="text-xs text-ink-muted">
              Vira complements, and does not replace, emergency services. In an
              emergency call 112.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-ink-muted">
            <Link href="/explore" className="hover:text-ink">
              Safety Map & AI Portal
            </Link>
            <Link href="/planner" className="hover:text-ink">
              Safe Journey Planner
            </Link>
            <Link href="/sos" className="hover:text-danger-red">
              Emergency SOS (112)
            </Link>
            <Link href="/login?role=admin" className="text-brand-pink hover:text-ink">
              Admin Portal Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );

  if (mobilePreviewMode) {
    return (
      <div className="min-h-screen bg-blush-deep py-6 px-4 flex flex-col items-center justify-start">
        <div className="mb-4 px-4 py-2 rounded-full bg-surface-white border border-border-rose shadow-sm flex items-center gap-3 text-xs font-bold text-ink">
          <Smartphone className="w-4 h-4 text-brand-pink" />
          <span>VIRA Mobile Application Ratio Preview (430 × 880px)</span>
          <button
            type="button"
            onClick={() => setMobilePreviewMode(false)}
            className="px-2.5 py-1 rounded-full bg-brand-pink text-surface-white text-[11px] font-extrabold"
          >
            Return to Full Desktop
          </button>
        </div>
        <div className="w-full max-w-[430px] h-[860px] rounded-[36px] border-[8px] border-ink bg-surface-white shadow-elevated overflow-hidden flex flex-col relative">
          <div className="h-6 bg-ink text-surface-white px-5 flex items-center justify-between text-[10px] font-bold shrink-0">
            <span>9:41 PM</span>
            <span className="w-16 h-2.5 rounded-full bg-ink-muted/40" />
            <span>5G · 100%</span>
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
            {pageBody}
          </div>
        </div>
      </div>
    );
  }

  return pageBody;
}
