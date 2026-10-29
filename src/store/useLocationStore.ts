"use client";

import { create } from "zustand";
import { haversineM, type LatLng } from "@/lib/location/geo";

export interface LocationFix {
  lat: number;
  lng: number;
  /** Estimated error radius in metres (smaller = more precise). */
  accuracy: number;
  heading: number | null;
  /** Speed in metres per second. */
  speed: number | null;
  timestamp: number;
  simulated?: boolean;
}

export type LocationStatus =
  | "idle"
  | "asking"
  | "granted"
  | "denied"
  | "unsupported";

interface LocationState {
  status: LocationStatus;
  fix: LocationFix | null;
  trail: LatLng[];
  errorMessage: string;
  watchId: number | null;
  simTimer: ReturnType<typeof setInterval> | null;
  start: () => void;
  stop: () => void;
  injectFix: (fix: LocationFix) => void;
  startSimulation: (path: LatLng[]) => void;
  stopSimulation: () => void;
}

/**
 * Precision filter: a 2-D Kalman-style blend that trusts each reading in
 * proportion to its reported accuracy, and drops obviously bad readings.
 */
let variance = -1; // m^2
let smoothed: { lat: number; lng: number } | null = null;

function filterFix(raw: LocationFix, prev: LocationFix | null): LocationFix | null {
  // Ignore very poor readings once we already have a decent one
  if (prev && raw.accuracy > 150 && prev.accuracy < 60 && raw.timestamp - prev.timestamp < 20000) {
    return null;
  }
  const acc = Math.max(raw.accuracy, 3);
  if (!smoothed || variance < 0) {
    smoothed = { lat: raw.lat, lng: raw.lng };
    variance = acc * acc;
    return { ...raw, accuracy: acc };
  }
  const dtSec = Math.max(0.5, (raw.timestamp - (prev?.timestamp ?? raw.timestamp)) / 1000);
  const speed = raw.speed ?? 1.4;
  variance += dtSec * Math.max(speed, 1) * Math.max(speed, 1); // process noise
  const k = variance / (variance + acc * acc);
  smoothed = {
    lat: smoothed.lat + k * (raw.lat - smoothed.lat),
    lng: smoothed.lng + k * (raw.lng - smoothed.lng),
  };
  variance = (1 - k) * variance;
  return {
    ...raw,
    lat: smoothed.lat,
    lng: smoothed.lng,
    accuracy: Math.max(3, Math.min(acc, Math.sqrt(variance))),
  };
}

export const useLocationStore = create<LocationState>((set, get) => ({
  status: "idle",
  fix: null,
  trail: [],
  errorMessage: "",
  watchId: null,
  simTimer: null,

  start: () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      set({ status: "unsupported", errorMessage: "This device has no GPS support." });
      return;
    }
    if (get().watchId !== null) return;
    set({ status: "asking", errorMessage: "" });
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        if (get().simTimer) return; // simulation in progress
        const raw: LocationFix = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
          timestamp: pos.timestamp || Date.now(),
        };
        const next = filterFix(raw, get().fix);
        if (!next) return;
        set((s) => {
          const last = s.trail[s.trail.length - 1];
          const moved = !last || haversineM(last, [next.lat, next.lng]) >= 3;
          return {
            status: "granted",
            fix: next,
            trail: moved ? [...s.trail.slice(-500), [next.lat, next.lng]] : s.trail,
          };
        });
      },
      (err) => {
        set({
          status: err.code === 1 ? "denied" : get().fix ? "granted" : "idle",
          errorMessage:
            err.code === 1
              ? "Location permission was blocked. Allow it in your browser settings."
              : "Waiting for a GPS signal...",
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );
    set({ watchId: id });
  },

  stop: () => {
    const id = get().watchId;
    if (id !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(id);
    }
    set({ watchId: null });
  },

  injectFix: (fix) =>
    set((s) => ({
      status: "granted",
      fix,
      trail: [...s.trail.slice(-500), [fix.lat, fix.lng]],
    })),

  startSimulation: (path) => {
    get().stopSimulation();
    if (path.length < 2) return;
    // Interpolate to ~10 m steps so movement looks continuous
    const pts: LatLng[] = [];
    for (let i = 0; i < path.length - 1; i++) {
      const d = haversineM(path[i], path[i + 1]);
      const steps = Math.max(1, Math.round(d / 10));
      for (let s2 = 0; s2 < steps; s2++) {
        const t = s2 / steps;
        pts.push([
          path[i][0] + (path[i + 1][0] - path[i][0]) * t,
          path[i][1] + (path[i + 1][1] - path[i][1]) * t,
        ]);
      }
    }
    pts.push(path[path.length - 1]);
    let idx = 0;
    set({ trail: [] });
    const timer = setInterval(() => {
      if (idx >= pts.length) {
        get().stopSimulation();
        return;
      }
      const p = pts[idx];
      const nxt = pts[Math.min(idx + 1, pts.length - 1)];
      get().injectFix({
        lat: p[0],
        lng: p[1],
        accuracy: 6,
        heading: null,
        speed: 5,
        timestamp: Date.now(),
        simulated: true,
      });
      void nxt;
      idx += 1;
    }, 800);
    set({ simTimer: timer });
  },

  stopSimulation: () => {
    const t = get().simTimer;
    if (t) clearInterval(t);
    set({ simTimer: null });
  },
}));

/**
 * Best available fix for an emergency: waits up to `timeoutMs` for a reading
 * that is accurate to `goodEnoughM` metres, otherwise returns the best seen.
 */
export function getPreciseFix(
  timeoutMs = 6000,
  goodEnoughM = 25
): Promise<LocationFix | null> {
  return new Promise((resolve) => {
    const store = useLocationStore.getState();
    if (store.status === "idle") store.start();
    const start = Date.now();
    const check = () => {
      const f = useLocationStore.getState().fix;
      if (f && (f.accuracy <= goodEnoughM || Date.now() - start >= timeoutMs)) {
        resolve(f);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(f);
        return;
      }
      setTimeout(check, 400);
    };
    check();
  });
}
