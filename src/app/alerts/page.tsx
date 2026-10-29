"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Radio,
  Route,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Sun,
  Users,
  Video,
  Search,
  RefreshCw,
  Navigation,
  PhoneCall,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { RiskLevel } from "@/lib/engine/risk-engine";
import { useSafetyStore } from "@/store/useSafetyStore";
import type {
  LivePatrolUnit,
  LivePlaceTelemetryItem,
  RealtimeMapPayload,
} from "@/lib/realtime/map-telemetry";
import type { EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import type { SafeHavenMapItem } from "@/components/map/SafetyMapCanvas";

const SafetyMapCanvas = dynamic(
  () => import("@/components/map/SafetyMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] rounded-card bg-blush-deep border border-border-rose flex items-center justify-center text-xs font-extrabold text-brand-pink">
        Loading Real-Time Places Telemetry Map...
      </div>
    ),
  }
);

interface SafetyAlertItem {
  id: string;
  title: string;
  description: string;
  areaSlug: string;
  placeName: string;
  riskLevel: RiskLevel;
  category: string;
  source: string;
  targetAudience: string;
  whyReason: string;
  activeUntil: string;
  createdAt?: string;
}

export default function AlertsPage() {
  const {
    clearUnreadAlerts,
    incrementUnreadAlerts,
    setExternalChatPrompt,
    setPortalViewMode,
    setSelectedAreaSlug,
  } = useSafetyStore();

  const [alerts, setAlerts] = useState<SafetyAlertItem[]>([]);
  const [liveToast, setLiveToast] = useState<SafetyAlertItem | null>(null);
  const [audienceFilter, setAudienceFilter] = useState<
    "ALL" | "POLICE" | "MUNICIPAL" | "UNIVERSITY"
  >("ALL");

  // Real-Time Places Dashboard State (powered by /api/map/realtime)
  const [dashboardTab, setDashboardTab] = useState<
    "places-dashboard" | "live-map-split" | "sse-dispatches"
  >("places-dashboard");
  const [placeRiskFilter, setPlaceRiskFilter] = useState<
    "ALL" | "RED_ZONES" | "ELEVATED" | "SAFE"
  >("ALL");
  const [placeSearch, setPlaceSearch] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedHour, setSelectedHour] = useState<number>(21);
  const [lastUpdatedDisplay, setLastUpdatedDisplay] =
    useState<string>("Syncing...");
  const [placesTelemetry, setPlacesTelemetry] = useState<
    LivePlaceTelemetryItem[]
  >([]);
  const [patrolUnits, setPatrolUnits] = useState<LivePatrolUnit[]>([]);
  const [liveZones, setLiveZones] = useState<EnrichedAreaZone[]>([]);
  const [safeHavens, setSafeHavens] = useState<SafeHavenMapItem[]>([]);
  const [focusedPlaceSlug, setFocusedPlaceSlug] = useState<string>(
    "minto-bridge-underpass-lane"
  );
  const [summaryStats, setSummaryStats] = useState({
    monitoredPlacesCount: 8,
    safeHavensOnlineCount: 6,
    activeRedZonesCount: 3,
    elevatedZonesCount: 2,
    safeZonesCount: 3,
    citySafetyIndex: 62,
    avgLightingScore: 64,
    avgFootfallScore: 58,
    avgCctvScore: 68,
    activePatrolUnitsCount: 5,
    telemetryLatencyMs: 21,
  });

  const loadAlerts = (aud = audienceFilter) => {
    fetch(`/api/alerts?audience=${aud}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.alerts) setAlerts(d.alerts);
      });
  };

  const fetchRealtimePlacesDashboard = async (hour = selectedHour) => {
    try {
      const res = await fetch(`/api/map/realtime?hour=${hour}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: RealtimeMapPayload = await res.json();

      if (data.placesDashboard) {
        setPlacesTelemetry(data.placesDashboard);
      }
      if (data.patrolUnits) {
        setPatrolUnits(data.patrolUnits);
      }
      if (data.zones) {
        setLiveZones(data.zones);
      }
      if (data.safeHavens) {
        setSafeHavens(data.safeHavens);
      }
      if (data.summary) {
        setSummaryStats(data.summary);
      }
      if (data.timestampDisplay) {
        setLastUpdatedDisplay(data.timestampDisplay);
      }
    } catch {
      // Silent retry on next tick
    }
  };

  useEffect(() => {
    clearUnreadAlerts();
    loadAlerts(audienceFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audienceFilter]);

  // Poll /api/map/realtime every 4 seconds for real-time places dashboard
  useEffect(() => {
    fetchRealtimePlacesDashboard(selectedHour);
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealtimePlacesDashboard(selectedHour);
    }, 4000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, selectedHour]);

  // Live SSE EventSource for instant safety alerts
  useEffect(() => {
    const es = new EventSource("/api/alerts/stream");

    es.addEventListener("live_alert", (ev) => {
      try {
        const parsed = JSON.parse((ev as MessageEvent).data);
        if (parsed.alert) {
          setAlerts((prev) => [parsed.alert, ...prev.slice(0, 24)]);
          setLiveToast(parsed.alert);
          incrementUnreadAlerts();
        }
      } catch {
        // Ignore parse error
      }
    });

    return () => {
      es.close();
    };
  }, [incrementUnreadAlerts]);

  const triggerSimulatedLiveAlertNow = async () => {
    const res = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Live Telemetry Spike: Streetlight Outage on Minto Service Lane",
        description:
          "Automated corridor lux sensor + 3 commuter corroborations report sudden darkness under Span #2 (Lighting dropped to 26%). Safe Journey Planner has updated evening routes.",
        areaSlug: "minto-bridge-underpass-lane",
        placeName: "Minto Bridge Underpass Service Corridor",
        riskLevel: "HIGH",
        category: "LIGHTING_OUTAGE",
        source: "AI_PREDICTION",
        targetAudience: "ALL",
        whyReason:
          "Sudden drop in street lighting (26/100) + late-evening pedestrian isolation.",
        activeUntil: "04:00 AM",
      }),
    });
    const data = await res.json();
    if (data.alert) {
      setAlerts((prev) => [data.alert, ...prev]);
      setLiveToast(data.alert);
    }
    fetchRealtimePlacesDashboard(selectedHour);
  };

  const filteredPlaces = useMemo(() => {
    return placesTelemetry.filter((place) => {
      if (placeRiskFilter === "RED_ZONES" && !place.isRedZone) return false;
      if (
        placeRiskFilter === "ELEVATED" &&
        (place.isRedZone || place.riskLevel !== "ELEVATED")
      )
        return false;
      if (placeRiskFilter === "SAFE" && place.riskLevel !== "LOW") return false;

      if (placeSearch.trim()) {
        const q = placeSearch.trim().toLowerCase();
        return (
          place.name.toLowerCase().includes(q) ||
          place.corridorName.toLowerCase().includes(q) ||
          place.district.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [placesTelemetry, placeRiskFilter, placeSearch]);

  const hourLabel = useMemo(() => {
    if (selectedHour === 0) return "12:00 AM (Midnight)";
    if (selectedHour < 12) return `${selectedHour}:00 AM`;
    if (selectedHour === 12) return "12:00 PM";
    return `${selectedHour - 12}:00 PM`;
  }, [selectedHour]);

  return (
    <AppShell>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1480px] mx-auto space-y-7">
        {/* Top Real-Time Telemetry Stream Bar */}
        <div className="vira-card px-5 py-3 bg-blush-deep border border-brand-pink flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              href="/explore"
              className="px-3 py-1 rounded-full bg-surface-white border border-border-rose text-[11px] font-bold text-ink hover:border-brand-pink shrink-0"
            >
              ← Back to Map
            </Link>
            <span className="px-2.5 py-0.5 rounded-full bg-danger-red text-surface-white text-[10px] font-extrabold uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Live Feed</span>
            </span>
            <span className="text-xs font-bold text-ink truncate">
              New Delhi Places Telemetry · Updated:{" "}
              <strong className="text-brand-pink">{lastUpdatedDisplay}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {dashboardTab !== "places-dashboard" && (
              <button
                type="button"
                onClick={() => setDashboardTab("places-dashboard")}
                className="px-3 py-1 rounded-full bg-surface-white border border-border-rose text-[11px] font-bold text-ink hover:border-brand-pink"
              >
                ← Back to Places Dashboard
              </button>
            )}
            <button
              type="button"
              onClick={() => setAutoRefresh((v) => !v)}
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold border flex items-center gap-1.5 transition-all ${
                autoRefresh
                  ? "bg-brand-pink text-surface-white border-brand-pink"
                  : "bg-surface-white text-ink border-border-rose"
              }`}
            >
              <RefreshCw
                className={`w-3 h-3 ${autoRefresh ? "animate-spin" : ""}`}
              />
              <span>{autoRefresh ? "Live Sync: ON" : "Paused"}</span>
            </button>
          </div>
        </div>

        {/* Main Header + Time Window Controls + Simulate Button */}
        <div className="vira-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-pink" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-pink">
                  New Delhi Live Safety Dashboard
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Live Area Safety Scores & Warnings
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted max-w-3xl">
                Check live safety warnings, working streetlights, crowd levels,
                CCTV cameras, and nearest police help across New Delhi.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Time-of-Day Telemetry Selector */}
              <div className="flex items-center gap-1.5 bg-blush-light px-3 py-1.5 rounded-btn border border-border-rose">
                <Clock className="w-3.5 h-3.5 text-brand-pink" />
                <span className="text-[11px] font-bold text-ink-muted">
                  Time Window:
                </span>
                <select
                  value={selectedHour}
                  onChange={(e) => setSelectedHour(Number(e.target.value))}
                  aria-label="Select telemetry hour"
                  className="bg-transparent text-xs font-extrabold text-ink outline-none cursor-pointer"
                >
                  <option value={18}>6:00 PM (Evening)</option>
                  <option value={20}>8:00 PM (Peak Commute)</option>
                  <option value={21}>9:00 PM (Night Transition)</option>
                  <option value={22}>10:00 PM (Late Evening)</option>
                  <option value={23}>11:00 PM (High Vigilance)</option>
                  <option value={1}>1:00 AM (Late Night)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={triggerSimulatedLiveAlertNow}
                className="vira-btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simulate Live Alert & Sensor Spike</span>
              </button>
            </div>
          </div>

          {/* 4 Real-Time Places Dashboard KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-2">
            <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                <span>Monitored Places Online</span>
                <MapPin className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-2xl font-black text-ink">
                {summaryStats.monitoredPlacesCount} Corridors{" "}
                <span className="text-xs font-bold text-brand-pink">
                  + {summaryStats.safeHavensOnlineCount} Havens
                </span>
              </div>
              <div className="text-[11px] font-semibold text-ink-muted flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-brand-pink" />
                <span>100% Sensor Heartbeat ({lastUpdatedDisplay})</span>
              </div>
            </div>

            <div className="p-4 rounded-card bg-blush-deep border-2 border-danger-red space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-danger-red">
                <span>Active Red Zones ({hourLabel})</span>
                <AlertTriangle className="w-4 h-4 text-danger-red" />
              </div>
              <div className="text-2xl font-black text-danger-red">
                {summaryStats.activeRedZonesCount} High-Risk Zones
              </div>
              <div className="text-[11px] font-bold text-ink">
                +{summaryStats.elevatedZonesCount} Elevated ·{" "}
                {summaryStats.safeZonesCount} Verified Safe Corridors
              </div>
            </div>

            <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                <span>Live City Safety & Lighting</span>
                <Sun className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-2xl font-black text-ink">
                {summaryStats.citySafetyIndex}
                <span className="text-sm font-bold text-ink-muted">/100</span>
              </div>
              <div className="text-[11px] font-semibold text-ink-muted">
                Avg Light:{" "}
                <strong className="text-ink">
                  {summaryStats.avgLightingScore}%
                </strong>{" "}
                · Crowd:{" "}
                <strong className="text-ink">
                  {summaryStats.avgFootfallScore}%
                </strong>{" "}
                · CCTV:{" "}
                <strong className="text-ink">
                  {summaryStats.avgCctvScore}%
                </strong>
              </div>
            </div>

            <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-1">
              <div className="flex items-center justify-between text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                <span>Live Pink PCR & Patrol GPS</span>
                <ShieldCheck className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-2xl font-black text-ink">
                {summaryStats.activePatrolUnitsCount} Active Units
              </div>
              <div className="text-[11px] font-semibold text-brand-pink">
                2 Red-Zone Interceptors · Avg ETA 2–4 min
              </div>
            </div>
          </div>

          {/* Dashboard Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-rose">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  {
                    id: "places-dashboard",
                    label: `New Delhi Areas Dashboard (${placesTelemetry.length})`,
                  },
                  {
                    id: "live-map-split",
                    label: "Map + Area List View",
                  },
                  {
                    id: "sse-dispatches",
                    label: `Safety Warnings (${alerts.length})`,
                  },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setDashboardTab(tab.id)}
                  className={`px-4 py-2 rounded-full text-xs font-extrabold border transition-all ${
                    dashboardTab === tab.id
                      ? "bg-brand-pink text-surface-white border-brand-pink shadow-sm"
                      : "bg-surface-white text-ink border-border-rose hover:bg-blush-deep"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Filter & Search Bar for Places */}
            {dashboardTab !== "sse-dispatches" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="bg-blush-light rounded-full px-3 py-1.5 flex items-center gap-1.5 border border-border-rose">
                  <Search className="w-3.5 h-3.5 text-brand-pink" />
                  <input
                    type="text"
                    value={placeSearch}
                    onChange={(e) => setPlaceSearch(e.target.value)}
                    placeholder="Filter place or district..."
                    className="bg-transparent text-xs font-bold text-ink placeholder:text-ink-muted outline-none w-40"
                  />
                </div>

                {(
                  [
                    { id: "ALL", label: "All Places" },
                    { id: "RED_ZONES", label: "Red Zones" },
                    { id: "ELEVATED", label: "Elevated" },
                    { id: "SAFE", label: "Safe Corridors" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPlaceRiskFilter(f.id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all ${
                      placeRiskFilter === f.id
                        ? f.id === "RED_ZONES"
                          ? "bg-danger-red text-surface-white border-danger-red"
                          : "bg-ink text-surface-white border-ink"
                        : "bg-surface-white text-ink border-border-rose hover:bg-blush-light"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Toast Notification Banner */}
        {liveToast && (
          <div
            role="alert"
            className="vira-card p-4 border-2 border-brand-pink bg-blush-deep flex flex-wrap items-center justify-between gap-4"
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-brand-pink">
                <Bell className="w-4 h-4" />
                <span>New Live Advisory Received via SSE Stream</span>
              </div>
              <div className="text-sm font-extrabold text-ink">
                {liveToast.title}
              </div>
              <p className="text-xs text-ink">{liveToast.description}</p>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="vira-btn-secondary px-3 py-1.5 text-xs font-bold"
            >
              Acknowledge
            </button>
          </div>
        )}

        {/* TAB 1: REAL-TIME PLACES TELEMETRY DASHBOARD (LIVE NEW DELHI MAP + CARDS + TABLE + LIVE PATROL BOARD) */}
        <AnimatePresence mode="wait">
          {dashboardTab === "places-dashboard" && (
            <motion.div
              key="places-dashboard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Always-Visible Live Map of New Delhi Synchronized with Real-Time Places Dashboard */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-brand-pink" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-brand-pink">
                      Live Interactive Map of New Delhi · Red Zones, Safe Havens
                      & Safest Route
                    </span>
                  </div>
                  <span className="text-xs font-bold text-ink-muted">
                    Click any place card below or any pin on the New Delhi map
                    to inspect live telemetry
                  </span>
                </div>
                <SafetyMapCanvas
                  zones={liveZones}
                  safeHavens={safeHavens}
                  selectedSlug={focusedPlaceSlug}
                  onSelectZone={(z) => {
                    setFocusedPlaceSlug(z.slug);
                    setSelectedAreaSlug(z.slug);
                  }}
                  showSafeHavens={true}
                  activeHourLabel={hourLabel}
                />
              </div>

              {/* Real-Time Places Telemetry Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {filteredPlaces.map((place) => (
                  <div
                    key={place.slug}
                    className={`vira-card p-4 flex flex-col justify-between space-y-3.5 transition-all ${
                      place.isRedZone
                        ? "border-2 border-danger-red bg-surface-white"
                        : "border border-border-rose bg-surface-white"
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Top Status & Heartbeat */}
                      <div className="flex items-center justify-between gap-2">
                        <RiskBadge
                          level={place.riskLevel}
                          score={place.riskScore}
                          compact
                        />
                        <span className="text-[10px] font-extrabold text-ink-muted flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              place.isRedZone
                                ? "bg-danger-red animate-ping"
                                : "bg-brand-pink"
                            }`}
                          />
                          <span>{place.sensorHeartbeatMs}ms live</span>
                        </span>
                      </div>

                      {/* Place Title & District */}
                      <div>
                        <h2 className="text-sm font-extrabold text-ink leading-snug">
                          {place.name}
                        </h2>
                        <p className="text-[11px] font-semibold text-ink-muted">
                          {place.corridorName} · {place.district}
                        </p>
                      </div>

                      {/* 3 Real-Time Sensor Telemetry Bars: Lighting, Crowd, CCTV */}
                      <div className="p-3 rounded-card bg-blush-light border border-border-rose space-y-2">
                        {/* Street Lighting */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1 text-ink">
                              <Sun className="w-3 h-3 text-brand-pink" />
                              <span>Street Lighting</span>
                            </span>
                            <span className="font-extrabold text-ink">
                              {place.lightingScore}/100 ({place.lightingLux} lx)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-blush-deep overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                place.lightingScore < 45
                                  ? "bg-danger-red"
                                  : "bg-brand-pink"
                              }`}
                              style={{ width: `${place.lightingScore}%` }}
                            />
                          </div>
                        </div>

                        {/* Live Crowd Footfall */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1 text-ink">
                              <Users className="w-3 h-3 text-brand-pink" />
                              <span>Crowd Footfall</span>
                            </span>
                            <span className="font-extrabold text-ink">
                              {place.footfallScore}/100 (~
                              {place.estimatedPedestriansPerMin}/min)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-blush-deep overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                place.footfallScore < 40
                                  ? "bg-danger-red"
                                  : "bg-brand-pink"
                              }`}
                              style={{ width: `${place.footfallScore}%` }}
                            />
                          </div>
                        </div>

                        {/* CCTV Coverage */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="flex items-center gap-1 text-ink">
                              <Video className="w-3 h-3 text-brand-pink" />
                              <span>Active CCTV Grid</span>
                            </span>
                            <span className="font-extrabold text-ink">
                              {place.cctvCoverage}% ({place.activeCamerasCount}{" "}
                              cams)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-blush-deep overflow-hidden">
                            <div
                              className="h-full rounded-full bg-ink transition-all duration-500"
                              style={{ width: `${place.cctvCoverage}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Why Risk Is Elevated / Safe */}
                      <div className="p-2.5 rounded-btn bg-blush-deep border border-border-rose text-[11px] text-ink leading-snug">
                        <strong
                          className={`uppercase text-[10px] block mb-0.5 ${
                            place.isRedZone
                              ? "text-danger-red"
                              : "text-brand-pink"
                          }`}
                        >
                          {place.isRedZone
                            ? "⚠ Why Flagged as Red Zone:"
                            : "✓ Live Telemetry Assessment:"}
                        </strong>
                        {place.headlineReason}
                      </div>

                      {/* 9 Safety Parameters Summary for Each Place */}
                      {place.safetyParams && (
                        <div className="grid grid-cols-1 gap-1 rounded-xl bg-blush-light/60 border border-border-rose p-2.5 text-[11px]">
                          <div className="font-extrabold uppercase text-[10px] text-brand-pink mb-0.5">
                            9 Safety Parameters:
                          </div>
                          <div>
                            <strong className="text-ink">1. Pre-harassment:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.preHarassmentHistory.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">2. Lighting:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.lighting.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">3. Security:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.security.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">4. Footfall:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.footfall.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">5. Stalking:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.stalking.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">6. Suspicious activity:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.suspiciousActivity.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">7. Area density:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.areaDensity.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">8. CCTV present:</strong>{" "}
                            <span className="text-ink-muted">{place.safetyParams.cctvPresent.status}</span>
                          </div>
                          <div>
                            <strong className="text-ink">9. Nearest police:</strong>{" "}
                            <span className="text-brand-pink font-bold">
                              {place.safetyParams.nearestPoliceStation.name} ({place.safetyParams.nearestPoliceStation.distanceText})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Patrol & Safe Haven Metadata */}
                      <div className="text-[11px] space-y-1 pt-1">
                        <div className="font-bold text-ink flex items-center justify-between">
                          <span>Patrol:</span>
                          <span className="text-brand-pink font-extrabold">
                            {place.patrolStatus}
                          </span>
                        </div>
                        <div className="font-semibold text-ink-muted flex items-center justify-between">
                          <span>24x7 Haven:</span>
                          <span className="text-ink font-bold truncate max-w-[165px]">
                            {place.nearestSafeHavenName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Action Footer */}
                    <div className="pt-2.5 border-t border-border-rose flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFocusedPlaceSlug(place.slug);
                          setSelectedAreaSlug(place.slug);
                          setDashboardTab("live-map-split");
                        }}
                        className="vira-btn-secondary flex-1 py-1.5 px-2.5 text-[11px] font-extrabold flex items-center justify-center gap-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-brand-pink" />
                        <span>View on Map</span>
                      </button>

                      <Link
                        href={`/planner?dest=${encodeURIComponent(place.name)}`}
                        className="vira-btn-primary flex-1 py-1.5 px-2.5 text-[11px] font-extrabold flex items-center justify-center gap-1"
                      >
                        <Route className="w-3.5 h-3.5" />
                        <span>Safe Route</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Two-Column Section: Live Places Telemetry Matrix Table + Active Pink PCR GPS Units + Recent SSE Feed */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 7 Columns: Real-Time Places Telemetry Matrix Table */}
                <div className="lg:col-span-7 vira-card p-5 space-y-3.5 overflow-x-auto">
                  <div className="flex items-center justify-between border-b border-border-rose pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                        Live Places Sensor Matrix ({lastUpdatedDisplay})
                      </span>
                      <h3 className="text-base font-extrabold text-ink">
                        All Monitored Places Real-Time Comparison Table
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-blush-deep text-[11px] font-extrabold text-brand-pink">
                      Updated Every 4s
                    </span>
                  </div>

                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-border-rose text-[10px] font-extrabold uppercase tracking-wider text-ink-muted">
                        <th className="py-2 pr-2">Place / Corridor</th>
                        <th className="py-2 px-2">Status</th>
                        <th className="py-2 px-2">Light</th>
                        <th className="py-2 px-2">Crowd</th>
                        <th className="py-2 px-2">CCTV</th>
                        <th className="py-2 pl-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-rose">
                      {placesTelemetry.map((p) => (
                        <tr
                          key={p.slug}
                          className="hover:bg-blush-light transition-colors"
                        >
                          <td className="py-2.5 pr-2">
                            <div className="font-extrabold text-ink">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-ink-muted">
                              {p.district} · Help {p.nearestPoliceDistM}m
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <RiskBadge
                              level={p.riskLevel}
                              score={p.riskScore}
                              compact
                            />
                          </td>
                          <td className="py-2.5 px-2 font-bold text-ink">
                            {p.lightingScore}%
                          </td>
                          <td className="py-2.5 px-2 font-bold text-ink">
                            {p.footfallScore}%
                          </td>
                          <td className="py-2.5 px-2 font-bold text-ink">
                            {p.cctvCoverage}%
                          </td>
                          <td className="py-2.5 pl-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedPlaceSlug(p.slug);
                                setSelectedAreaSlug(p.slug);
                                setDashboardTab("live-map-split");
                              }}
                              className="px-2.5 py-1 rounded-full bg-blush-deep text-brand-pink font-extrabold text-[11px] hover:bg-brand-pink hover:text-surface-white transition-colors"
                            >
                              Locate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Right 5 Columns: Live Moving Pink PCR GPS Units + Latest Live Dispatches */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="vira-card p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-border-rose pb-2.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                          Live Responder GPS Feed
                        </span>
                        <h3 className="text-base font-extrabold text-ink">
                          Active Pink PCR & Patrol Units ({patrolUnits.length})
                        </h3>
                      </div>
                      <ShieldCheck className="w-5 h-5 text-brand-pink" />
                    </div>

                    <div className="space-y-2.5">
                      {patrolUnits.map((unit) => (
                        <div
                          key={unit.id}
                          className="p-3 rounded-card bg-blush-light border border-border-rose flex items-center justify-between gap-3"
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black text-surface-white ${
                                  unit.status === "DISPATCHED_RED_ZONE"
                                    ? "bg-danger-red"
                                    : "bg-brand-pink"
                                }`}
                              >
                                {unit.unitCode}
                              </span>
                              <span className="text-xs font-extrabold text-ink truncate">
                                {unit.assignedCorridor}
                              </span>
                            </div>
                            <div className="text-[11px] text-ink-muted">
                              {unit.headingText} · Speed{" "}
                              <strong className="text-ink">
                                {unit.speedKmh} km/h
                              </strong>{" "}
                              · ETA{" "}
                              <strong className="text-brand-pink">
                                {unit.etaMinutes} min
                              </strong>
                            </div>
                          </div>

                          <a
                            href="tel:112"
                            className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose text-[11px] font-extrabold text-ink hover:border-brand-pink shrink-0 flex items-center gap-1"
                          >
                            <PhoneCall className="w-3 h-3 text-brand-pink" />
                            <span>112</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compact Live SSE Alert Stream Preview */}
                  <div className="vira-card p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-border-rose pb-2.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                          Instant SSE Alert Feed
                        </span>
                        <h3 className="text-base font-extrabold text-ink">
                          Latest Corridor Bulletins
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDashboardTab("sse-dispatches")}
                        className="text-xs font-extrabold text-brand-pink hover:underline"
                      >
                        View All ({alerts.length}) →
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {alerts.slice(0, 3).map((al) => (
                        <div
                          key={al.id}
                          className="p-3 rounded-card bg-blush-light border border-border-rose space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <RiskBadge level={al.riskLevel} compact />
                            <span className="text-[10px] font-bold text-ink-muted">
                              Until {al.activeUntil}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold text-ink">
                            {al.title}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {al.placeName}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: INTERACTIVE LIVE PLACES + MAP COMMAND SPLIT VIEW */}
          {dashboardTab === "live-map-split" && (
            <motion.div
              key="live-map-split"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start"
            >
              {/* Left 7 Columns: Live Interactive Map Connected to /api/map/realtime */}
              <div className="lg:col-span-7">
                <SafetyMapCanvas
                  zones={liveZones}
                  safeHavens={safeHavens}
                  selectedSlug={focusedPlaceSlug}
                  onSelectZone={(z) => {
                    setFocusedPlaceSlug(z.slug);
                    setSelectedAreaSlug(z.slug);
                  }}
                  showSafeHavens={true}
                  activeHourLabel={hourLabel}
                  heightClass="h-[620px]"
                />
              </div>

              {/* Right 5 Columns: Clickable Real-Time Places Telemetry List */}
              <div className="lg:col-span-5 vira-card p-5 space-y-3.5 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-border-rose pb-2.5">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                      Synchronized with Live Map
                    </span>
                    <h3 className="text-base font-extrabold text-ink">
                      Click Any Place to Inspect Red Zone & Safe Route
                    </h3>
                  </div>
                  <Navigation className="w-4 h-4 text-brand-pink" />
                </div>

                <div className="space-y-2.5">
                  {filteredPlaces.map((p) => {
                    const active = p.slug === focusedPlaceSlug;
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        onClick={() => {
                          setFocusedPlaceSlug(p.slug);
                          setSelectedAreaSlug(p.slug);
                        }}
                        className={`w-full text-left p-3.5 rounded-card border transition-all space-y-2 ${
                          active
                            ? "bg-blush-deep border-2 border-brand-pink shadow-sm"
                            : "bg-blush-light border-border-rose hover:border-brand-pink"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-ink">
                            {p.name}
                          </span>
                          <RiskBadge
                            level={p.riskLevel}
                            score={p.riskScore}
                            compact
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-ink">
                          <div className="px-2 py-1 rounded bg-surface-white border border-border-rose">
                            Light: {p.lightingScore}%
                          </div>
                          <div className="px-2 py-1 rounded bg-surface-white border border-border-rose">
                            Crowd: {p.footfallScore}%
                          </div>
                          <div className="px-2 py-1 rounded bg-surface-white border border-border-rose">
                            CCTV: {p.cctvCoverage}%
                          </div>
                        </div>
                        <p className="text-[11px] text-ink-muted leading-snug">
                          {p.headlineReason}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: LIVE SSE SAFETY BULLETINS & DISPATCHES */}
          {dashboardTab === "sse-dispatches" && (
            <motion.div
              key="sse-dispatches"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Audience Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: "ALL", label: "All Corridor Dispatches" },
                    { id: "POLICE", label: "Police & Pink PCR" },
                    { id: "MUNICIPAL", label: "Municipal Lighting & Civic" },
                    { id: "UNIVERSITY", label: "University & Campus" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAudienceFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                      audienceFilter === tab.id
                        ? "bg-brand-pink text-surface-white border-brand-pink"
                        : "bg-surface-white text-ink border-border-rose hover:bg-blush-deep"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                <div className="lg:col-span-8 space-y-4">
                  {alerts.map((al) => (
                    <div
                      key={al.id}
                      className={`vira-card p-5 space-y-3 ${
                        al.riskLevel === "HIGH" ||
                        al.riskLevel === "ACTIVE_INCIDENT"
                          ? "border-2 border-danger-red"
                          : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <RiskBadge level={al.riskLevel} compact />
                          <span className="px-2.5 py-0.5 rounded-full bg-blush-light text-xs font-bold text-ink border border-border-rose">
                            Source: {al.source.replace("_", " ")}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-blush-deep text-xs font-bold text-brand-pink border border-border-rose">
                            {al.targetAudience}
                          </span>
                        </div>

                        <span className="text-xs font-semibold text-ink-muted flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-brand-pink" />
                          Active until {al.activeUntil}
                        </span>
                      </div>

                      <h2 className="text-lg font-extrabold text-ink">
                        {al.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-ink leading-relaxed">
                        {al.description}
                      </p>

                      <div className="p-3 rounded-card bg-blush-light border border-border-rose text-xs">
                        <strong className="text-brand-pink uppercase mr-1.5">
                          Why Risk Changed:
                        </strong>
                        <span className="text-ink font-medium">
                          {al.whyReason}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-ink flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-brand-pink" />
                          Corridor: {al.placeName}
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedPlaceSlug(al.areaSlug);
                              setDashboardTab("live-map-split");
                            }}
                            className="vira-btn-secondary px-3 py-1.5 text-xs font-bold"
                          >
                            Locate on Live Map
                          </button>
                          <Link
                            href={`/planner?dest=${encodeURIComponent(
                              al.placeName
                            )}`}
                            className="vira-btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                          >
                            <Route className="w-3.5 h-3.5" />
                            <span>Plan Safe Bypass</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right 4 Columns: Quick Summary + Consult Vira AI */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="vira-card p-5 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-border-rose pb-2.5">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                          Live Places Snapshot
                        </span>
                        <h3 className="text-base font-extrabold text-ink">
                          Real-Time Places Summary
                        </h3>
                      </div>
                      <Layers className="w-5 h-5 text-brand-pink" />
                    </div>

                    <div className="space-y-2">
                      {placesTelemetry.slice(0, 5).map((item) => (
                        <div
                          key={item.slug}
                          className="p-3 rounded-card bg-blush-light border border-border-rose space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-ink truncate">
                              {item.name}
                            </span>
                            <RiskBadge
                              level={item.riskLevel}
                              score={item.riskScore}
                              compact
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                            <span>Light: {item.lightingScore}%</span>
                            <span>Crowd: {item.footfallScore}%</span>
                            <span className="font-extrabold text-brand-pink">
                              Safe {item.safetyScore}/100
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/explore"
                      onClick={() => {
                        setExternalChatPrompt(
                          "Summarize tonight's real-time place telemetry and tell me which Red Zones to avoid after 10 PM."
                        );
                        setPortalViewMode("split");
                      }}
                      className="vira-btn-primary w-full py-2.5 px-4 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Consult Vira AI on Live Telemetry</span>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppShell>
  );
}
