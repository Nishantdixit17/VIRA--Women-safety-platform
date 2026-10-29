"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Navigation,
  ShieldCheck,
  Clock,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Route,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { useSafetyStore } from "@/store/useSafetyStore";
import { useTrustedContacts } from "@/lib/hooks/useTrustedContacts";
import { useLocationStore } from "@/store/useLocationStore";
import {
  haversineM,
  nearestOnPolyline,
  polylineLengthM,
  type LatLng,
} from "@/lib/location/geo";
import { INDIAN_PLACES_DIRECTORY } from "@/lib/engine/places-geocoder";
import type { SosMarker } from "@/components/map/LiveTripMap";

const LiveTripMap = dynamic(() => import("@/components/map/LiveTripMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] rounded-2xl bg-blush-deep border border-border-rose flex items-center justify-center text-sm font-bold text-ink-muted">
      Loading live map...
    </div>
  ),
});
import type { ScoredRouteOption } from "@/lib/engine/route-planner";

interface Checkpoint {
  percent: number;
  placeName: string;
  status: string;
}

/** Builds checkpoints from the route chosen in Safe Route (start, each road, destination). */
function buildCheckpoints(
  start: string,
  dest: string,
  route: ScoredRouteOption | null
): Checkpoint[] {
  const legs = route?.legs ?? [];
  const points: Checkpoint[] = [
    {
      percent: 0,
      placeName: start,
      status: "Start of your trip",
    },
  ];
  const total = legs.reduce((sum, l) => sum + l.durationMinutes, 0) || 1;
  let acc = 0;
  legs.forEach((leg, i) => {
    acc += leg.durationMinutes;
    if (i === legs.length - 1) return;
    points.push({
      percent: Math.round((acc / total) * 100),
      placeName: leg.corridorName,
      status: `${leg.safetyScore}/100 safety · ${leg.plainReason}`,
    });
  });
  points.push({
    percent: 100,
    placeName: dest,
    status: "Safe arrival · sharing with family stops automatically",
  });
  return points.slice(0, 5);
}
export default function LiveJourneyPage() {
  const {
    activeJourney,
    setCurrentPlaceName,
    updateJourneyProgress,
    setCheckInTimer,
    tickCheckInTimer,
    triggerDeviationPrompt,
    resolveDeviationSafe,
    endMonitoredJourney,
    startSosCountdown,
    triggerImmediateFullSos,
  } = useSafetyStore();

  const { contacts: trustedContacts } = useTrustedContacts();

  // ---- Live GPS tracking ----
  const loc = useLocationStore();
  const routePts = useMemo<LatLng[]>(
    () => (activeJourney.selectedRoute?.geometry as LatLng[]) || [],
    [activeJourney.selectedRoute]
  );
  const [sosMarkers, setSosMarkers] = useState<SosMarker[]>([]);
  const offRouteCount = useRef(0);
  const lastPercent = useRef(-1);

  useEffect(() => {
    loc.start();
    return () => loc.stopSimulation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tracking = useMemo(() => {
    if (!loc.fix || routePts.length < 2) return null;
    const here: LatLng = [loc.fix.lat, loc.fix.lng];
    const total = polylineLengthM(routePts);
    const near = nearestOnPolyline(here, routePts);
    const percent = Math.max(0, Math.min(100, Math.round((near.alongM / (total || 1)) * 100)));
    const dest = routePts[routePts.length - 1];
    const toDestM = haversineM(here, dest);
    const leftM = Math.max(total - near.alongM, 0) + near.distanceM;
    const modeSpeed =
      activeJourney.selectedRoute && activeJourney.selectedRoute.durationMinutes > 0
        ? (total / 1000) / (activeJourney.selectedRoute.durationMinutes / 60)
        : 5;
    const kmh = Math.max(loc.fix.speed ? loc.fix.speed * 3.6 : 0, 0);
    const useKmh = kmh >= 2 ? kmh : modeSpeed || 5;
    const etaMin = Math.max(1, Math.round(leftM / 1000 / useKmh * 60));
    let nearestPlace = "";
    let nearestD = Infinity;
    for (const p of INDIAN_PLACES_DIRECTORY) {
      const d = haversineM(here, [p.lat, p.lng]);
      if (d < nearestD) {
        nearestD = d;
        nearestPlace = p.shortName;
      }
    }
    const legs = activeJourney.selectedRoute?.legs ?? [];
    let acc = 0;
    const totalLegMin = legs.reduce((s, l) => s + l.durationMinutes, 0) || 1;
    let leg = legs[0];
    for (const l of legs) {
      acc += l.durationMinutes;
      leg = l;
      if ((acc / totalLegMin) * 100 >= percent) break;
    }
    const stops = activeJourney.selectedRoute?.safeStops ?? [];
    let help: { name: string; d: number } | null = null;
    for (const s of stops) {
      const d = haversineM(here, [s.lat, s.lng]);
      if (!help || d < help.d) help = { name: s.name, d };
    }
    return {
      percent,
      offRouteM: Math.round(near.distanceM),
      leftKm: leftM / 1000,
      etaMin,
      kmh: Math.round(kmh),
      toDestM,
      nearestPlace,
      leg,
      help,
    };
  }, [loc.fix, routePts, activeJourney.selectedRoute]);

  // Push live progress + detect leaving the planned route
  useEffect(() => {
    if (!tracking || !loc.fix) return;
    if (Math.abs(tracking.percent - lastPercent.current) >= 1) {
      lastPercent.current = tracking.percent;
      updateJourneyProgress(tracking.percent, tracking.nearestPlace);
      setCurrentPlaceName(tracking.nearestPlace);
    }
    if (tracking.offRouteM > 200 && loc.fix.accuracy < 80) {
      offRouteCount.current += 1;
      if (offRouteCount.current >= 3 && !activeJourney.deviationPromptActive) {
        offRouteCount.current = 0;
        triggerDeviationPrompt();
      }
    } else {
      offRouteCount.current = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking?.percent, tracking?.offRouteM, loc.fix?.timestamp]);

  // Show SOS trigger points on the map
  useEffect(() => {
    let active = true;
    const load = () =>
      fetch("/api/sos")
        .then((r) => r.json())
        .then((d) => {
          if (!active || !Array.isArray(d.events)) return;
          setSosMarkers(
            d.events
              .filter((e: { lat?: number; lng?: number }) => e.lat !== undefined && e.lng !== undefined)
              .map((e: { id: string; lat: number; lng: number; placeName: string; sirenActive?: boolean }) => ({
                id: e.id,
                lat: e.lat,
                lng: e.lng,
                label: `SOS ${e.id} · ${e.placeName}`,
                active: Boolean(e.sirenActive),
              }))
          );
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);
  const checkpoints = buildCheckpoints(
    activeJourney.startPlaceName,
    activeJourney.destPlaceName,
    activeJourney.selectedRoute
  );
  const routeScore = activeJourney.selectedRoute?.safetyScore ?? 90;
  const routeLevel = activeJourney.selectedRoute?.riskLevel ?? "LOW";
  const sharingWith = trustedContacts.filter((c) => c.currentlySharing);
  const [deviationEscalationSeconds, setDeviationEscalationSeconds] =
    useState(10);
  const [statusToast, setStatusToast] = useState("");

  // 1. Safe-Arrival Check-In Timer Countdown
  useEffect(() => {
    if (!activeJourney.isMonitoring) return;
    const timer = setInterval(() => {
      tickCheckInTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [activeJourney.isMonitoring, tickCheckInTimer]);

  // 2. 10-Second Auto-Escalation when Route Deviation Prompt is Active
  useEffect(() => {
    if (!activeJourney.deviationPromptActive) {
      setDeviationEscalationSeconds(10);
      return;
    }

    const timer = setInterval(() => {
      setDeviationEscalationSeconds((prev) => {
        if (prev <= 1) {
          resolveDeviationSafe();
          triggerImmediateFullSos(
            "Unacknowledged Route Deviation (10s Auto-Escalation)",
            false
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    activeJourney.deviationPromptActive,
    resolveDeviationSafe,
    triggerImmediateFullSos,
  ]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleConfirmSafeCheckin = async () => {
    setCheckInTimer(15);
    setStatusToast(
      "Check-in confirmed safe. Event written to SHA-256 Evidence Vault."
    );
    await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "SAFE_CHECKIN",
        placeName: activeJourney.currentPlaceName,
        summary: `Manual safe check-in confirmed at ${activeJourney.currentPlaceName}. Timer reset to 15 minutes.`,
        details: { progressPercent: activeJourney.progressPercent },
      }),
    }).catch(() => {});
  };

  const handleSimulateDeviation = async () => {
    triggerDeviationPrompt();
    await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "ROUTE_DEVIATION",
        placeName: `Off-route near ${activeJourney.currentPlaceName}`,
        summary:
          `Unexpected 190m route deviation detected off the planned ${activeJourney.startPlaceName} to ${activeJourney.destPlaceName} route; 10-second verification prompt initiated.`,
        details: { deviationMeters: 190, autoEscalationSeconds: 10 },
      }),
    }).catch(() => {});
  };

  const handleCompleteSafeArrival = async () => {
    endMonitoredJourney();
    setCurrentPlaceName(activeJourney.destPlaceName);
    setStatusToast(
      "Safe arrival confirmed! Temporary Trusted Circle location sharing has automatically ended."
    );
    await fetch("/api/circle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endAllSharingOnArrival: true,
        placeName: activeJourney.destPlaceName,
      }),
    }).catch(() => {});
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Route Deviation Alert Modal / Banner ("Your route changed. Are you okay?" with 10s auto-escalation) */}
        {activeJourney.deviationPromptActive && (
          <div
            role="alertdialog"
            aria-labelledby="deviation-heading"
            className="vira-card p-6 border-2 border-danger-red bg-blush-deep space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-danger-red text-surface-white flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-danger-red">
                    Route Deviation Detected · Auto-Escalating in{" "}
                    {deviationEscalationSeconds}s
                  </span>
                  <h2
                    id="deviation-heading"
                    className="text-xl sm:text-2xl font-extrabold text-ink"
                  >
                    Your route changed. Are you okay?
                  </h2>
                </div>
              </div>
              <span className="px-3 py-1.5 rounded-btn bg-surface-white border border-danger-red text-sm font-extrabold text-danger-red">
                {deviationEscalationSeconds}s remaining
              </span>
            </div>

            <p className="text-xs sm:text-sm text-ink">
              We detected a 190m turn off your planned safe corridor near{" "}
              <strong>{activeJourney.currentPlaceName}</strong>. If you
              do not respond within {deviationEscalationSeconds} seconds, Vira
              will automatically notify your Trusted Circle and escalate to SOS.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  resolveDeviationSafe();
                  setStatusToast(
                    "Route deviation verified safe. Continuing monitored journey."
                  );
                }}
                className="vira-btn-secondary py-3 px-5 text-sm font-bold border-2 border-ink flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-brand-pink" />
                <span>Yes, I Am Safe (Re-calculate Safe Route)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resolveDeviationSafe();
                  triggerImmediateFullSos(
                    "Route Deviation Escalated by Commuter",
                    false
                  );
                }}
                className="vira-btn-danger py-3 px-5 text-sm font-bold flex items-center gap-2"
              >
                <SirenIcon size={18} active variant="on-red" />
                <span>No — Trigger Emergency SOS Now</span>
              </button>
            </div>
          </div>
        )}

        {statusToast && (
          <div
            role="status"
            className="p-3.5 rounded-card bg-blush-deep border border-brand-pink text-xs sm:text-sm font-bold text-ink flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
              {statusToast}
            </span>
            <button
              type="button"
              onClick={() => setStatusToast("")}
              className="text-xs text-ink-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Live Journey Monitor Header Card */}
        <div className="vira-card p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-rose pb-5">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Live Monitored Journey · Consent-First Protection
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                {activeJourney.startPlaceName} to {activeJourney.destPlaceName}
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted">
                Active Corridor:{" "}
                <strong className="text-ink">
                  {activeJourney.currentPlaceName}
                </strong>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <RiskBadge level={routeLevel} score={routeScore} />
              <button
                type="button"
                onClick={() =>
                  startSosCountdown("Live Journey SOS Activated", false)
                }
                className="vira-btn-danger group px-4 py-2.5 text-sm font-bold flex items-center gap-2"
              >
                <SirenIcon size={20} variant="on-red" />
                <span>SOS Emergency</span>
              </button>
            </div>
          </div>

          {/* Journey Progress Slider & Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-ink flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-brand-pink" />
                Journey Progress ({activeJourney.progressPercent}%)
              </span>
              <span className="text-brand-pink">
                {activeJourney.isMonitoring
                  ? "Live Telemetry Active (Place Names Only)"
                  : "Journey Completed Safely"}
              </span>
            </div>

            <div className="w-full h-3 rounded-full bg-blush-deep border border-border-rose overflow-hidden">
              <div
                style={{ width: `${activeJourney.progressPercent}%` }}
                className="h-full bg-brand-pink transition-all duration-300"
              />
            </div>

            {/* Checkpoint Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
              {checkpoints.map((cp) => {
                const reached = activeJourney.progressPercent >= cp.percent;
                return (
                  <button
                    key={cp.placeName}
                    type="button"
                    onClick={() => {
                      updateJourneyProgress(cp.percent, cp.placeName);
                      setCurrentPlaceName(cp.placeName);
                      if (cp.percent === 100) {
                        handleCompleteSafeArrival();
                      }
                    }}
                    className={`p-3 rounded-card text-left border transition-colors space-y-1 ${
                      reached
                        ? "bg-blush-deep border-brand-pink"
                        : "bg-blush-light border-border-rose"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-brand-pink">{cp.percent}%</span>
                      <span className="text-ink-muted">
                        {reached ? "Reached" : "Upcoming"}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-ink line-clamp-1">
                      {cp.placeName}
                    </div>
                    <div className="text-[11px] text-ink-muted line-clamp-2">
                      {cp.status}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live tracking map + insights */}
        <div className="vira-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Live Location
              </span>
              <h2 className="text-lg font-extrabold text-ink">
                {activeJourney.startPlaceName} to {activeJourney.destPlaceName}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {loc.fix ? (
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blush-deep border border-brand-pink text-ink">
                  GPS ±{Math.round(loc.fix.accuracy)} m
                  {loc.fix.simulated ? " (demo)" : ""}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={loc.start}
                  className="vira-btn-primary px-4 py-2 text-xs font-bold"
                >
                  {loc.status === "denied" ? "Location blocked" : "Turn On My Location"}
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  loc.simTimer ? loc.stopSimulation() : loc.startSimulation(routePts)
                }
                className="vira-btn-secondary px-3 py-2 text-xs font-bold"
              >
                {loc.simTimer ? "Stop Demo Walk" : "Try Demo Walk"}
              </button>
            </div>
          </div>

          {loc.status === "denied" && (
            <div className="p-3 rounded-xl border border-danger-red text-xs font-bold text-danger-red">
              {loc.errorMessage} You can still use the demo walk to see tracking.
            </div>
          )}

          {routePts.length > 1 ? (
            <LiveTripMap
              route={routePts}
              startLabel={activeJourney.startPlaceName}
              destLabel={activeJourney.destPlaceName}
              travelMode={"WALK"}
              fix={loc.fix}
              trail={loc.trail}
              sosMarkers={sosMarkers}
            />
          ) : (
            <div className="p-6 rounded-2xl bg-blush-light border border-border-rose text-sm text-ink-muted text-center">
              Plan a trip in Safe Routes first, then start the trip monitor.
            </div>
          )}

          {tracking && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { k: "Distance left", v: `${tracking.leftKm.toFixed(2)} km` },
                { k: "Arrive in", v: `${tracking.etaMin} min` },
                { k: "Speed", v: `${tracking.kmh} km/h` },
                { k: "Near", v: tracking.nearestPlace },
                {
                  k: "Road safety now",
                  v: tracking.leg ? `${tracking.leg.safetyScore}/100` : "-",
                },
                {
                  k: "Nearest help",
                  v: tracking.help
                    ? `${tracking.help.name} · ${Math.round(tracking.help.d)} m`
                    : "-",
                },
                {
                  k: "On your route",
                  v:
                    tracking.offRouteM <= 60
                      ? "Yes"
                      : `${tracking.offRouteM} m away`,
                },
                {
                  k: "Your position",
                  v: loc.fix
                    ? `${loc.fix.lat.toFixed(5)}, ${loc.fix.lng.toFixed(5)}`
                    : "-",
                },
              ].map((i) => (
                <div
                  key={i.k}
                  className="p-3 rounded-xl bg-blush-light border border-border-rose"
                >
                  <div className="text-[10px] font-bold uppercase text-ink-muted">
                    {i.k}
                  </div>
                  <div className="text-sm font-extrabold text-ink break-words">
                    {i.v}
                  </div>
                </div>
              ))}
            </div>
          )}
          {tracking && tracking.leg && (
            <p className="text-xs text-ink-muted">
              <strong className="text-ink">{tracking.leg.corridorName}:</strong>{" "}
              {tracking.leg.plainReason}
            </p>
          )}
          {tracking && tracking.toDestM < 40 && (
            <div className="p-3 rounded-xl bg-blush-deep border border-brand-pink text-xs font-bold text-ink">
              You have reached {activeJourney.destPlaceName}. Tap "Mark Safe
              Arrival" below to stop sharing.
            </div>
          )}
        </div>
        {/* 3 Operational Control Cards: Check-In Timer, Deviation Detector, Trusted Circle Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Safe-Arrival Check-In Timer */}
          <div className="vira-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-pink">
                  Safe-Arrival Check-In
                </span>
                <Clock className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-3xl font-extrabold text-ink">
                {formatCountdown(activeJourney.checkInRemainingSeconds)}
              </div>
              <p className="text-xs text-ink-muted">
                Next automated safety check-in. If missed, Vira prompts you
                before notifying your Trusted Circle.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirmSafeCheckin}
                className="vira-btn-primary w-full py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>I Am Safe — Check In Now</span>
              </button>
              <div className="grid grid-cols-3 gap-1.5">
                {[10, 15, 30].map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setCheckInTimer(min)}
                    className="vira-btn-secondary py-1.5 text-xs font-bold"
                  >
                    {min}m Timer
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 2: Route-Deviation Detection Control */}
          <div className="vira-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-pink">
                  AI Anomaly Watch
                </span>
                <Route className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-lg font-extrabold text-ink">
                Route-Deviation & Stoppage Guard
              </div>
              <p className="text-xs text-ink-muted">
                Monitors whether your cab, auto, or walk diverges from the
                chosen safe corridor into an unlit or elevated-risk lane.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleSimulateDeviation}
                className="vira-btn-secondary w-full py-2.5 px-4 text-xs sm:text-sm font-bold border-danger-red text-danger-red flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Simulate Route Deviation Prompt</span>
              </button>
              <button
                type="button"
                onClick={handleCompleteSafeArrival}
                className="vira-btn-secondary w-full py-2 text-xs font-bold"
              >
                Mark Safe Arrival at Destination
              </button>
            </div>
          </div>

          {/* Card 3: Trusted Circle & Evidence Vault Status */}
          <div className="vira-card p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-pink">
                  Consent & Vault Bridge
                </span>
                <Users className="w-4 h-4 text-brand-pink" />
              </div>
              <div className="text-lg font-extrabold text-ink">
                {activeJourney.trustedCircleShared && sharingWith.length > 0
                  ? `Sharing with ${sharingWith.map((c) => c.name).join(", ")}`
                  : activeJourney.trustedCircleShared
                  ? `${trustedContacts.length} trusted contact(s) saved · none sharing yet`
                  : "Sharing Paused (Ended on Arrival)"}
              </div>
              {trustedContacts.length > 0 && (
                <ul className="text-xs text-ink space-y-0.5">
                  {trustedContacts.map((c) => (
                    <li key={c.id} className="flex justify-between gap-2">
                      <span className="font-bold">{c.name} ({c.relationship})</span>
                      <span className="text-ink-muted">{c.phone}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-ink-muted">
                Family only sees the place name, route ({activeJourney.startPlaceName} to {activeJourney.destPlaceName}) and arrival time.
                Automatically revokes when you arrive.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/circle"
                className="vira-btn-secondary w-full py-2.5 px-4 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4 text-brand-pink" />
                <span>Manage Trusted Circle Consent</span>
              </Link>
              
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}


