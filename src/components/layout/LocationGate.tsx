"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LocateFixed, X } from "lucide-react";
import { useLocationStore } from "@/store/useLocationStore";

const HIDDEN_PATHS = ["/", "/login", "/register", "/admin"];

/**
 * Asks the user for their location (once), then keeps a high-accuracy
 * GPS watch running so trips and SOS use their real, pin-point position.
 */
export function LocationGate() {
  const pathname = usePathname();
  const { status, fix, errorMessage, start } = useLocationStore();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem("vira_loc_dismissed") === "1");
    } catch {
      setDismissed(false);
    }
    // If permission was already granted earlier, start silently
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((p) => {
          if (p.state === "granted") start();
        })
        .catch(() => {});
    }
  }, [start]);

  if (HIDDEN_PATHS.includes(pathname || "/")) return null;
  if (status === "granted" && fix) return null;
  if (status === "unsupported") return null;
  if (dismissed && status !== "denied") return null;

  const denied = status === "denied";
  const asking = status === "asking";

  return (
    <div
      role="dialog"
      aria-label="Share your location"
      className="fixed left-3 right-3 bottom-3 sm:left-auto sm:right-5 sm:bottom-5 sm:w-[380px] z-[1500] vira-card p-4 border-2 border-brand-pink bg-surface-white shadow-elevated space-y-2.5"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-brand-pink text-surface-white flex items-center justify-center shrink-0">
          <LocateFixed className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-extrabold text-ink">
            {denied ? "Location is blocked" : "Share your location"}
          </div>
          <p className="text-xs text-ink-muted">
            {denied
              ? errorMessage
              : asking
              ? "Waiting for your phone to find you. Please tap Allow if asked."
              : "VIRA uses your exact position to guide your trip and send help fast in an emergency."}
          </p>
        </div>
        {!denied && (
          <button
            type="button"
            aria-label="Not now"
            onClick={() => {
              try {
                sessionStorage.setItem("vira_loc_dismissed", "1");
              } catch {
                // ignore
              }
              setDismissed(true);
            }}
            className="text-ink-muted hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {!denied && (
        <button
          type="button"
          onClick={start}
          disabled={asking}
          className="vira-btn-primary w-full py-2.5 text-sm font-bold flex items-center justify-center gap-2"
        >
          <LocateFixed className="w-4 h-4" />
          {asking ? "Finding you..." : "Allow Location"}
        </button>
      )}
    </div>
  );
}
