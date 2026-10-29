"use client";

import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair } from "lucide-react";
import type { LocationFix } from "@/store/useLocationStore";
import { nearestOnPolyline, type LatLng } from "@/lib/location/geo";

export interface SosMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  active: boolean;
}

interface Props {
  /** Planned safest route from Safe Routes (start → destination). */
  route: LatLng[];
  startLabel: string;
  destLabel: string;
  travelMode: "WALK" | "CAB" | "METRO" | "AUTO";
  fix: LocationFix | null;
  trail: LatLng[];
  sosMarkers: SosMarker[];
  heightClass?: string;
  onRoadPathChange?: (path: LatLng[] | null) => void;
}

const STREETS =
  "https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}";
const OSM = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

async function fetchRoadPath(
  from: LatLng,
  to: LatLng,
  mode: Props["travelMode"]
): Promise<LatLng[] | null> {
  const base =
    mode === "WALK"
      ? "https://routing.openstreetmap.de/routed-foot/route/v1/foot/"
      : "https://router.project-osrm.org/route/v1/driving/";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    const res = await fetch(
      `${base}${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates;
    if (Array.isArray(coords) && coords.length > 1) {
      return coords.map((c: [number, number]) => [c[1], c[0]] as LatLng);
    }
  } catch {
    // offline: caller falls back to the planned route
  }
  clearTimeout(timer);
  return null;
}

export default function LiveTripMap({
  route,
  startLabel,
  destLabel,
  travelMode,
  fix,
  trail,
  sosMarkers,
  heightClass = "h-[420px] sm:h-[520px]",
  onRoadPathChange,
}: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeLayer = useRef<L.LayerGroup | null>(null);
  const liveLayer = useRef<L.LayerGroup | null>(null);
  const sosLayer = useRef<L.LayerGroup | null>(null);
  const followRef = useRef(true);
  const [follow, setFollow] = useState(true);
  const [roadPath, setRoadPath] = useState<LatLng[] | null>(null);
  const lastFetch = useRef<{ at: number; from: LatLng | null }>({
    at: 0,
    from: null,
  });
  const fittedRef = useRef(false);

  // Create map once
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const map = L.map(elRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView(route[0] || [28.6139, 77.209], 14);
    const tiles = L.tileLayer(STREETS, { maxZoom: 20 });
    let swapped = false;
    tiles.on("tileerror", () => {
      if (!swapped) {
        swapped = true;
        tiles.setUrl(OSM);
      }
    });
    tiles.addTo(map);
    routeLayer.current = L.layerGroup().addTo(map);
    sosLayer.current = L.layerGroup().addTo(map);
    liveLayer.current = L.layerGroup().addTo(map);
    map.on("dragstart", () => {
      followRef.current = false;
      setFollow(false);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 150);
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch a real road path from the user's position to the destination
  useEffect(() => {
    if (!fix || route.length < 2) return;
    const dest = route[route.length - 1];
    const here: LatLng = [fix.lat, fix.lng];
    const now = Date.now();
    const prev = lastFetch.current;
    const movedFar =
      !prev.from ||
      L.latLng(prev.from).distanceTo(L.latLng(here)) > 150;
    if (prev.at && now - prev.at < 20000 && !movedFar) return;
    lastFetch.current = { at: now, from: here };
    fetchRoadPath(here, dest, travelMode).then((p) => {
      setRoadPath(p);
      onRoadPathChange?.(p);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix?.lat, fix?.lng, route, travelMode]);

  // Planned route + destination
  useEffect(() => {
    const layer = routeLayer.current;
    const map = mapRef.current;
    if (!layer || !map || route.length < 2) return;
    layer.clearLayers();

    L.polyline(route, { color: "#FFFFFF", weight: 12, opacity: 0.95, lineCap: "round" }).addTo(layer);
    L.polyline(route, {
      color: "#E64A7B",
      weight: 6,
      opacity: 0.85,
      dashArray: roadPath ? "2 10" : undefined,
      lineCap: "round",
    }).addTo(layer);

    if (roadPath && roadPath.length > 1) {
      // Google-Maps style blue road path from the user to the destination
      L.polyline(roadPath, { color: "#FFFFFF", weight: 12, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(layer);
      L.polyline(roadPath, { color: "#1A73E8", weight: 7, opacity: 1, lineCap: "round", lineJoin: "round" }).addTo(layer);
    }

    const start = route[0];
    const end = route[route.length - 1];
    L.circleMarker(start, { radius: 9, color: "#fff", weight: 3, fillColor: "#16A34A", fillOpacity: 1 })
      .bindTooltip(`Start: ${startLabel}`)
      .addTo(layer);
    L.marker(end, {
      icon: L.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        html: `<div style="width:34px;height:34px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#D91E3F;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>`,
      }),
    })
      .bindTooltip(`Destination: ${destLabel}`, { permanent: true, direction: "top", offset: [0, -30] })
      .addTo(layer);

    if (!fittedRef.current) {
      fittedRef.current = true;
      map.fitBounds(L.latLngBounds(route), { padding: [50, 50], maxZoom: 16 });
    }
  }, [route, roadPath, startLabel, destLabel]);

  // Live position, accuracy circle, heading and trail
  useEffect(() => {
    const layer = liveLayer.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();
    if (trail.length > 1) {
      L.polyline(trail, { color: "#1A73E8", weight: 4, opacity: 0.55, dashArray: "1 7", lineCap: "round" }).addTo(layer);
    }
    if (!fix) return;
    const here: LatLng = [fix.lat, fix.lng];
    L.circle(here, {
      radius: Math.max(fix.accuracy, 3),
      color: "#1A73E8",
      weight: 1,
      fillColor: "#1A73E8",
      fillOpacity: 0.14,
    }).addTo(layer);
    const rot = fix.heading ?? 0;
    L.marker(here, {
      zIndexOffset: 2000,
      icon: L.divIcon({
        className: "",
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        html: `<div style="position:relative;width:44px;height:44px;">
          ${fix.heading !== null ? `<div style="position:absolute;inset:0;transform:rotate(${rot}deg);"><div style="position:absolute;left:14px;top:-4px;width:0;height:0;border-left:8px solid transparent;border-right:8px solid transparent;border-bottom:16px solid #1A73E8;opacity:.9"></div></div>` : ""}
          <div style="position:absolute;left:11px;top:11px;width:22px;height:22px;border-radius:50%;background:#1A73E8;border:4px solid #fff;box-shadow:0 0 0 3px rgba(26,115,232,.35),0 2px 8px rgba(0,0,0,.45);"></div>
        </div>`,
      }),
    })
      .bindTooltip(
        `You · accurate to ±${Math.round(fix.accuracy)} m${fix.simulated ? " (demo GPS)" : ""}`
      )
      .addTo(layer);

    if (followRef.current) {
      const zoom = Math.max(map.getZoom(), 17);
      map.setView(here, zoom, { animate: true });
    }
  }, [fix, trail]);

  // SOS trigger locations
  useEffect(() => {
    const layer = sosLayer.current;
    if (!layer) return;
    layer.clearLayers();
    sosMarkers.forEach((m) => {
      L.marker([m.lat, m.lng], {
        zIndexOffset: 1800,
        icon: L.divIcon({
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          html: `<div style="width:40px;height:40px;border-radius:50%;background:#D91E3F;border:3px solid #fff;color:#fff;font-weight:900;font-size:11px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 ${m.active ? 8 : 3}px rgba(217,30,63,.35);">SOS</div>`,
        }),
      })
        .bindPopup(`<strong>${m.label}</strong><br/>${m.lat.toFixed(6)}, ${m.lng.toFixed(6)}`)
        .addTo(layer);
    });
  }, [sosMarkers]);

  const recenter = () => {
    followRef.current = true;
    setFollow(true);
    const map = mapRef.current;
    if (map && fix) map.setView([fix.lat, fix.lng], Math.max(map.getZoom(), 17), { animate: true });
  };

  // Keep nearestOnPolyline referenced for tree-shaking-safe import
  void nearestOnPolyline;

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-border-rose">
      <div ref={elRef} className={`w-full ${heightClass}`} />
      <button
        type="button"
        onClick={recenter}
        className={`absolute right-3 bottom-3 z-[1000] px-3 py-2 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-elevated border-2 ${
          follow
            ? "bg-brand-pink text-surface-white border-brand-pink"
            : "bg-surface-white text-ink border-border-rose"
        }`}
      >
        <Crosshair className="w-4 h-4" />
        {follow ? "Following you" : "Re-centre on me"}
      </button>
    </div>
  );
}

