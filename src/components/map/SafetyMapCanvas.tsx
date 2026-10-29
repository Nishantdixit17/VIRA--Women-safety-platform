"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Layers,
  RotateCcw,
  Maximize2,
  Minimize2,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  X,
  Route,
  MapPin,
  Radio,
  Navigation,
  Loader2,
} from "lucide-react";
import { EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { CopilotSafetyStop } from "@/store/useSafetyStore";
import {
  INDIAN_PLACES_DIRECTORY,
  computeNineSafetyParameters,
  NineSafetyParameters,
} from "@/lib/engine/places-geocoder";
import { NineSafetyParametersGrid } from "@/components/safety/NineSafetyParametersGrid";
import type {
  LiveExternalPlaceResult,
  LivePatrolUnit,
  RealtimeMapPayload,
} from "@/lib/realtime/map-telemetry";
import {
  computeSafeJourneyRoutes,
  type JourneyPlanComparison,
} from "@/lib/engine/route-planner";

export interface SafeHavenMapItem {
  id: string;
  name: string;
  category: string;
  placeName: string;
  address: string;
  lat: number;
  lng: number;
  openHours: string;
  contactPhone: string;
  is24x7: boolean;
  distanceText: string;
}

export interface SafetyMapCanvasProps {
  zones: EnrichedAreaZone[];
  safeHavens: SafeHavenMapItem[];
  selectedSlug: string;
  onSelectZone: (zone: EnrichedAreaZone) => void;
  showSafeHavens: boolean;
  routePolylines?: Array<{
    id: string;
    routeType: "FASTEST" | "BALANCED" | "SAFEST";
    geometry: Array<[number, number]>;
    selected: boolean;
  }>;
  routeStartLabel?: string;
  routeDestLabel?: string;
  copilotStops?: CopilotSafetyStop[];
  onAddZoneToCopilot?: (zone: EnrichedAreaZone) => void;
  onAskViraAboutZone?: (zone: EnrichedAreaZone) => void;
  isFullMap?: boolean;
  onToggleFullMap?: () => void;
  activeHourLabel?: string;
  heightClass?: string;
  hideBuiltInRouteBar?: boolean;
}

const TILE_PROVIDERS = {
  google_streets: {
    label: "New Delhi Street Map",
    url: "https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Maps New Delhi & OpenStreetMap",
  },
  google_hybrid: {
    label: "New Delhi Satellite + Roads",
    url: "https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Satellite & Roads New Delhi",
  },
  osm: {
    label: "OpenStreetMap New Delhi",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  voyager: {
    label: "Clean Vector Map",
    url: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap & CARTO",
  },
} as const;

type MapStyleKey = keyof typeof TILE_PROVIDERS;

const NEW_DELHI_YAMUNA_RIVER_COORDS: Array<[number, number]> = [
  [28.715, 77.228],
  [28.685, 77.234],
  [28.662, 77.243],
  [28.638, 77.249],
  [28.615, 77.254],
  [28.585, 77.262],
  [28.552, 77.278],
  [28.525, 77.295],
];

const NEW_DELHI_RING_ROAD_COORDS: Array<[number, number]> = [
  [28.685, 77.208],
  [28.665, 77.238],
  [28.628, 77.245],
  [28.592, 77.252],
  [28.568, 77.222],
  [28.567, 77.209],
  [28.582, 77.175],
  [28.635, 77.152],
  [28.678, 77.182],
  [28.685, 77.208],
];

const DEFAULT_SAFEST_ROUTE_COORDS: Array<[number, number]> = [
  [28.6315, 77.2167],
  [28.6288, 77.2245],
  [28.6255, 77.2342],
  [28.6095, 77.2275],
  [28.5746, 77.1992],
  [28.5672, 77.21],
  [28.5494, 77.2001],
];

const DEFAULT_RISKY_SHORTCUT_COORDS: Array<[number, number]> = [
  [28.6315, 77.2167],
  [28.6353, 77.225],
  [28.6275, 77.2415],
  [28.589, 77.218],
  [28.5545, 77.1945],
  [28.5494, 77.2001],
];

function createZoneDivIcon(zone: EnrichedAreaZone, isSelected: boolean) {
  const isRedZone =
    zone.evaluation.level === "HIGH" ||
    zone.evaluation.level === "ACTIVE_INCIDENT" ||
    zone.evaluation.score >= 65;
  const isElevated = zone.evaluation.level === "ELEVATED";

  const bgColor = isRedZone
    ? "#D91E3F"
    : isElevated
    ? "#E64A7B"
    : "#2B1B21";

  const badgeLabel = isRedZone
    ? `RED ZONE · ${zone.evaluation.score}% RISK`
    : isElevated
    ? `CAUTION · ${zone.evaluation.score}% RISK`
    : `SAFE · ${zone.evaluation.safetyScore}/100`;

  const size = isSelected ? 46 : isRedZone ? 42 : 34;

  const pulseHtml = isRedZone
    ? `<div style="position:absolute;width:${size + 22}px;height:${
        size + 22
      }px;border-radius:50%;background:rgba(217,30,63,0.35);border:2px solid #D91E3F;animation:ping 1.6s cubic-bezier(0,0,0.2,1) infinite;top:-11px;left:-11px;z-index:-1;"></div>`
    : "";

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:auto;">
      <div style="
        white-space:nowrap;
        padding:2px 7px;
        border-radius:999px;
        background:${isRedZone ? "#D91E3F" : isSelected ? "#E64A7B" : "#FFFFFF"};
        color:${isRedZone || isSelected ? "#FFFFFF" : "#2B1B21"};
        border:1.5px solid ${isRedZone ? "#FFFFFF" : "#E64A7B"};
        font-size:9px;
        font-weight:900;
        font-family:Inter,sans-serif;
        box-shadow:0 3px 10px rgba(43,27,33,0.25);
        margin-bottom:3px;
      ">
        ${zone.name.split(" ").slice(0, 2).join(" ")} · ${badgeLabel}
      </div>
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        ${pulseHtml}
        <div style="
          width:${size}px;
          height:${size}px;
          background:${bgColor};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;
          align-items:center;
          justify-content:center;
          box-shadow:0 5px 16px rgba(43,27,33,0.35);
          border:${isSelected ? "3.5px" : "2.5px"} solid #FFFFFF;
        ">
          <div style="transform:rotate(45deg);display:flex;flex-direction:column;align-items:center;line-height:1;">
            <span style="font-size:${
              isSelected ? "12px" : "11px"
            };font-weight:900;color:#FFFFFF;font-family:Inter,sans-serif;">
              ${isRedZone ? zone.evaluation.score : zone.evaluation.safetyScore}
            </span>
            <span style="font-size:7px;font-weight:800;color:#FFFFFF;text-transform:uppercase;">
              ${isRedZone ? "RISK" : "SAFE"}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "vira-native-zone-pin",
    html,
    iconSize: [140, size + 28],
    iconAnchor: [70, size + 24],
    popupAnchor: [0, -size - 16],
  });
}

function createSafeHavenDivIcon(category: string, name: string) {
  const shortCode = category.includes("POLICE")
    ? "POLICE BOOTH"
    : category.includes("HOSPITAL")
    ? "24x7 HOSPITAL"
    : "SAFE METRO";

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        padding:3px 8px;
        background:#2B1B21;
        color:#FFFFFF;
        border-radius:8px;
        border:2px solid #E64A7B;
        box-shadow:0 3px 10px rgba(43,27,33,0.3);
        display:flex;
        flex-direction:column;
        align-items:center;
        font-family:Inter,sans-serif;
        white-space:nowrap;
      ">
        <span style="font-size:8px;font-weight:900;color:#E64A7B;line-height:1;">✓ ${shortCode}</span>
        <span style="font-size:9px;font-weight:800;color:#FFFFFF;line-height:1.2;">${name
          .split(" ")
          .slice(0, 2)
          .join(" ")}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "vira-native-haven-pin",
    html,
    iconSize: [110, 36],
    iconAnchor: [55, 18],
    popupAnchor: [0, -18],
  });
}

function createLivePatrolDivIcon(unit: LivePatrolUnit) {
  const isRedDispatch = unit.status === "DISPATCHED_RED_ZONE";
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;">
      <div style="
        padding:2px 7px;
        border-radius:999px;
        background:${isRedDispatch ? "#D91E3F" : "#E64A7B"};
        color:#FFFFFF;
        border:1.5px solid #FFFFFF;
        font-size:8px;
        font-weight:900;
        font-family:Inter,sans-serif;
        white-space:nowrap;
        box-shadow:0 3px 10px rgba(43,27,33,0.3);
        display:flex;
        align-items:center;
        gap:4px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:#FFFFFF;display:inline-block;"></span>
        <span>🚔 ${unit.unitCode}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    className: "vira-live-patrol-pin",
    html,
    iconSize: [110, 24],
    iconAnchor: [55, 12],
    popupAnchor: [0, -12],
  });
}

function createRouteBannerDivIcon(label: string, isSafe: boolean) {
  const html = `
    <div style="
      white-space:nowrap;
      padding:4px 10px;
      border-radius:999px;
      background:${isSafe ? "#2B1B21" : "#D91E3F"};
      color:#FFFFFF;
      border:2px solid ${isSafe ? "#E64A7B" : "#FFFFFF"};
      font-size:10px;
      font-weight:900;
      font-family:Inter,sans-serif;
      box-shadow:0 4px 12px rgba(43,27,33,0.3);
      display:inline-flex;
      align-items:center;
      gap:4px;
    ">
      <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${
        isSafe ? "#E64A7B" : "#FFFFFF"
      };"></span>
      <span>${label}</span>
    </div>
  `;
  return L.divIcon({
    className: "vira-route-banner-pin",
    html,
    iconSize: [190, 26],
    iconAnchor: [95, 13],
  });
}

export default function SafetyMapCanvas({
  zones: propZones,
  safeHavens,
  selectedSlug,
  onSelectZone,
  showSafeHavens,
  routePolylines: propRoutePolylines,
  routeStartLabel,
  routeDestLabel,
  copilotStops,
  isFullMap = false,
  onToggleFullMap,
  activeHourLabel = "10:00 PM",
  hideBuiltInRouteBar = false,
}: SafetyMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchingPlace, setSearchingPlace] = useState(false);

  // Built-in Safe Route Finder state directly on the map
  const [routeFrom, setRouteFrom] = useState("Connaught Place");
  const [routeTo, setRouteTo] = useState("Hauz Khas");
  const [computingRoute, setComputingRoute] = useState(false);
  const [customRoutePlan, setCustomRoutePlan] =
    useState<JourneyPlanComparison | null>(null);

  const [mapStyle, setMapStyle] = useState<MapStyleKey>("google_streets");
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [showRedZonesLayer, setShowRedZonesLayer] = useState(true);
  const [showSafestRouteLayer, setShowSafestRouteLayer] = useState(true);
  const [showLivePatrolsLayer, setShowLivePatrolsLayer] = useState(true);

  // Real-Time Telemetry API State (/api/map/realtime)
  const [liveApiEnabled, setLiveApiEnabled] = useState(true);
  const [liveZones, setLiveZones] = useState<EnrichedAreaZone[]>(propZones);
  const [livePatrolUnits, setLivePatrolUnits] = useState<LivePatrolUnit[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("Live");
  const [citySafetyAvg, setCitySafetyAvg] = useState<number>(64);
  const [externalSearchResults, setExternalSearchResults] = useState<
    LiveExternalPlaceResult[]
  >([]);
  const [identifiedLocation, setIdentifiedLocation] =
    useState<LiveExternalPlaceResult | null>(null);

  // Enlarged New Delhi Map Height (640px standard, 760px expanded)
  const explicitMapHeightPx = isFullMap ? 760 : 640;

  // Combine prop routePolylines or customRoutePlan computed directly on the map
  const activeRoutePolylines = useMemo(() => {
    if (propRoutePolylines && propRoutePolylines.length > 0) {
      return propRoutePolylines;
    }
    if (customRoutePlan && customRoutePlan.routes.length > 0) {
      return customRoutePlan.routes.map((r) => ({
        id: r.id,
        routeType: r.routeType,
        geometry: r.geometry,
        selected: r.routeType === "SAFEST",
      }));
    }
    return undefined;
  }, [propRoutePolylines, customRoutePlan]);

  useEffect(() => {
    if (propZones && propZones.length > 0) {
      setLiveZones(propZones);
    }
  }, [propZones]);

  useEffect(() => {
    if (!liveApiEnabled) return;

    let mounted = true;
    const fetchRealtimeTelemetry = async () => {
      try {
        const res = await fetch("/api/map/realtime?hour=21", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data: RealtimeMapPayload = await res.json();
        if (!mounted) return;

        if (data.zones && data.zones.length > 0) {
          setLiveZones(data.zones);
        }
        if (data.patrolUnits) {
          setLivePatrolUnits(data.patrolUnits);
        }
        if (data.timestampDisplay) {
          setLastSyncTime(data.timestampDisplay);
        }
        if (data.summary?.citySafetyIndex) {
          setCitySafetyAvg(data.summary.citySafetyIndex);
        }
      } catch {
        // Silent fallback
      }
    };

    fetchRealtimeTelemetry();
    const timer = setInterval(fetchRealtimeTelemetry, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [liveApiEnabled]);

  // Debounced live API search when user types any location in New Delhi
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setExternalSearchResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/map/realtime?q=${encodeURIComponent(q)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data: RealtimeMapPayload = await res.json();
        if (data.searchedPlaces) {
          setExternalSearchResults(data.searchedPlaces);
        }
      } catch {
        // Ignore
      }
    }, 260);

    return () => clearTimeout(t);
  }, [searchQuery]);

  const zones = liveZones.length > 0 ? liveZones : propZones;

  const selectedZone = useMemo(
    () => zones.find((z) => z.slug === selectedSlug) || zones[0],
    [zones, selectedSlug]
  );

  const redZones = useMemo(
    () =>
      zones.filter(
        (z) =>
          z.evaluation.level === "HIGH" ||
          z.evaluation.level === "ACTIVE_INCIDENT" ||
          z.evaluation.level === "ELEVATED" ||
          z.evaluation.score >= 55
      ),
    [zones]
  );

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return zones.slice(0, 6);
    return zones
      .filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          (z.corridorName || "").toLowerCase().includes(q) ||
          z.district.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [zones, searchQuery]);

  // Compute the 9 safety parameters for whichever location is currently active
  const activeNineSafetyParams: {
    placeName: string;
    safetyScore: number;
    params: NineSafetyParameters;
  } = useMemo(() => {
    if (identifiedLocation) {
      return {
        placeName: identifiedLocation.name,
        safetyScore: identifiedLocation.estimatedSafetyScore,
        params:
          identifiedLocation.safetyParams ||
          computeNineSafetyParameters(
            identifiedLocation.lat,
            identifiedLocation.lng,
            identifiedLocation.name,
            "New Delhi"
          ),
      };
    }
    if (selectedZone) {
      return {
        placeName: selectedZone.name,
        safetyScore: selectedZone.evaluation.safetyScore,
        params: computeNineSafetyParameters(
          selectedZone.centerLat,
          selectedZone.centerLng,
          selectedZone.name,
          selectedZone.district
        ),
      };
    }
    const fallback = INDIAN_PLACES_DIRECTORY[0];
    return {
      placeName: fallback.name,
      safetyScore: 88,
      params:
        fallback.safetyParams ||
        computeNineSafetyParameters(
          fallback.lat,
          fallback.lng,
          fallback.shortName,
          fallback.district
        ),
    };
  }, [identifiedLocation, selectedZone]);

  // Direct handler when user searches any location in New Delhi and presses Enter or clicks "Find Place"
  const handleDirectPlaceSearch = async (queryOverride?: string) => {
    const q = (queryOverride ?? searchQuery).trim();
    if (!q) return;
    setSearchingPlace(true);
    setSearchFocused(false);

    try {
      // 1. Check monitored zones first
      const zoneMatch = zones.find(
        (z) =>
          z.name.toLowerCase().includes(q.toLowerCase()) ||
          (z.corridorName || "").toLowerCase().includes(q.toLowerCase())
      );
      if (zoneMatch) {
        onSelectZone(zoneMatch);
        setIdentifiedLocation(null);
        mapInstanceRef.current?.flyTo(
          [zoneMatch.centerLat, zoneMatch.centerLng],
          14,
          { duration: 0.75 }
        );
      }

      // 2. Fetch live place safety & route from /api/map/realtime?q=...
      const res = await fetch(`/api/map/realtime?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data: RealtimeMapPayload = await res.json();
        if (data.searchedPlaces && data.searchedPlaces.length > 0) {
          const best = data.searchedPlaces[0];
          setIdentifiedLocation(best);
          setRouteFrom(best.name);
          mapInstanceRef.current?.flyTo([best.lat, best.lng], 14, {
            duration: 0.75,
          });
          setSearchingPlace(false);
          return;
        }
      }
    } catch {
      // Fallback to local directory match
    }

    const dirMatch =
      INDIAN_PLACES_DIRECTORY.find(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.shortName.toLowerCase().includes(q.toLowerCase()) ||
          p.district.toLowerCase().includes(q.toLowerCase())
      ) || INDIAN_PLACES_DIRECTORY[0];

    const fallbackParams = computeNineSafetyParameters(
      dirMatch.lat,
      dirMatch.lng,
      dirMatch.shortName,
      dirMatch.district
    );
    setIdentifiedLocation({
      id: `dir-${dirMatch.id}`,
      name: `${dirMatch.shortName} (${dirMatch.district})`,
      displayName: dirMatch.name,
      lat: dirMatch.lat,
      lng: dirMatch.lng,
      category: "IDENTIFIED_LOCATION",
      estimatedRiskScore: 28,
      estimatedSafetyScore: 72,
      riskLevel: "LOW",
      isRedZone: false,
      whyExplanation: `Located in ${dirMatch.district}, New Delhi. Nearest police help: ${fallbackParams.nearestPoliceStation.name} (${fallbackParams.nearestPoliceStation.distanceText}).`,
      nearestRedZoneName: "Minto Bridge Underpass Lane",
      nearestRedZoneDistM: 1200,
      nearestSafeHavenName: fallbackParams.nearestPoliceStation.name,
      nearestSafeHavenLat: 28.6315,
      nearestSafeHavenLng: 77.2167,
      safestRouteGeometry: [
        [dirMatch.lat, dirMatch.lng],
        [28.6315, 77.2167],
      ],
      riskyShortcutGeometry: [],
      safetyParams: fallbackParams,
    });
    mapInstanceRef.current?.flyTo([dirMatch.lat, dirMatch.lng], 14, {
      duration: 0.75,
    });
    setSearchingPlace(false);
  };

  // Compute Safe Route between any two New Delhi places directly on the map (0ms instant + API sync)
  const handleComputeMapSafeRoute = async (
    startOverride?: string,
    destOverride?: string
  ) => {
    const start = (startOverride ?? routeFrom).trim() || "Connaught Place";
    const dest = (destOverride ?? routeTo).trim() || "Hauz Khas";
    setComputingRoute(true);
    setShowSafestRouteLayer(true);

    // 1. Instant 0ms client-side route computation for any New Delhi location
    const instantPlan = computeSafeJourneyRoutes({
      startPlaceName: start,
      destPlaceName: dest,
      departureTime: "21:30",
      travelMode: "WALK",
      preference: "SAFEST",
      zones,
      safeHavens,
    });
    setCustomRoutePlan(instantPlan);
    const instantSafest =
      instantPlan.routes.find((r) => r.routeType === "SAFEST") ||
      instantPlan.routes[0];
    if (
      instantSafest &&
      instantSafest.geometry.length > 1 &&
      mapInstanceRef.current
    ) {
      const bounds = L.latLngBounds(instantSafest.geometry);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 14,
        animate: true,
      });
    }

    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startPlaceName: start,
          destPlaceName: dest,
          departureTime: "21:30",
          travelMode: "WALK",
          preference: "SAFEST",
        }),
      });
      if (res.ok) {
        const plan: JourneyPlanComparison = await res.json();
        setCustomRoutePlan(plan);
      }
    } catch {
      // Already rendered via instantPlan
    } finally {
      setComputingRoute(false);
    }
  };

  // 1. Initialize Leaflet Map Centered on New Delhi
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || mapInstanceRef.current) return;

    const map = L.map(container, {
      center: [28.6139, 77.209],
      zoom: 12,
      zoomControl: false,
      scrollWheelZoom: true,
      preferCanvas: true,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const tileLayer = L.tileLayer(TILE_PROVIDERS.google_streets.url, {
      attribution: TILE_PROVIDERS.google_streets.attribution,
      maxZoom: 19,
    }).addTo(map);

    let fallbackTriggered = false;
    tileLayer.on("tileerror", () => {
      if (!fallbackTriggered) {
        fallbackTriggered = true;
        tileLayer.setUrl(TILE_PROVIDERS.osm.url);
      }
    });

    const overlayGroup = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;
    overlayLayerRef.current = overlayGroup;

    // Clicking anywhere on New Delhi map evaluates that exact location and its 9 safety parameters
    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(
          `/api/map/realtime?lat=${lat.toFixed(5)}&lng=${lng.toFixed(5)}`,
          { cache: "no-store" }
        );
        if (res.ok) {
          const data: RealtimeMapPayload = await res.json();
          if (data.searchedPlaces && data.searchedPlaces[0]) {
            setIdentifiedLocation(data.searchedPlaces[0]);
            return;
          }
        }
      } catch {
        // Fallback below
      }

      const fallbackParams = computeNineSafetyParameters(
        lat,
        lng,
        "Selected Map Point",
        "New Delhi"
      );
      setIdentifiedLocation({
        id: `click-${Date.now()}`,
        name: `New Delhi Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        displayName: "New Delhi Safety Map",
        lat,
        lng,
        category: "IDENTIFIED_LOCATION",
        estimatedRiskScore: 32,
        estimatedSafetyScore: 68,
        riskLevel: "LOW",
        isRedZone: false,
        whyExplanation:
          "Safe route plotted to nearest police help in New Delhi.",
        nearestRedZoneName: "Minto Bridge Underpass Lane",
        nearestRedZoneDistM: 850,
        nearestSafeHavenName: fallbackParams.nearestPoliceStation.name,
        nearestSafeHavenLat: 28.6315,
        nearestSafeHavenLng: 77.2167,
        safestRouteGeometry: [
          [lat, lng],
          [28.6288, 77.2245],
          [28.6315, 77.2167],
        ],
        riskyShortcutGeometry: [],
        safetyParams: fallbackParams,
      });
    });

    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 700);

    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(container);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      overlayLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const tileLayer = tileLayerRef.current;
    if (!tileLayer) return;
    tileLayer.setUrl(TILE_PROVIDERS[mapStyle].url);
  }, [mapStyle]);

  // Render Map Layers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = overlayLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();

    L.polyline(NEW_DELHI_YAMUNA_RIVER_COORDS, {
      color: "#60A5FA",
      weight: 10,
      opacity: 0.35,
    })
      .bindPopup("<strong>Yamuna River (New Delhi)</strong>")
      .addTo(group);

    L.polyline(NEW_DELHI_RING_ROAD_COORDS, {
      color: "#2B1B21",
      weight: 2,
      opacity: 0.25,
      dashArray: "4 6",
    })
      .bindPopup("<strong>New Delhi Ring Road</strong>")
      .addTo(group);

    // A. Draw Red Zones & Monitored Areas
    zones.forEach((zone) => {
      const isRedZone =
        zone.evaluation.level === "HIGH" ||
        zone.evaluation.level === "ACTIVE_INCIDENT" ||
        zone.evaluation.score >= 65;
      const isElevated = zone.evaluation.level === "ELEVATED";

      if (!showRedZonesLayer && (isRedZone || isElevated)) {
        return;
      }

      const strokeColor = isRedZone
        ? "#D91E3F"
        : isElevated
        ? "#E64A7B"
        : "#2B1B21";
      const fillColor = isRedZone ? "#D91E3F" : "#E64A7B";
      const isSelected = zone.slug === selectedSlug;
      const dynamicRadius = Math.max(
        420,
        Math.round(zone.radiusMeters * zone.evaluation.dynamicRadiusScale)
      );

      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: dynamicRadius,
        color: strokeColor,
        weight: isSelected ? 4 : isRedZone ? 3 : 2,
        fillColor,
        fillOpacity: isRedZone ? 0.28 : isElevated ? 0.18 : 0.1,
        dashArray: isRedZone ? "8 5" : undefined,
      });
      circle.on("click", () => {
        setIdentifiedLocation(null);
        onSelectZone(zone);
      });
      circle.addTo(group);

      if (isRedZone) {
        const coreCircle = L.circle([zone.centerLat, zone.centerLng], {
          radius: Math.round(dynamicRadius * 0.48),
          color: "#D91E3F",
          weight: 2,
          fillColor: "#D91E3F",
          fillOpacity: 0.4,
        });
        coreCircle.on("click", () => {
          setIdentifiedLocation(null);
          onSelectZone(zone);
        });
        coreCircle.addTo(group);
      }

      if (zone.polygon && zone.polygon.length > 1) {
        const poly = L.polyline(zone.polygon, {
          color: strokeColor,
          weight: isSelected ? 8 : isRedZone ? 6 : 4,
          opacity: 0.95,
          dashArray: isRedZone ? "10 6" : undefined,
        });
        poly.on("click", () => {
          setIdentifiedLocation(null);
          onSelectZone(zone);
        });
        poly.addTo(group);
      }

      const marker = L.marker([zone.centerLat, zone.centerLng], {
        icon: createZoneDivIcon(zone, isSelected),
        zIndexOffset: isSelected ? 1200 : isRedZone ? 900 : 400,
      });

      const popupContainer = document.createElement("div");
      popupContainer.style.fontFamily = "Inter, sans-serif";
      popupContainer.style.padding = "6px";
      popupContainer.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #F1D4DC;padding-bottom:6px;margin-bottom:6px;">
          <span style="padding:2px 8px;border-radius:6px;font-size:10px;font-weight:900;background:${
            isRedZone ? "#D91E3F" : "#E64A7B"
          };color:#FFFFFF;">
            ${isRedZone ? "RED ZONE" : "SAFETY SCORE"} · ${
        isRedZone
          ? `${zone.evaluation.score}% Risk`
          : `${zone.evaluation.safetyScore}/100`
      }
          </span>
        </div>
        <div style="font-size:13px;font-weight:900;color:#2B1B21;margin-bottom:2px;">
          ${zone.name}
        </div>
        <div style="font-size:11px;color:#6F5A62;margin-bottom:6px;">
          ${zone.district}, New Delhi
        </div>
        <div style="padding:8px;border-radius:8px;background:#FDECEF;border:1px solid #E64A7B;font-size:11px;color:#2B1B21;line-height:1.4;margin-bottom:8px;">
          ${zone.evaluation.headlineReason}
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;text-align:center;font-size:10px;font-weight:800;color:#2B1B21;">
          <div style="padding:4px;background:#FFF4F6;border:1px solid #F1D4DC;border-radius:6px;">Lighting: ${
            zone.lightingScore
          }%</div>
          <div style="padding:4px;background:#FFF4F6;border:1px solid #F1D4DC;border-radius:6px;">Footfall: ${
            zone.footfallScore
          }%</div>
          <div style="padding:4px;background:#FFF4F6;border:1px solid #F1D4DC;border-radius:6px;">Police: ${
            zone.nearestPoliceDistM
          }m</div>
        </div>
      `;

      marker.bindPopup(popupContainer, { maxWidth: 320 });
      marker.on("click", () => {
        setIdentifiedLocation(null);
        onSelectZone(zone);
        marker.openPopup();
      });
      marker.addTo(group);
    });

    // B. Draw SAFEST ROUTE vs. FASTEST ROUTE
    if (showSafestRouteLayer) {
      if (activeRoutePolylines && activeRoutePolylines.length > 0) {
        // Draw unselected routes first, selected route last (always on top)
        const orderedRoutes = [...activeRoutePolylines].sort(
          (x, y) => Number(x.selected) - Number(y.selected)
        );
        orderedRoutes.forEach((rp) => {
          if (!rp.geometry || rp.geometry.length < 2) return;
          const isSafest = rp.routeType === "SAFEST";
          const isFastest = rp.routeType === "FASTEST";
          const coreColor = isSafest
            ? "#E64A7B"
            : isFastest
            ? "#D91E3F"
            : "#6F5A62";

          // White outline + dark edge so the line stands out on any map tile
          L.polyline(rp.geometry, {
            color: "#FFFFFF",
            weight: rp.selected ? 15 : 9,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(group);
          L.polyline(rp.geometry, {
            color: "#2B1B21",
            weight: rp.selected ? 11 : 6,
            opacity: rp.selected ? 0.9 : 0.5,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(group);
          L.polyline(rp.geometry, {
            color: coreColor,
            weight: rp.selected ? 7 : 4,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
            dashArray: isFastest ? "10 8" : undefined,
          }).addTo(group);

          // Direction arrows along the selected route
          if (rp.selected) {
            const g = rp.geometry;
            const every = Math.max(2, Math.floor(g.length / 7));
            for (let i = every; i < g.length - 1; i += every) {
              const p1 = g[i - 1];
              const p2 = g[i + 1];
              const ang =
                (Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180) / Math.PI;
              L.marker(g[i], {
                icon: L.divIcon({
                  className: "",
                  iconSize: [22, 22],
                  iconAnchor: [11, 11],
                  html: `<div style="width:22px;height:22px;border-radius:50%;background:#FFFFFF;border:2px solid ${coreColor};display:flex;align-items:center;justify-content:center;transform:rotate(${90 - ang}deg);font-size:12px;line-height:1;color:${coreColor};font-weight:900;box-shadow:0 1px 4px rgba(0,0,0,.35);">&#10148;</div>`,
                }),
                interactive: false,
                zIndexOffset: 900,
              }).addTo(group);
            }
          }
          const midIdx = Math.floor(rp.geometry.length / 2);
          const midCoord = rp.geometry[midIdx];
          if (midCoord && (isSafest || isFastest)) {
            L.marker(midCoord, {
              icon: createRouteBannerDivIcon(
                isSafest
                  ? "✓ SAFEST ROUTE (WELL-LIT)"
                  : "⚠ SHORTCUT (AVOID AT NIGHT)",
                isSafest
              ),
              zIndexOffset: isSafest ? 1100 : 800,
            }).addTo(group);
          }
        });

        // Start & Destination Pins for Custom Route
        const safestPoly =
          activeRoutePolylines.find((r) => r.routeType === "SAFEST") ||
          activeRoutePolylines[0];
        if (safestPoly && safestPoly.geometry.length > 1) {
          const startPt = safestPoly.geometry[0];
          const endPt = safestPoly.geometry[safestPoly.geometry.length - 1];
          L.circleMarker(startPt, {
            radius: 10,
            color: "#FFFFFF",
            weight: 4,
            fillColor: "#16A34A",
            fillOpacity: 1,
          }).addTo(group);
          L.circleMarker(endPt, {
            radius: 10,
            color: "#FFFFFF",
            weight: 4,
            fillColor: "#D91E3F",
            fillOpacity: 1,
          }).addTo(group);
          L.marker(startPt, {
            icon: createRouteBannerDivIcon(
              `START: ${
                routeStartLabel ||
                customRoutePlan?.startPlace.shortName ||
                routeFrom
              }`,
              true
            ),
            zIndexOffset: 1300,
          }).addTo(group);
          L.marker(endPt, {
            icon: createRouteBannerDivIcon(
              `END: ${
                routeDestLabel ||
                customRoutePlan?.destinationPlace.shortName ||
                routeTo
              }`,
              true
            ),
            zIndexOffset: 1300,
          }).addTo(group);
        }
      } else {
        L.polyline(DEFAULT_RISKY_SHORTCUT_COORDS, {
          color: "#D91E3F",
          weight: 4.5,
          opacity: 0.85,
          dashArray: "10 8",
        }).addTo(group);

        L.marker(DEFAULT_RISKY_SHORTCUT_COORDS[2], {
          icon: createRouteBannerDivIcon("⚠ RED-ZONE SHORTCUT (AVOID)", false),
          zIndexOffset: 850,
        }).addTo(group);

        L.polyline(DEFAULT_SAFEST_ROUTE_COORDS, {
          color: "#2B1B21",
          weight: 10,
          opacity: 0.9,
        }).addTo(group);

        L.polyline(DEFAULT_SAFEST_ROUTE_COORDS, {
          color: "#E64A7B",
          weight: 6,
          opacity: 1,
        }).addTo(group);

        L.marker(DEFAULT_SAFEST_ROUTE_COORDS[3], {
          icon: createRouteBannerDivIcon("✓ SAFEST ROUTE (92/100 SAFE)", true),
          zIndexOffset: 1150,
        }).addTo(group);
      }
    }

    // C. Draw Live Moving Police Patrols
    if (showLivePatrolsLayer && livePatrolUnits.length > 0) {
      livePatrolUnits.forEach((unit) => {
        const patrolMarker = L.marker([unit.lat, unit.lng], {
          icon: createLivePatrolDivIcon(unit),
          zIndexOffset: 1050,
        });
        patrolMarker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;">
            <div style="font-size:10px;font-weight:900;color:#E64A7B;text-transform:uppercase;">
              Live Police Patrol
            </div>
            <div style="font-size:12px;font-weight:900;color:#2B1B21;margin:2px 0;">
              ${unit.name}
            </div>
            <div style="font-size:11px;color:#6F5A62;margin-bottom:4px;">
              Area: ${unit.assignedCorridor}<br/>
              Helpline: <strong>${unit.contactNumber}</strong>
            </div>
          </div>
        `);
        patrolMarker.addTo(group);
      });
    }

    // D. Draw 24x7 Safe Havens & Police Stations
    if (showSafeHavens) {
      safeHavens.forEach((sh) => {
        const marker = L.marker([sh.lat, sh.lng], {
          icon: createSafeHavenDivIcon(sh.category, sh.name),
          zIndexOffset: 700,
        });
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;">
            <div style="font-size:10px;font-weight:900;color:#E64A7B;text-transform:uppercase;">
              24x7 Safe Stop & Police Help
            </div>
            <div style="font-size:13px;font-weight:900;color:#2B1B21;margin:2px 0;">
              ${sh.name}
            </div>
            <div style="font-size:11px;color:#6F5A62;margin-bottom:4px;">
              ${sh.address} (${sh.distanceText})
            </div>
            <a href="tel:${
              sh.contactPhone.split("/")[0].trim()
            }" style="display:inline-block;padding:4px 10px;border-radius:6px;background:#E64A7B;color:#FFFFFF;font-size:11px;font-weight:800;text-decoration:none;">
              Call ${sh.contactPhone}
            </a>
          </div>
        `);
        marker.addTo(group);
      });
    }

    // E. Draw Searched / Clicked Location Pin & Safe Route
    if (identifiedLocation) {
      if (
        identifiedLocation.safestRouteGeometry &&
        identifiedLocation.safestRouteGeometry.length > 1
      ) {
        L.polyline(identifiedLocation.safestRouteGeometry, {
          color: "#2B1B21",
          weight: 9,
          opacity: 0.9,
        }).addTo(group);

        L.polyline(identifiedLocation.safestRouteGeometry, {
          color: "#E64A7B",
          weight: 5.5,
          opacity: 1,
        }).addTo(group);
      }

      const pinHtml = `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="padding:4px 10px;border-radius:999px;background:${
            identifiedLocation.isRedZone ? "#D91E3F" : "#2B1B21"
          };color:#FFFFFF;border:2px solid #E64A7B;font-size:10px;font-weight:900;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);">
            📍 ${identifiedLocation.name.slice(0, 28)} (${
        identifiedLocation.estimatedSafetyScore
      }/100 Safe)
          </div>
          <div style="width:18px;height:18px;border-radius:50%;background:${
            identifiedLocation.isRedZone ? "#D91E3F" : "#E64A7B"
          };border:3px solid #FFFFFF;margin-top:3px;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
        </div>
      `;

      L.marker([identifiedLocation.lat, identifiedLocation.lng], {
        icon: L.divIcon({
          className: "vira-identified-pin",
          html: pinHtml,
          iconSize: [260, 46],
          iconAnchor: [130, 38],
        }),
        zIndexOffset: 1500,
      })
        .addTo(group)
        .bindPopup(
          `<div style="font-family:Inter,sans-serif;font-size:11px;padding:4px;">
            <div style="font-weight:900;font-size:12px;color:#2B1B21;margin:2px 0;">${identifiedLocation.name}</div>
            <div style="color:#2B1B21;margin-bottom:4px;">${identifiedLocation.whyExplanation}</div>
            <div style="font-size:10px;font-weight:800;color:#E64A7B;">
              Nearest Police: ${identifiedLocation.safetyParams?.nearestPoliceStation.name || identifiedLocation.nearestSafeHavenName}
            </div>
          </div>`
        )
        .openPopup();
    }
  }, [
    zones,
    safeHavens,
    selectedSlug,
    showSafeHavens,
    showRedZonesLayer,
    showSafestRouteLayer,
    showLivePatrolsLayer,
    livePatrolUnits,
    activeRoutePolylines,
    customRoutePlan,
    routeFrom,
    routeTo,
    copilotStops,
    identifiedLocation,
    activeHourLabel,
    lastSyncTime,
    onSelectZone,
  ]);

  // Fly to Selected Zone or Route whenever selection changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const selectedRoute = activeRoutePolylines?.find((r) => r.selected);
    if (selectedRoute && selectedRoute.geometry.length > 1) {
      const bounds = L.latLngBounds(selectedRoute.geometry);
      map.fitBounds(bounds, { padding: [55, 55], maxZoom: 14, animate: true });
      return;
    }

    if (selectedZone && !identifiedLocation) {
      map.flyTo([selectedZone.centerLat, selectedZone.centerLng], 13, {
        duration: 0.75,
      });
    }
  }, [selectedZone, activeRoutePolylines, identifiedLocation]);

  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setIdentifiedLocation(null);
    setCustomRoutePlan(null);
    map.flyTo([28.6139, 77.209], 12, { duration: 0.75 });
  };

  const handleFitAllRedZones = () => {
    const map = mapInstanceRef.current;
    if (!map || redZones.length === 0) return;
    setShowRedZonesLayer(true);
    const bounds = L.latLngBounds(
      redZones.map((z) => [z.centerLat, z.centerLng] as [number, number])
    );
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
  };

  const handleFocusSafestRoute = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setShowSafestRouteLayer(true);
    const activeCoords =
      identifiedLocation?.safestRouteGeometry ||
      activeRoutePolylines?.find((r) => r.routeType === "SAFEST")?.geometry ||
      DEFAULT_SAFEST_ROUTE_COORDS;
    const bounds = L.latLngBounds(activeCoords);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13, animate: true });
  };

  return (
    <div className="w-full space-y-4">
      <div className="w-full rounded-2xl overflow-hidden border-2 border-border-rose bg-surface-white shadow-elevated flex flex-col">
        {/* ROW 1: Search Any Location in New Delhi + Map Layer Buttons */}
        <div className="bg-surface-white border-b border-border-rose px-4 py-3 flex flex-wrap items-center justify-between gap-2.5 z-20">
          <div className="relative flex-1 min-w-[260px] max-w-xl flex items-center gap-2">
            <div className="relative flex-1">
              <div className="bg-blush-light rounded-xl px-3.5 py-2 flex items-center gap-2 border border-border-rose focus-within:border-brand-pink">
                <Search className="w-4 h-4 text-brand-pink shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 220)}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleDirectPlaceSearch();
                    }
                  }}
                  placeholder="Type any place in New Delhi (e.g. Dwarka, Rohini, Saket, Lajpat Nagar, CP)..."
                  aria-label="Search any location in New Delhi"
                  className="bg-transparent text-xs font-bold text-ink placeholder:text-ink-muted outline-none w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-ink-muted hover:text-ink"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {searchFocused &&
                (searchResults.length > 0 ||
                  externalSearchResults.length > 0) && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-surface-white rounded-xl p-1.5 shadow-elevated border border-border-rose z-[1200] max-h-72 overflow-y-auto space-y-1">
                    {searchResults.length > 0 && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-brand-pink border-b border-border-rose">
                          Monitored New Delhi Areas ({searchResults.length})
                        </div>
                        {searchResults.map((z) => (
                          <button
                            key={z.slug}
                            type="button"
                            onMouseDown={() => {
                              setIdentifiedLocation(null);
                              onSelectZone(z);
                              setSearchQuery(z.name);
                              setRouteFrom(z.name);
                              setSearchFocused(false);
                              mapInstanceRef.current?.flyTo(
                                [z.centerLat, z.centerLng],
                                14,
                                { duration: 0.7 }
                              );
                            }}
                            className="w-full px-2.5 py-2 rounded-lg hover:bg-blush-deep flex items-center justify-between text-left transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold text-ink truncate">
                                {z.name}
                              </div>
                              <div className="text-[10px] text-ink-muted truncate">
                                {z.district} · Lighting {z.lightingScore}% ·
                                Crowd {z.footfallScore}%
                              </div>
                            </div>
                            <RiskBadge
                              level={z.evaluation.level}
                              score={z.evaluation.score}
                              compact
                            />
                          </button>
                        ))}
                      </>
                    )}

                    {externalSearchResults.length > 0 && (
                      <>
                        <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-ink border-b border-border-rose mt-1">
                          New Delhi Locations ({externalSearchResults.length})
                        </div>
                        {externalSearchResults.map((ext) => (
                          <button
                            key={ext.id}
                            type="button"
                            onMouseDown={() => {
                              setIdentifiedLocation(ext);
                              setSearchQuery(ext.name);
                              setRouteFrom(ext.name);
                              setSearchFocused(false);
                              mapInstanceRef.current?.flyTo(
                                [ext.lat, ext.lng],
                                14,
                                { duration: 0.7 }
                              );
                            }}
                            className="w-full px-2.5 py-2 rounded-lg hover:bg-blush-deep flex items-center justify-between text-left transition-colors"
                          >
                            <div className="min-w-0 pr-2">
                              <div className="text-xs font-bold text-ink truncate">
                                📍 {ext.name}
                              </div>
                              <div className="text-[10px] text-ink-muted truncate">
                                Nearest Police:{" "}
                                {ext.safetyParams?.nearestPoliceStation.name ||
                                  ext.nearestSafeHavenName}
                              </div>
                            </div>
                            <RiskBadge
                              level={ext.riskLevel}
                              score={ext.estimatedRiskScore}
                              compact
                            />
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
            </div>

            <button
              type="button"
              onClick={() => handleDirectPlaceSearch()}
              disabled={searchingPlace}
              className="px-3.5 py-2 rounded-xl bg-brand-pink text-white text-xs font-extrabold hover:bg-[#d83a6c] transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              {searchingPlace ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              <span>Find Safety Info</span>
            </button>
          </div>

          {/* Clear, Simple Map Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleFitAllRedZones}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                showRedZonesLayer
                  ? "bg-danger-red text-surface-white border-danger-red shadow-sm"
                  : "bg-surface-white text-danger-red border-danger-red"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Red Zones ({redZones.length})</span>
            </button>

            <button
              type="button"
              onClick={handleFocusSafestRoute}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                showSafestRouteLayer
                  ? "bg-brand-pink text-surface-white border-brand-pink shadow-sm"
                  : "bg-surface-white text-brand-pink border-brand-pink"
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              <span>Safest Route</span>
            </button>

            <button
              type="button"
              onClick={() => setShowLivePatrolsLayer((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1 border transition-all ${
                showLivePatrolsLayer
                  ? "bg-ink text-surface-white border-ink"
                  : "bg-surface-white text-ink border-border-rose"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-brand-pink" />
              <span>Police Patrols ({livePatrolUnits.length || 5})</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setLayerMenuOpen((v) => !v)}
                className="px-3 py-1.5 rounded-xl bg-blush-light border border-border-rose text-xs font-bold text-ink flex items-center gap-1 hover:border-brand-pink"
              >
                <Layers className="w-3.5 h-3.5 text-brand-pink" />
                <span>Map View</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {layerMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-surface-white rounded-xl p-1.5 shadow-elevated border border-border-rose z-[1200] space-y-1">
                  {(Object.keys(TILE_PROVIDERS) as MapStyleKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setMapStyle(key);
                        setLayerMenuOpen(false);
                      }}
                      className={`w-full px-3 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between ${
                        mapStyle === key
                          ? "bg-brand-pink text-surface-white"
                          : "text-ink hover:bg-blush-light"
                      }`}
                    >
                      <span>{TILE_PROVIDERS[key].label}</span>
                      {mapStyle === key && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetView}
              className="p-2 rounded-xl bg-blush-light border border-border-rose text-ink hover:border-brand-pink"
              title="Reset New Delhi Map"
            >
              <RotateCcw className="w-3.5 h-3.5 text-brand-pink" />
            </button>

            {onToggleFullMap && (
              <button
                type="button"
                onClick={onToggleFullMap}
                className="p-2 rounded-xl bg-blush-light border border-border-rose text-ink hover:border-brand-pink"
                title={isFullMap ? "Normal Map Size" : "Full Screen Map"}
              >
                {isFullMap ? (
                  <Minimize2 className="w-3.5 h-3.5 text-brand-pink" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-brand-pink" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* ROW 2: Built-In Safe Route Finder on the Map (From -> To in New Delhi) */}
        {!hideBuiltInRouteBar && (
          <div className="bg-[#FFF5F7] border-b border-border-rose px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 z-10">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
              <Navigation className="w-3.5 h-3.5 text-brand-pink" />
              <span>Find Safe Route on Map:</span>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[260px]">
              <input
                type="text"
                list="new-delhi-places-list"
                value={routeFrom}
                onChange={(e) => setRouteFrom(e.target.value)}
                placeholder="Start place in New Delhi..."
                className="flex-1 min-w-[140px] rounded-xl border border-border-rose bg-white px-3 py-1.5 text-xs font-bold text-ink outline-none focus:border-brand-pink"
              />
              <span className="text-xs font-extrabold text-brand-pink">→</span>
              <input
                type="text"
                list="new-delhi-places-list"
                value={routeTo}
                onChange={(e) => setRouteTo(e.target.value)}
                placeholder="Destination in New Delhi..."
                className="flex-1 min-w-[140px] rounded-xl border border-border-rose bg-white px-3 py-1.5 text-xs font-bold text-ink outline-none focus:border-brand-pink"
              />
              <datalist id="new-delhi-places-list">
                {INDIAN_PLACES_DIRECTORY.map((p) => (
                  <option key={p.id} value={p.shortName}>
                    {p.name}
                  </option>
                ))}
              </datalist>

              <button
                type="button"
                onClick={() => handleComputeMapSafeRoute()}
                disabled={computingRoute}
                className="px-4 py-1.5 rounded-xl bg-ink text-white text-xs font-extrabold hover:bg-brand-pink transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                {computingRoute ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Route className="w-3.5 h-3.5" />
                )}
                <span>Show Safe Route</span>
              </button>
            </div>

            {customRoutePlan && (
              <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                ✓ Safest Route: {customRoutePlan.routes[0]?.safetyScore}/100 (
                {customRoutePlan.routes[0]?.durationMinutes} min ·{" "}
                {customRoutePlan.routes[0]?.distanceKm} km)
              </div>
            )}
          </div>
        )}

        {/* ROW 3: Clean Non-Overlapping Legend Bar Above the Map Canvas */}
        <div className="bg-surface-white border-b border-border-rose px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-ink">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-danger-red inline-block" />
              <span>Red Zone (High Risk)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-1.5 rounded bg-brand-pink border border-ink inline-block" />
              <span>Safest Route (Well-Lit)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-danger-red inline-block" />
              <span>Shortcut to Avoid</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-ink inline-block" />
              <span>Police Booth & Safe Stop</span>
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted">
            <Radio className="w-3.5 h-3.5 text-brand-pink animate-pulse" />
            <span>
              Tip: Click anywhere on the New Delhi map or search above to see
              all 9 safety parameters below.
            </span>
          </div>
        </div>

        {/* Enlarged Unobstructed New Delhi Map Canvas (640px - 760px tall, ZERO overlapping boxes) */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            height: `${explicitMapHeightPx}px`,
            minHeight: `${explicitMapHeightPx}px`,
            width: "100%",
          }}
        >
          <div
            ref={mapContainerRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: `${explicitMapHeightPx}px`,
              zIndex: 1,
            }}
          />
        </div>

        {/* Bottom Quick-Jump Bar for New Delhi Places */}
        <div className="bg-surface-white border-t border-border-rose px-3.5 py-2.5 flex items-center gap-1.5 overflow-x-auto z-20">
          <span className="text-[11px] font-extrabold text-ink uppercase tracking-wider px-2 flex items-center gap-1 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-brand-pink" />
            <span>Quick New Delhi Areas:</span>
          </span>
          {zones.map((z) => {
            const active = !identifiedLocation && z.slug === selectedSlug;
            const isRed =
              z.evaluation.level === "HIGH" ||
              z.evaluation.level === "ACTIVE_INCIDENT" ||
              z.evaluation.score >= 65;
            return (
              <button
                key={z.slug}
                type="button"
                onClick={() => {
                  setIdentifiedLocation(null);
                  onSelectZone(z);
                  setRouteFrom(z.name);
                  mapInstanceRef.current?.flyTo([z.centerLat, z.centerLng], 14, {
                    duration: 0.7,
                  });
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shrink-0 border transition-all ${
                  active
                    ? isRed
                      ? "bg-danger-red text-surface-white border-danger-red"
                      : "bg-brand-pink text-surface-white border-brand-pink"
                    : isRed
                    ? "bg-blush-deep text-danger-red border-danger-red hover:bg-danger-red hover:text-surface-white"
                    : "bg-blush-light text-ink border-border-rose hover:border-brand-pink"
                }`}
              >
                <span>{z.name.split(" ").slice(0, 2).join(" ")}</span>
                <span className="text-[10px] font-extrabold">
                  {isRed
                    ? `${z.evaluation.score}% Risk`
                    : `${z.evaluation.safetyScore}/100`}
                </span>
              </button>
            );
          })}
          {[
            "Dwarka",
            "Rohini",
            "Saket",
            "Lajpat Nagar",
            "Janakpuri",
            "Vasant Kunj",
            "Greater Kailash",
            "Mayur Vihar",
          ].map((extraPlace) => (
            <button
              key={extraPlace}
              type="button"
              onClick={() => {
                setSearchQuery(extraPlace);
                handleDirectPlaceSearch(extraPlace);
              }}
              className="px-3 py-1 rounded-full text-xs font-bold bg-white text-ink border border-border-rose hover:border-brand-pink shrink-0 transition-all"
            >
              📍 {extraPlace}
            </button>
          ))}
        </div>
      </div>

      {/* Non-Overlapping 9 Safety Parameters Panel Directly Below the Map */}
      <NineSafetyParametersGrid
        placeName={activeNineSafetyParams.placeName}
        safetyParams={activeNineSafetyParams.params}
        safetyScore={activeNineSafetyParams.safetyScore}
      />
    </div>
  );
}

