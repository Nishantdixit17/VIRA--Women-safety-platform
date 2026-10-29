"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  ShieldCheck,
  Route,
  Eye,
  ArrowRight,
  SlidersHorizontal,
  PhoneCall,
  Map,
  Sparkles,
  Compass,
  Plus,
  Car,
  Trash2,
  MapPin,
  Layers,
} from "lucide-react";
import { AppShell, ALL_PLATFORM_MODULES } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import { formatHourLabel } from "@/lib/engine/risk-engine";
import { useSafetyStore } from "@/store/useSafetyStore";
import { ViraSplitConcierge } from "@/components/vira/ViraSplitConcierge";

const SafetyMapCanvas = dynamic(
  () => import("@/components/map/SafetyMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] rounded-2xl bg-blush-deep border border-border-rose flex items-center justify-center text-sm font-bold text-ink-muted">
        Loading Enlarged New Delhi Safety Map...
      </div>
    ),
  }
);

const TIME_SLIDER_STEPS = [
  { sliderValue: 18, hour24: 18, label: "6:00 PM" },
  { sliderValue: 19, hour24: 19, label: "7:00 PM" },
  { sliderValue: 20, hour24: 20, label: "8:00 PM" },
  { sliderValue: 21, hour24: 21, label: "9:00 PM" },
  { sliderValue: 22, hour24: 22, label: "10:00 PM" },
  { sliderValue: 23, hour24: 23, label: "11:00 PM" },
  { sliderValue: 24, hour24: 0, label: "12:00 AM" },
  { sliderValue: 25, hour24: 1, label: "1:00 AM" },
  { sliderValue: 26, hour24: 2, label: "2:00 AM" },
];

export default function ExplorePage() {
  const {
    selectedAreaSlug,
    setSelectedAreaSlug,
    setCurrentPlaceName,
    setTimeSliderHour,
    highlightedSafeHavenId,
    portalViewMode,
    setPortalViewMode,
    activeCopilotPlan,
    addPlaceToCopilotPlan,
    replanCopilotDelay,
    replanCopilotAddSafeHaven,
    replanCopilotSwitchToCab,
    removeCopilotStop,
    setExternalChatPrompt,
    language,
  } = useSafetyStore();

  const [sliderStep, setSliderStep] = useState<number>(22);
  const [zones, setZones] = useState<EnrichedAreaZone[]>([]);
  const [safeHavens, setSafeHavens] = useState<
    Array<{
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
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [rightPaneTab, setRightPaneTab] = useState<
    "concierge" | "dossier" | "copilot"
  >("concierge");
  const [bottomDirectoryTab, setBottomDirectoryTab] = useState<
    "corridors" | "havens" | "modules"
  >("corridors");
  const [showFilters, setShowFilters] = useState(false);

  const [riskFilter, setRiskFilter] = useState<
    "ALL" | "HIGH_OR_ELEVATED" | "LOW_SAFE"
  >("ALL");
  const [showSafeHavens, setShowSafeHavens] = useState(true);
  const [poorLightingOnly, setPoorLightingOnly] = useState(false);
  const [verifiedReportsOnly, setVerifiedReportsOnly] = useState(false);

  const activeHour24 = useMemo(() => {
    const found = TIME_SLIDER_STEPS.find((s) => s.sliderValue === sliderStep);
    return found ? found.hour24 : 22;
  }, [sliderStep]);

  useEffect(() => {
    setTimeSliderHour(activeHour24);
    let cancelled = false;
    setLoading(true);

    fetch(`/api/risk?hour=${activeHour24}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.zones) {
          setZones(data.zones);
          if (!selectedAreaSlug && data.zones.length > 0) {
            setSelectedAreaSlug(data.zones[0].slug);
          }
        }
        if (data.safeHavens) {
          setSafeHavens(data.safeHavens);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeHour24, selectedAreaSlug, setSelectedAreaSlug, setTimeSliderHour]);

  const filteredZones = useMemo(() => {
    return zones.filter((z) => {
      if (
        riskFilter === "HIGH_OR_ELEVATED" &&
        !["ELEVATED", "HIGH", "ACTIVE_INCIDENT"].includes(z.evaluation.level)
      ) {
        return false;
      }
      if (
        riskFilter === "LOW_SAFE" &&
        !["LOW", "CAUTION"].includes(z.evaluation.level)
      ) {
        return false;
      }
      if (poorLightingOnly && z.lightingScore >= 55) {
        return false;
      }
      if (verifiedReportsOnly && z.verifiedReports < 3) {
        return false;
      }
      return true;
    });
  }, [zones, riskFilter, poorLightingOnly, verifiedReportsOnly]);

  const selectedZone = useMemo(() => {
    return (
      zones.find((z) => z.slug === selectedAreaSlug) ||
      filteredZones[0] ||
      zones[0] ||
      null
    );
  }, [zones, filteredZones, selectedAreaSlug]);

  const handleSelectZone = (zone: EnrichedAreaZone) => {
    setSelectedAreaSlug(zone.slug);
    setCurrentPlaceName(`${zone.name}, ${zone.city}`);
  };

  const handleAddZoneToCopilot = (zone: EnrichedAreaZone) => {
    addPlaceToCopilotPlan({
      name: zone.name,
      district: zone.district,
      areaSlug: zone.slug,
      safetyScore: zone.evaluation.safetyScore,
      riskLevel: zone.evaluation.level,
      whySafe: zone.evaluation.headlineReason,
      coordinates: [zone.centerLat, zone.centerLng],
    });
    setRightPaneTab("copilot");
  };

  const handleAskViraAboutZone = (zone: EnrichedAreaZone) => {
    handleSelectZone(zone);
    setRightPaneTab("concierge");
    setExternalChatPrompt(
      `Tell me in simple words if ${zone.name} is safe at ${formatHourLabel(
        activeHour24
      )} and what is the safest road.`
    );
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-[1520px] mx-auto space-y-6">
        {/* Top Header & Time Slider */}
        <div className="vira-card p-5 bg-surface-white space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blush-deep text-brand-pink text-xs font-bold">
                  {language === "hi"
                    ? "नई दिल्ली सुरक्षा मानचित्र"
                    : "New Delhi Safety Map & Place Finder"}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
                {language === "hi"
                  ? "किसी भी स्थान को खोजें, 9 सुरक्षा पैरामीटर देखें और सुरक्षित रास्ता चुनें"
                  : "Search Any Location in New Delhi, Check 9 Safety Parameters & Find Safe Routes"}
              </h1>
              <p className="text-xs text-ink-muted">
                Type any place in New Delhi or click on the map below to see
                safety details, police help, and the safest road.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Time Slider (6 PM - 2 AM) */}
              <div className="px-3.5 py-2 rounded-xl bg-blush-light border border-border-rose flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-ink shrink-0">
                  <Clock className="w-3.5 h-3.5 text-brand-pink" />
                  <span>Time: {formatHourLabel(activeHour24)}</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={26}
                  step={1}
                  value={sliderStep}
                  onChange={(e) => setSliderStep(parseInt(e.target.value, 10))}
                  aria-label="Time Slider from 6 PM to 2 AM"
                  className="w-28 sm:w-36 accent-[#E64A7B] cursor-pointer h-1.5"
                />
                <span className="text-[10px] font-bold text-ink-muted hidden sm:inline">
                  6PM–2AM
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPortalViewMode(
                    portalViewMode === "fullmap" ? "split" : "fullmap"
                  )
                }
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border flex items-center gap-1.5 transition-all ${
                  portalViewMode === "fullmap"
                    ? "bg-brand-pink text-surface-white border-brand-pink"
                    : "bg-surface-white text-ink border-border-rose hover:bg-blush-light"
                }`}
              >
                <Map className="w-3.5 h-3.5" />
                <span>
                  {portalViewMode === "fullmap" ? "Standard Size" : "Extra Large Map"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
                  showFilters || riskFilter !== "ALL"
                    ? "bg-blush-deep text-brand-pink border-brand-pink"
                    : "bg-surface-white text-ink border-border-rose hover:bg-blush-light"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Filter Map</span>
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden pt-3 border-t border-border-rose flex flex-wrap items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => setRiskFilter("ALL")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    riskFilter === "ALL"
                      ? "bg-brand-pink text-surface-white border-brand-pink"
                      : "bg-surface-white text-ink border-border-rose"
                  }`}
                >
                  Show All Areas ({zones.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter("HIGH_OR_ELEVATED")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    riskFilter === "HIGH_OR_ELEVATED"
                      ? "bg-danger-red text-surface-white border-danger-red"
                      : "bg-surface-white text-ink border-border-rose"
                  }`}
                >
                  Only Red Zones (High Risk)
                </button>
                <button
                  type="button"
                  onClick={() => setRiskFilter("LOW_SAFE")}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    riskFilter === "LOW_SAFE"
                      ? "bg-brand-pink text-surface-white border-brand-pink"
                      : "bg-surface-white text-ink border-border-rose"
                  }`}
                >
                  Only Safe Areas
                </button>
                <button
                  type="button"
                  onClick={() => setPoorLightingOnly((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    poorLightingOnly
                      ? "bg-blush-deep text-ink border-brand-pink"
                      : "bg-surface-white text-ink-muted border-border-rose"
                  }`}
                >
                  Low Streetlights
                </button>
                <button
                  type="button"
                  onClick={() => setVerifiedReportsOnly((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    verifiedReportsOnly
                      ? "bg-blush-deep text-ink border-brand-pink"
                      : "bg-surface-white text-ink-muted border-border-rose"
                  }`}
                >
                  Areas With Past Complaints
                </button>
                <button
                  type="button"
                  onClick={() => setShowSafeHavens((v) => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    showSafeHavens
                      ? "bg-blush-deep text-ink border-brand-pink"
                      : "bg-surface-white text-ink-muted border-border-rose"
                  }`}
                >
                  {showSafeHavens
                    ? `Police & Safe Stops Shown (${safeHavens.length})`
                    : "Show Police & Safe Stops"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Highlighted Nearest Safe Haven Banner */}
        {highlightedSafeHavenId && safeHavens[0] && (
          <div className="vira-card p-4 bg-blush-deep border-2 border-brand-pink flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-brand-pink shrink-0" />
              <div>
                <div className="text-[11px] font-extrabold uppercase text-brand-pink">
                  Closest 24x7 Safe Place
                </div>
                <div className="text-xs sm:text-sm font-bold text-ink">
                  {safeHavens[0].name} · {safeHavens[0].distanceText} (
                  {safeHavens[0].address})
                </div>
              </div>
            </div>
            <a
              href={`tel:${safeHavens[0].contactPhone.split("/")[0].trim()}`}
              className="vira-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Call ({safeHavens[0].contactPhone})</span>
            </a>
          </div>
        )}

        {/* ENLARGED FULL-WIDTH NEW DELHI MAP + 9 SAFETY PARAMETERS */}
        <div className="w-full">
          <SafetyMapCanvas
            zones={filteredZones}
            safeHavens={safeHavens}
            selectedSlug={selectedZone?.slug || ""}
            onSelectZone={handleSelectZone}
            showSafeHavens={showSafeHavens}
            copilotStops={activeCopilotPlan.stops}
            onAddZoneToCopilot={handleAddZoneToCopilot}
            onAskViraAboutZone={handleAskViraAboutZone}
            isFullMap={portalViewMode === "fullmap"}
            onToggleFullMap={() =>
              setPortalViewMode(
                portalViewMode === "fullmap" ? "split" : "fullmap"
              )
            }
            activeHourLabel={formatHourLabel(activeHour24)}
          />
        </div>

        {/* CLEAN 2-COLUMN SECTION BELOW MAP: Selected Area Summary + Vira 3D Voice Assistant */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 6 Columns: Selected Area Simple Explanation & Actions */}
          <div className="lg:col-span-6">
            {loading && !selectedZone ? (
              <div className="vira-card p-8 text-center text-sm text-ink-muted">
                Loading area safety details...
              </div>
            ) : selectedZone ? (
              <div className="vira-card p-5 bg-surface-white space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-rose pb-3">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-pink">
                      Selected Area Summary ({formatHourLabel(activeHour24)})
                    </span>
                    <h2 className="text-lg font-extrabold text-ink">
                      {selectedZone.name}
                    </h2>
                    <p className="text-xs text-ink-muted">
                      {selectedZone.district}, New Delhi
                    </p>
                  </div>
                  <RiskBadge
                    level={selectedZone.evaluation.level}
                    score={selectedZone.evaluation.score}
                  />
                </div>

                <div className="p-4 rounded-xl bg-blush-deep border border-brand-pink space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-extrabold text-brand-pink uppercase">
                    <span>Why This Area Has This Score</span>
                    <span>
                      Safety Score: {selectedZone.evaluation.safetyScore}/100
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-ink leading-relaxed">
                    {selectedZone.evaluation.headlineReason}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAskViraAboutZone(selectedZone)}
                    className="vira-btn-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ask Vira 3D</span>
                  </button>
                  <Link
                    href={`/planner?dest=${encodeURIComponent(
                      selectedZone.name
                    )}`}
                    className="vira-btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Route className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Safe Route Here</span>
                  </Link>
                  <Link
                    href={`/places/${selectedZone.slug}`}
                    className="vira-btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Full Area Info</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAddZoneToCopilot(selectedZone)}
                    className="vira-btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Add to Trip</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Right 6 Columns: Vira 3D Voice Assistant or Trip Plan */}
          <div className="lg:col-span-6 space-y-3">
            <div className="p-1.5 rounded-full bg-surface-white border border-border-rose flex items-center gap-1 shadow-sm">
              {[
                {
                  id: "concierge" as const,
                  label: "Vira 3D Voice Guide",
                  icon: Sparkles,
                },
                {
                  id: "copilot" as const,
                  label: `My Safe Trip (${activeCopilotPlan.stops.length})`,
                  icon: Compass,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = rightPaneTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setRightPaneTab(tab.id)}
                    className={`flex-1 py-2 px-3 rounded-full text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors ${
                      active
                        ? "bg-brand-pink text-surface-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {rightPaneTab === "copilot" ? (
              <div className="vira-card p-5 bg-surface-white space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-border-rose pb-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-pink">
                      My Planned Stops
                    </span>
                    <h2 className="text-base font-extrabold text-ink">
                      {activeCopilotPlan.title}
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-brand-pink text-surface-white text-xs font-extrabold">
                    {activeCopilotPlan.overallSafetyScore}/100 Safe
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => replanCopilotDelay(20)}
                    className="p-2.5 rounded-xl bg-blush-light border border-border-rose hover:border-brand-pink text-xs font-bold text-ink flex items-center gap-1.5"
                  >
                    <Clock className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Running 20m Late</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => replanCopilotAddSafeHaven()}
                    className="p-2.5 rounded-xl bg-blush-light border border-border-rose hover:border-brand-pink text-xs font-bold text-ink flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-pink" />
                    <span>+ Add Police Stop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => replanCopilotSwitchToCab()}
                    className="p-2.5 rounded-xl bg-blush-light border border-border-rose hover:border-brand-pink text-xs font-bold text-ink flex items-center gap-1.5"
                  >
                    <Car className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Switch to Safe Cab</span>
                  </button>
                  <Link
                    href="/journey"
                    className="p-2.5 rounded-xl bg-brand-pink text-surface-white text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <span>Start Trip Monitor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {activeCopilotPlan.stops.map((stop) => (
                    <div
                      key={stop.id}
                      className="p-3 rounded-xl bg-blush-light border border-border-rose flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="text-xs font-extrabold text-ink">
                          {stop.stopNumber}. {stop.name}
                        </div>
                        <div className="text-[11px] text-ink-muted">
                          {stop.startTime} – {stop.endTime} · {stop.district}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCopilotStop(stop.id)}
                        className="text-xs font-bold text-danger-red hover:underline flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="min-h-[500px]">
                <ViraSplitConcierge
                  onFocusCorridorSlug={(slug) => setSelectedAreaSlug(slug)}
                />
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM DIRECTORY: New Delhi Areas | 24x7 Police & Safe Stops | All App Features */}
        <div className="vira-card p-5 sm:p-6 bg-surface-white space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-rose pb-3">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-brand-pink">
                Quick Directory
              </span>
              <h2 className="text-lg font-extrabold text-ink">
                New Delhi Areas, 24x7 Police Booths & All Features
              </h2>
            </div>

            <div className="p-1 rounded-full bg-blush-light border border-border-rose flex items-center gap-1">
              {[
                {
                  id: "corridors" as const,
                  label: `Areas (${filteredZones.length})`,
                },
                {
                  id: "havens" as const,
                  label: `Police & Safe Stops (${safeHavens.length})`,
                },
                {
                  id: "modules" as const,
                  label: "All Features",
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setBottomDirectoryTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-colors ${
                    bottomDirectoryTab === tab.id
                      ? "bg-brand-pink text-surface-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {bottomDirectoryTab === "corridors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {filteredZones.map((zone) => {
                const isSelected = selectedZone?.slug === zone.slug;
                return (
                  <div
                    key={zone.slug}
                    onClick={() => handleSelectZone(zone)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        handleSelectZone(zone);
                      }
                    }}
                    className={`p-4 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? "bg-blush-deep border-2 border-brand-pink shadow-elevated"
                        : "bg-blush-light/60 border-border-rose hover:bg-blush-light"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <RiskBadge
                          level={zone.evaluation.level}
                          score={zone.evaluation.score}
                          compact
                        />
                        <span className="text-[11px] font-extrabold text-brand-pink">
                          Safety {zone.evaluation.safetyScore}/100
                        </span>
                      </div>
                      <div className="font-extrabold text-sm text-ink">
                        {zone.name}
                      </div>
                      <div className="text-[11px] font-semibold text-ink-muted">
                        {zone.district}, New Delhi
                      </div>
                      <p className="text-xs text-ink leading-relaxed line-clamp-2">
                        {zone.evaluation.headlineReason}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border-rose flex items-center justify-between gap-2">
                      <Link
                        href={`/planner?dest=${encodeURIComponent(zone.name)}`}
                        onClick={(e) => e.stopPropagation()}
                        className="py-1.5 px-2.5 rounded-lg bg-surface-white border border-border-rose hover:border-brand-pink text-xs font-bold text-ink"
                      >
                        Safe Route
                      </Link>
                      <Link
                        href={`/places/${zone.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="py-1.5 px-2.5 rounded-lg bg-brand-pink text-surface-white text-xs font-bold flex items-center gap-1"
                      >
                        <span>Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {bottomDirectoryTab === "havens" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeHavens.map((haven) => (
                <div
                  key={haven.id}
                  className="p-4 rounded-xl bg-blush-light border border-border-rose flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-surface-white text-[10px] font-extrabold uppercase">
                        {haven.category.replace("_", " ")}
                      </span>
                      <span className="text-xs font-bold text-brand-pink">
                        {haven.distanceText}
                      </span>
                    </div>
                    <h3 className="text-sm font-extrabold text-ink">
                      {haven.name}
                    </h3>
                    <p className="text-xs text-ink-muted flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                      <span>{haven.address}</span>
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border-rose flex items-center justify-between gap-2">
                    <a
                      href={`tel:${haven.contactPhone.split("/")[0].trim()}`}
                      className="vira-btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>Call ({haven.contactPhone})</span>
                    </a>
                    <Link
                      href={`/planner?dest=${encodeURIComponent(
                        haven.placeName
                      )}`}
                      className="vira-btn-secondary py-1.5 px-3 text-xs font-bold flex items-center gap-1"
                    >
                      <Route className="w-3 h-3 text-brand-pink" />
                      <span>Safe Route</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {bottomDirectoryTab === "modules" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {ALL_PLATFORM_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <Link
                    key={mod.href}
                    href={mod.href}
                    className="p-4 rounded-xl bg-blush-light border border-border-rose hover:border-brand-pink transition-all flex flex-col justify-between space-y-2.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="w-9 h-9 rounded-lg bg-surface-white border border-border-rose text-brand-pink flex items-center justify-center group-hover:bg-brand-pink group-hover:text-surface-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </span>
                      <Layers className="w-3.5 h-3.5 text-ink-muted" />
                    </div>
                    <div>
                      <div className="text-sm font-extrabold text-ink">
                        {mod.label}
                      </div>
                      <div className="text-[11px] font-semibold text-ink-muted">
                        {mod.simpleHint}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
