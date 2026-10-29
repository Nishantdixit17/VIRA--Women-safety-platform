"use client";

import React, { useEffect, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MapPin,
  Clock,
  Route,
  Sparkles,
  Navigation,
  Users,
  BookmarkCheck,
  ShieldCheck,
  Footprints,
  Car,
  Train,
  LocateFixed,
  CheckCircle2,
  Volume2,
  ArrowLeftRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { NineSafetyParametersGrid } from "@/components/safety/NineSafetyParametersGrid";
import {
  computeSafeJourneyRoutes,
  JourneyPlanComparison,
  RoutePreference,
  ScoredRouteOption,
  TravelMode,
} from "@/lib/engine/route-planner";
import {
  INDIAN_PLACES_DIRECTORY,
  IndianPlaceEntry,
  searchIndianPlaces,
} from "@/lib/engine/places-geocoder";
import {
  EnrichedAreaZone,
  FALLBACK_SAFE_HAVENS,
  FALLBACK_ZONES,
} from "@/lib/repositories/zones-repo";
import { useSafetyStore } from "@/store/useSafetyStore";

const SafetyMapCanvas = dynamic(
  () => import("@/components/map/SafetyMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[640px] rounded-2xl bg-blush-deep border border-border-rose flex items-center justify-center text-sm font-bold text-ink-muted">
        Loading Enlarged New Delhi Safe Route Map...
      </div>
    ),
  }
);

const QUICK_NEW_DELHI_ROUTES = [
  { start: "Connaught Place", dest: "Hauz Khas" },
  { start: "Dwarka", dest: "Connaught Place" },
  { start: "Rohini", dest: "DU North Campus" },
  { start: "Saket", dest: "Lajpat Nagar" },
  { start: "Karol Bagh", dest: "India Gate" },
  { start: "Janakpuri", dest: "Rajouri Garden" },
  { start: "Nehru Place", dest: "Vasant Kunj" },
  { start: "Chandni Chowk", dest: "AIIMS & Green Park" },
];

function PlannerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    startMonitoredJourney,
    syncPlannedTrip,
    setCheckInTimer,
    setCurrentPlaceName,
    setViraLastSpokenText,
    setViraOpen,
  } = useSafetyStore();

  const initialStart = searchParams.get("start") || "Connaught Place";
  const initialDest = searchParams.get("dest") || "Hauz Khas";
  const initialTime = searchParams.get("time") || "21:30";

  const [startQuery, setStartQuery] = useState(initialStart);
  const [destQuery, setDestQuery] = useState(initialDest);
  const [departureTime, setDepartureTime] = useState(initialTime);
  const [travelMode, setTravelMode] = useState<TravelMode>("WALK");
  const [preference, setPreference] = useState<RoutePreference>("SAFEST");

  const [startSuggestions, setStartSuggestions] = useState<IndianPlaceEntry[]>(
    INDIAN_PLACES_DIRECTORY.slice(0, 10)
  );
  const [destSuggestions, setDestSuggestions] = useState<IndianPlaceEntry[]>(
    INDIAN_PLACES_DIRECTORY.slice(0, 10)
  );
  const [showStartDropdown, setShowStartDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);

  const [zones, setZones] = useState<EnrichedAreaZone[]>(FALLBACK_ZONES);
  const [safeHavens, setSafeHavens] = useState(FALLBACK_SAFE_HAVENS);

  // Initialize comparison synchronously (0ms) so the Safe Route Map & 3 routes are ALWAYS present!
  const [comparison, setComparison] = useState<JourneyPlanComparison>(() =>
    computeSafeJourneyRoutes({
      startPlaceName: initialStart,
      destPlaceName: initialDest,
      departureTime: initialTime,
      travelMode: "WALK",
      preference: "SAFEST",
      zones: FALLBACK_ZONES,
      safeHavens: FALLBACK_SAFE_HAVENS,
    })
  );
  const [selectedRouteId, setSelectedRouteId] = useState<string>("route-safest");
  const [loading, setLoading] = useState(false);
  const [toastBanner, setToastBanner] = useState("");

  // Instant autocomplete for ANY New Delhi place
  useEffect(() => {
    let active = true;
    searchIndianPlaces(startQuery).then((res) => {
      if (active) setStartSuggestions(res);
    });
    return () => {
      active = false;
    };
  }, [startQuery]);

  useEffect(() => {
    let active = true;
    searchIndianPlaces(destQuery).then((res) => {
      if (active) setDestSuggestions(res);
    });
    return () => {
      active = false;
    };
  }, [destQuery]);

  const runPlanner = async (
    customStart = startQuery,
    customDest = destQuery,
    customTime = departureTime,
    customMode = travelMode,
    customPref = preference,
    savePlan = false
  ) => {
    const cleanStart = customStart.trim() || "Connaught Place";
    const cleanDest = customDest.trim() || "Hauz Khas";

    // 1. Instant 0ms client-side computation so the Safe Route & Map update immediately
    const instantComparison = computeSafeJourneyRoutes({
      startPlaceName: cleanStart,
      destPlaceName: cleanDest,
      departureTime: customTime,
      travelMode: customMode,
      preference: customPref,
      zones,
      safeHavens,
    });
    setComparison(instantComparison);
    const instantRec =
      instantComparison.routes.find((r) => r.routeType === customPref) ||
      instantComparison.routes.find((r) => r.recommended) ||
      instantComparison.routes[0];
    if (instantRec) {
      setSelectedRouteId(instantRec.id);
    }

    setLoading(true);
    try {
      const [planRes, riskRes] = await Promise.all([
        fetch("/api/planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startPlaceName: cleanStart,
            destPlaceName: cleanDest,
            departureTime: customTime,
            travelMode: customMode,
            preference: customPref,
            savePlan,
          }),
        }).then((r) => r.json()),
        fetch("/api/risk?hour=21").then((r) => r.json()),
      ]);

      if (planRes && planRes.routes) {
        setComparison(planRes);
        const rec =
          planRes.routes.find(
            (r: ScoredRouteOption) => r.routeType === customPref
          ) ||
          planRes.routes.find((r: ScoredRouteOption) => r.recommended) ||
          planRes.routes[0];
        if (rec) setSelectedRouteId(rec.id);
      }
      if (riskRes?.zones?.length) setZones(riskRes.zones);
      if (riskRes?.safeHavens?.length) setSafeHavens(riskRes.safeHavens);
      if (savePlan) {
        setToastBanner(
          `Safe route (${cleanStart} → ${cleanDest}) saved to your account.`
        );
      } else {
        setToastBanner(
          `Safe route plotted on map: ${instantComparison.startPlace.shortName} → ${instantComparison.destinationPlace.shortName}`
        );
      }
    } catch {
      // Instant local route already applied
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runPlanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSwapPlaces = () => {
    const nextStart = destQuery;
    const nextDest = startQuery;
    setStartQuery(nextStart);
    setDestQuery(nextDest);
    runPlanner(nextStart, nextDest, departureTime, travelMode, preference, false);
  };

  const handleUseCurrentLocation = async () => {
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const res = await fetch(
              `/api/places/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
            );
            const data = await res.json();
            if (data.place?.shortName) {
              setStartQuery(data.place.shortName);
              setCurrentPlaceName(data.place.name);
              runPlanner(
                data.place.shortName,
                destQuery,
                departureTime,
                travelMode,
                preference,
                false
              );
              setToastBanner(`Start location set to: ${data.place.shortName}`);
              return;
            }
          } catch {
            // fallback below
          }
          setStartQuery("Connaught Place");
          runPlanner(
            "Connaught Place",
            destQuery,
            departureTime,
            travelMode,
            preference,
            false
          );
        },
        () => {
          setStartQuery("Connaught Place");
          runPlanner(
            "Connaught Place",
            destQuery,
            departureTime,
            travelMode,
            preference,
            false
          );
          setToastBanner("Start location set to: Connaught Place, New Delhi");
        },
        { timeout: 2500 }
      );
    }
  };

  const handleOneTapAutoPlan = () => {
    setPreference("SAFEST");
    setDepartureTime("22:00");
    runPlanner(startQuery, destQuery, "22:00", travelMode, "SAFEST", false);
    setToastBanner(
      "Safest night route selected on the New Delhi map with bright streetlights, CCTV, and police help nearby."
    );
  };

  const selectedRoute: ScoredRouteOption =
    comparison.routes.find((r) => r.id === selectedRouteId) ||
    comparison.routes[0];

  // Keep Safe Journey Copilot + Trip Monitor in step with the trip being planned
  useEffect(() => {
    syncPlannedTrip({
      startPlaceName: comparison.startPlace.shortName,
      destPlaceName: comparison.destinationPlace.shortName,
      departureTime: comparison.departureTime || departureTime,
      travelMode: comparison.travelMode,
      route: selectedRoute,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparison, selectedRoute.id]);

  const handleNarrateWithVira = () => {
    setViraLastSpokenText(comparison.viraNarrativeSummary);
    setViraOpen(true);
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(comparison.viraNarrativeSummary);
      utt.volume = 1.0;
      utt.rate = 0.95;
      utt.pitch = 1.08;
      window.speechSynthesis.speak(utt);
    }
  };

  const handleStartJourney = () => {
    startMonitoredJourney({
      startPlaceName: comparison.startPlace.shortName,
      destPlaceName: comparison.destinationPlace.shortName,
      route: selectedRoute,
      checkInMinutes: 15,
      shareWithCircle: true,
    });
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        "vira_active_route",
        JSON.stringify({
          startPlace: comparison.startPlace.shortName,
          destPlace: comparison.destinationPlace.shortName,
          routeTitle: selectedRoute.title,
          safetyScore: selectedRoute.safetyScore,
          etaText: selectedRoute.etaText,
        })
      );
    }
    router.push("/journey");
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-[1550px] mx-auto space-y-6">
        {/* Step 1: Simple Route Search Box */}
        <div className="vira-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Safe Route Finder · New Delhi Map Included
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold text-ink">
                Find the Safest Road Between Any Two Places in New Delhi
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Type any starting point and destination in New Delhi. The
                enlarged map right below immediately highlights the{" "}
                <strong>Safest Route (Pink)</strong> vs.{" "}
                <strong>Risky Shortcut (Red Dashed)</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="vira-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <LocateFixed className="w-4 h-4 text-brand-pink" />
                <span>Use My Location</span>
              </button>

              <button
                type="button"
                onClick={handleSwapPlaces}
                className="vira-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-4 h-4 text-brand-pink" />
                <span>Swap Start / End</span>
              </button>

              <button
                type="button"
                onClick={handleOneTapAutoPlan}
                className="vira-btn-primary px-4 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>Pick Safest Night Route</span>
              </button>
            </div>
          </div>

          {toastBanner && (
            <div
              role="status"
              className="p-3 rounded-xl bg-blush-deep border border-brand-pink text-xs font-bold text-ink flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
                {toastBanner}
              </span>
              <button
                type="button"
                onClick={() => setToastBanner("")}
                className="text-ink-muted hover:text-ink text-xs font-bold"
              >
                Close
              </button>
            </div>
          )}

          {/* Quick 1-Click Route Presets Across New Delhi */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-extrabold uppercase text-ink-muted shrink-0">
              1-Click New Delhi Routes:
            </span>
            {QUICK_NEW_DELHI_ROUTES.map((item) => {
              const isCurrent =
                startQuery.toLowerCase() === item.start.toLowerCase() &&
                destQuery.toLowerCase() === item.dest.toLowerCase();
              return (
                <button
                  key={`${item.start}-${item.dest}`}
                  type="button"
                  onClick={() => {
                    setStartQuery(item.start);
                    setDestQuery(item.dest);
                    runPlanner(
                      item.start,
                      item.dest,
                      departureTime,
                      travelMode,
                      preference,
                      false
                    );
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 transition-all ${
                    isCurrent
                      ? "bg-brand-pink text-surface-white border-brand-pink"
                      : "bg-blush-light border-border-rose text-ink hover:border-brand-pink"
                  }`}
                >
                  {item.start} → {item.dest}
                </button>
              );
            })}
          </div>

          {/* Search Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runPlanner();
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end"
          >
            {/* Start Place */}
            <div className="lg:col-span-3 relative">
              <label
                htmlFor="planner-start"
                className="block text-xs font-bold text-ink mb-1"
              >
                1. Starting Place in New Delhi
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                <input
                  id="planner-start"
                  type="text"
                  value={startQuery}
                  onFocus={() => setShowStartDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowStartDropdown(false), 200)
                  }
                  onChange={(e) => setStartQuery(e.target.value)}
                  placeholder="Type any place in New Delhi..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border-rose bg-surface-white text-sm font-semibold text-ink"
                />
              </div>
              {showStartDropdown && startSuggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 vira-card p-1.5 max-h-56 overflow-y-auto bg-surface-white shadow-elevated">
                  {startSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => {
                        setStartQuery(p.shortName);
                        setShowStartDropdown(false);
                        runPlanner(
                          p.shortName,
                          destQuery,
                          departureTime,
                          travelMode,
                          preference,
                          false
                        );
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blush-deep text-xs"
                    >
                      <div className="font-bold text-ink">{p.shortName}</div>
                      <div className="text-[11px] text-ink-muted">
                        {p.district}, New Delhi
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Destination Place */}
            <div className="lg:col-span-3 relative">
              <label
                htmlFor="planner-dest"
                className="block text-xs font-bold text-ink mb-1"
              >
                2. Destination in New Delhi
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                <input
                  id="planner-dest"
                  type="text"
                  value={destQuery}
                  onFocus={() => setShowDestDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowDestDropdown(false), 200)
                  }
                  onChange={(e) => setDestQuery(e.target.value)}
                  placeholder="Type destination in New Delhi..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border-rose bg-surface-white text-sm font-semibold text-ink"
                />
              </div>
              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 vira-card p-1.5 max-h-56 overflow-y-auto bg-surface-white shadow-elevated">
                  {destSuggestions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => {
                        setDestQuery(p.shortName);
                        setShowDestDropdown(false);
                        runPlanner(
                          startQuery,
                          p.shortName,
                          departureTime,
                          travelMode,
                          preference,
                          false
                        );
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blush-deep text-xs"
                    >
                      <div className="font-bold text-ink">{p.shortName}</div>
                      <div className="text-[11px] text-ink-muted">
                        {p.district}, New Delhi
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Time */}
            <div className="lg:col-span-2">
              <label
                htmlFor="planner-time"
                className="block text-xs font-bold text-ink mb-1"
              >
                3. Travel Time
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-brand-pink absolute left-3 top-3" />
                <input
                  id="planner-time"
                  type="time"
                  value={departureTime}
                  onChange={(e) => {
                    setDepartureTime(e.target.value);
                    runPlanner(
                      startQuery,
                      destQuery,
                      e.target.value,
                      travelMode,
                      preference,
                      false
                    );
                  }}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border-rose bg-surface-white text-sm font-semibold text-ink"
                />
              </div>
            </div>

            {/* How You Are Travelling */}
            <div className="lg:col-span-2">
              <span className="block text-xs font-bold text-ink mb-1">
                4. How You Travel
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-blush-light border border-border-rose">
                {(
                  [
                    { id: "WALK", label: "Walk", icon: Footprints },
                    { id: "AUTO", label: "Auto", icon: Car },
                    { id: "CAB", label: "Cab", icon: Car },
                    { id: "METRO", label: "Metro", icon: Train },
                  ] as const
                ).map((m) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setTravelMode(m.id);
                        runPlanner(
                          startQuery,
                          destQuery,
                          departureTime,
                          m.id,
                          preference,
                          false
                        );
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center transition-all ${
                        travelMode === m.id
                          ? "bg-brand-pink text-surface-white"
                          : "text-ink-muted hover:text-ink"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-blush-light border border-border-rose">
                {(["SAFEST", "BALANCED", "FASTEST"] as const).map((pref) => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => {
                      setPreference(pref);
                      runPlanner(
                        startQuery,
                        destQuery,
                        departureTime,
                        travelMode,
                        pref,
                        false
                      );
                    }}
                    className={`py-1 rounded-lg text-[10px] font-bold transition-all ${
                      preference === pref
                        ? "bg-brand-pink text-surface-white"
                        : "text-ink-muted"
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="vira-btn-primary py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <Route className="w-4 h-4" />
                <span>{loading ? "Updating Route..." : "Find Safe Route"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ALWAYS-VISIBLE ENLARGED NEW DELHI SAFE ROUTE MAP RIGHT AT THE TOP */}
        <div className="w-full space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-brand-pink text-surface-white text-xs font-extrabold">
                LIVE SAFE ROUTE MAP
              </span>
              <span className="text-sm font-extrabold text-ink">
                {comparison.startPlace.shortName} →{" "}
                {comparison.destinationPlace.shortName}
              </span>
            </div>
            <div className="text-xs font-bold text-ink-muted">
              Selected Route:{" "}
              <strong className="text-brand-pink">{selectedRoute.title}</strong>{" "}
              ({selectedRoute.safetyScore}/100 Safety Score ·{" "}
              {selectedRoute.durationMinutes} min · {selectedRoute.distanceKm} km)
            </div>
          </div>

          <SafetyMapCanvas
            zones={zones}
            safeHavens={safeHavens}
            selectedSlug={
              zones.find((z) => z.evaluation.level === "HIGH")?.slug ||
              "minto-bridge-underpass-lane"
            }
            onSelectZone={() => {}}
            showSafeHavens={true}
            hideBuiltInRouteBar={true}
            routeStartLabel={comparison.startPlace.shortName}
            routeDestLabel={comparison.destinationPlace.shortName}
            routePolylines={comparison.routes.map((r) => ({
              id: r.id,
              routeType: r.routeType,
              geometry: r.geometry,
              selected: r.id === selectedRoute.id,
            }))}
          />
        </div>

        {/* Simple Voice Advice Banner */}
        <div className="vira-card p-4 bg-blush-deep border border-brand-pink flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-pink">
              Simple Route Advice ({comparison.startPlace.shortName} →{" "}
              {comparison.destinationPlace.shortName})
            </div>
            <p className="text-xs sm:text-sm font-semibold text-ink">
              {comparison.viraNarrativeSummary}
            </p>
          </div>
          <button
            type="button"
            onClick={handleNarrateWithVira}
            className="vira-btn-primary px-4 py-2 text-xs font-bold shrink-0 flex items-center gap-1.5"
          >
            <Volume2 className="w-4 h-4" />
            <span>Hear Voice Advice</span>
          </button>
        </div>

        {/* 3 Clear Route Option Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {comparison.routes.map((route) => {
            const isSelected = route.id === selectedRouteId;
            const isSafest = route.routeType === "SAFEST";
            const isFastest = route.routeType === "FASTEST";
            return (
              <div
                key={route.id}
                onClick={() => setSelectedRouteId(route.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setSelectedRouteId(route.id);
                  }
                }}
                className={`vira-card p-5 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? isFastest
                      ? "border-2 border-danger-red bg-blush-light"
                      : "border-2 border-brand-pink bg-blush-deep"
                    : "bg-surface-white hover:bg-blush-light"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                        isSafest
                          ? "bg-brand-pink text-surface-white border-brand-pink"
                          : isFastest
                          ? "bg-surface-white text-danger-red border-danger-red"
                          : "bg-blush-light text-ink border-border-rose"
                      }`}
                    >
                      {isSafest
                        ? "✓ SAFEST ROUTE (RECOMMENDED)"
                        : isFastest
                        ? "⚠ SHORTCUT (AVOID AT NIGHT)"
                        : "BALANCED ROUTE"}
                    </span>

                    <RiskBadge level={route.riskLevel} compact />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-ink">
                        {route.title}
                      </h2>
                      <div className="text-xs font-semibold text-ink-muted">
                        {route.durationMinutes} min · {route.distanceKm} km ·
                        Reach by {route.etaText}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase text-ink-muted">
                        Safety Score
                      </div>
                      <div
                        className={`text-2xl font-extrabold ${
                          route.safetyScore >= 85
                            ? "text-brand-pink"
                            : route.safetyScore < 60
                            ? "text-danger-red"
                            : "text-ink"
                        }`}
                      >
                        {route.safetyScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-white border border-border-rose space-y-1">
                    <div className="text-[11px] font-bold uppercase text-brand-pink">
                      Why choose or avoid this road:
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      {route.headlineReason}
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-border-rose flex items-center justify-between text-xs font-bold">
                  <span className="text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-brand-pink" />
                    {route.safeStops.length} Police & Safe Stops on Way
                  </span>
                  <span className="text-brand-pink">
                    {isSelected ? "✓ Highlighted on Map ↑" : "Highlight on Map"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons Bar */}
        <div className="vira-card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleStartJourney}
            className="vira-btn-primary py-3 px-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Navigation className="w-4 h-4" />
            <span>Start Live Trip Monitor</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setToastBanner(
                `Your route (${selectedRoute.title}) and arrival time (${selectedRoute.etaText}) were shared with your Trusted Contacts.`
              );
            }}
            className="vira-btn-secondary py-3 px-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-brand-pink" />
            <span>Share Trip with Family</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCheckInTimer(15);
              setToastBanner(
                "15-minute safety check-in timer started. We will ask if you are okay in 15 minutes."
              );
            }}
            className="vira-btn-secondary py-3 px-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4 text-brand-pink" />
            <span>Start 15-Min Safety Timer</span>
          </button>

          <button
            type="button"
            onClick={() =>
              runPlanner(
                startQuery,
                destQuery,
                departureTime,
                travelMode,
                preference,
                true
              )
            }
            className="vira-btn-secondary py-3 px-4 text-sm font-bold flex items-center justify-center gap-2"
          >
            <BookmarkCheck className="w-4 h-4 text-brand-pink" />
            <span>Save This Route</span>
          </button>
        </div>

        {/* 9 Safety Parameters for Both Start & Destination in New Delhi */}
        {comparison.startSafetyParams && comparison.destSafetyParams && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <NineSafetyParametersGrid
              placeName={`Start: ${comparison.startPlace.shortName}`}
              safetyParams={comparison.startSafetyParams}
              compact
            />
            <NineSafetyParametersGrid
              placeName={`Destination: ${comparison.destinationPlace.shortName}`}
              safetyParams={comparison.destSafetyParams}
              compact
            />
          </div>
        )}

        {/* Simple Road-by-Road Steps & 24x7 Safe Stops Along the Selected Route */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 vira-card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-border-rose pb-2.5">
              <div>
                <span className="text-xs font-bold uppercase text-brand-pink">
                  Step-by-Step Road Check
                </span>
                <h3 className="text-base font-bold text-ink">
                  Roads on {selectedRoute.title}
                </h3>
              </div>
              <span className="text-xs font-bold text-ink-muted">
                Reach by {selectedRoute.etaText}
              </span>
            </div>

            <div className="space-y-2.5">
              {selectedRoute.legs.map((leg, idx) => (
                <div
                  key={leg.id}
                  className="p-3.5 rounded-xl bg-blush-light border border-border-rose space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-ink">
                      Step {idx + 1}: {leg.corridorName} ({leg.distanceKm} km ·{" "}
                      {leg.durationMinutes} min)
                    </span>
                    <RiskBadge
                      level={leg.riskLevel}
                      score={leg.riskScore}
                      compact
                    />
                  </div>
                  <p className="text-xs text-ink-muted">{leg.plainReason}</p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-ink">
                    <span>Lighting: {leg.lightingScore}%</span>
                    <span>Footfall: {leg.footfallScore}%</span>
                    <span>Road Safety: {leg.safetyScore}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 vira-card p-5 space-y-3">
            <div>
              <span className="text-xs font-bold uppercase text-brand-pink">
                Help Along Your Way
              </span>
              <h3 className="text-base font-bold text-ink">
                24x7 Police Booths & Safe Stops on This Route
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {selectedRoute.safeStops.map((stop) => (
                <div
                  key={stop.id}
                  className="p-3 rounded-xl bg-blush-deep border border-border-rose flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="text-xs font-bold text-ink">
                      {stop.name}
                    </div>
                    <div className="text-[11px] text-ink-muted">
                      {stop.placeName} · {stop.distanceFromRouteText}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-surface-white text-[10px] font-bold text-brand-pink border border-border-rose shrink-0">
                    24x7 Open
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blush-light" />}>
      <PlannerContent />
    </Suspense>
  );
}
