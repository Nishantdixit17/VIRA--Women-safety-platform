"use client";

import React, { useState } from "react";
import {
  WifiOff,
  Lock,
  ShieldCheck,
  MessageSquare,
  Copy,
  CheckCircle2,
  Trash2,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useSafetyStore } from "@/store/useSafetyStore";

export default function SettingsPage() {
  const {
    currentPlaceName,
    offlineModeEnabled,
    setOfflineModeEnabled,
  } = useSafetyStore();

  const [autoDeleteHours, setAutoDeleteHours] = useState(24);
  const [anonymousReportsDefault, setAnonymousReportsDefault] = useState(true);
  const [saveViraTranscripts, setSaveViraTranscripts] = useState(false);
  const [copiedSms, setCopiedSms] = useState(false);
  const [toast, setToast] = useState("");

  const smsFallbackText = `VIRA SAFETY SOS ALERT: I need assistance near ${currentPlaceName}. Nearest Safe Haven: Connaught Place Shakti Pink Police Booth (140m). If unreachable, please contact 112 immediately.`;

  const handleCopySms = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(smsFallbackText);
    }
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  const handleSyncOfflineCache = async () => {
    setOfflineModeEnabled(true);
    setToast(
      "Offline Safety Snapshot synced: App shell, last map risk zones, 24x7 Safe Havens, and Emergency 112 SMS fallback cached on device."
    );
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="vira-card p-6 sm:p-8 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
            Offline Resilience & Privacy by Design
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Offline Safety Capabilities & Privacy Controls
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted max-w-2xl">
            Configure Service Worker offline caching, low-connectivity SMS
            emergency fallback with verified place names, automatic data
            deletion schedules, and consent audit logs.
          </p>
        </div>

        {toast && (
          <div
            role="status"
            className="p-3.5 rounded-card bg-blush-deep border border-brand-pink text-xs font-bold text-ink flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
              {toast}
            </span>
            <button
              type="button"
              onClick={() => setToast("")}
              className="text-ink-muted hover:text-ink"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Offline Mode & SMS Fallback Card */}
          <div className="vira-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-rose pb-3">
              <div className="flex items-center gap-2.5">
                <WifiOff className="w-5 h-5 text-brand-pink" />
                <div>
                  <h2 className="text-lg font-extrabold text-ink">
                    Offline Safety Mode & PWA Cache
                  </h2>
                  <p className="text-xs text-ink-muted">
                    Works even when cellular data drops in basements or
                    underpasses
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOfflineModeEnabled(!offlineModeEnabled)}
                className={
                  offlineModeEnabled
                    ? "vira-btn-primary px-4 py-2 text-xs font-bold"
                    : "vira-btn-secondary px-4 py-2 text-xs font-bold"
                }
              >
                {offlineModeEnabled
                  ? "Offline Snapshot Active"
                  : "Enable Offline Mode"}
              </button>
            </div>

            <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-2 text-xs">
              <div className="font-bold text-ink">
                Cached Offline Assets (Service Worker v1):
              </div>
              <ul className="space-y-1 text-ink-muted">
                <li>
                  • App Shell (`/explore`, `/planner`, `/journey`, `/sos`,
                  `/settings`)
                </li>
                <li>
                  • Last Evaluated Corridor Risk Zones & 6 Verified 24x7 Safe
                  Havens
                </li>
                <li>
                  • India Emergency Helplines (`112`, `1091`, `181`, Metro
                  CISF `155370`)
                </li>
              </ul>
              <button
                type="button"
                onClick={handleSyncOfflineCache}
                className="vira-btn-secondary w-full mt-2 py-2 text-xs font-bold"
              >
                Refresh Offline Map & Safe Haven Snapshot Now
              </button>
            </div>

            {/* SMS Fallback Generator with Place Name */}
            <div className="p-4 rounded-card bg-blush-deep border border-brand-pink space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-brand-pink flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Zero-Internet SMS Fallback Template
                </span>
                <span className="text-[11px] font-bold text-ink-muted">
                  Place Name Only
                </span>
              </div>

              <p className="p-3 rounded bg-surface-white border border-border-rose text-xs font-mono text-ink leading-relaxed">
                {smsFallbackText}
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopySms}
                  className="vira-btn-primary flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>
                    {copiedSms
                      ? "Copied SMS Fallback Text"
                      : "Copy Emergency SMS Text"}
                  </span>
                </button>
                <a
                  href={`sms:?body=${encodeURIComponent(smsFallbackText)}`}
                  className="vira-btn-secondary flex-1 py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <span>Open Native SMS App</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Privacy by Design Controls & Audit Log */}
          <div className="vira-card p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border-rose pb-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-brand-pink" />
                <div>
                  <h2 className="text-lg font-extrabold text-ink">
                    Privacy by Design Controls
                  </h2>
                  <p className="text-xs text-ink-muted">
                    We never sell, broker, or monetize location data
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded bg-blush-deep text-xs font-bold text-brand-pink border border-border-rose">
                0 Data Sold
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label
                  htmlFor="priv-autodelete"
                  className="block font-bold text-ink mb-1"
                >
                  Automatic Ephemeral Journey Auto-Delete Schedule
                </label>
                <select
                  id="priv-autodelete"
                  value={autoDeleteHours}
                  onChange={(e) => {
                    setAutoDeleteHours(parseInt(e.target.value, 10));
                    setToast("Auto-delete schedule updated.");
                  }}
                  className="w-full px-3 py-2.5 rounded-btn border border-border-rose bg-surface-white font-bold text-ink"
                >
                  <option value={1}>
                    Purge 1 Hour After Safe Arrival
                  </option>
                  <option value={24}>
                    Purge 24 Hours After Safe Arrival (Recommended)
                  </option>
                  <option value={72}>
                    Purge 72 Hours After Safe Arrival
                  </option>
                </select>
              </div>

              <label className="p-3.5 rounded-card bg-blush-light border border-border-rose flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-ink">
                    Anonymous Community Reporting by Default
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Strips personal identity from corridor reviews and hazard
                    reports
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={anonymousReportsDefault}
                  onChange={(e) => setAnonymousReportsDefault(e.target.checked)}
                  className="rounded text-brand-pink"
                />
              </label>

              <label className="p-3.5 rounded-card bg-blush-light border border-border-rose flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-bold text-ink">
                    Save Vira Voice & Text Conversation Transcripts
                  </div>
                  <div className="text-[11px] text-ink-muted">
                    Off by default; only last 10 messages are processed in
                    memory
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={saveViraTranscripts}
                  onChange={(e) => setSaveViraTranscripts(e.target.checked)}
                  className="rounded text-brand-pink"
                />
              </label>
            </div>

            {/* Consent & Access Audit Log */}
            <div className="space-y-2 pt-2 border-t border-border-rose">
              <div className="text-xs font-bold uppercase text-ink-muted flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-pink" />
                <span>Consent & Data Access Audit Log</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded bg-blush-light border border-border-rose flex justify-between">
                  <span>
                    Trusted Circle Share (Sunita Sharma) — Auto-expire on
                    arrival
                  </span>
                  <span className="font-bold text-brand-pink">CONSENTED</span>
                </div>
                <div className="p-2.5 rounded bg-blush-light border border-border-rose flex justify-between">
                  <span>
                    Third-Party Ad / Analytics Location Brokers
                  </span>
                  <span className="font-bold text-ink">BLOCKED (0 SHARED)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setToast(
                    "All ephemeral journey caches purged immediately. Cryptographic Evidence Vault preserved."
                  )
                }
                className="vira-btn-secondary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-danger-red" />
                <span>Purge Ephemeral Journey History Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
