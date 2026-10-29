"use client";

import React from "react";
import Link from "next/link";
import {
  Compass,
  Clock,
  ShieldCheck,
  Sparkles,
  Trash2,
  MapPin,
  Car,
  Plus,
  X,
  ArrowRight,
  Navigation,
} from "lucide-react";
import { useSafetyStore } from "@/store/useSafetyStore";
import { RiskBadge } from "@/components/ui/RiskBadge";

export function SafetyCopilotDrawer() {
  const {
    copilotDrawerOpen,
    setCopilotDrawerOpen,
    activeCopilotPlan,
    language,
    replanCopilotDelay,
    replanCopilotAddSafeHaven,
    replanCopilotSwitchToCab,
    removeCopilotStop,
    extendCopilotStop,
    setSelectedAreaSlug,
    setExternalChatPrompt,
    setPortalViewMode,
  } = useSafetyStore();

  return (
    <>
      {/* Floating Copilot Trigger Tab on Left Edge when Closed */}
      {!copilotDrawerOpen && (
        <button
          type="button"
          onClick={() => setCopilotDrawerOpen(true)}
          className="fixed left-3 md:left-6 bottom-20 md:bottom-6 z-[75] px-4 py-2.5 rounded-full bg-surface-white border-2 border-brand-pink shadow-elevated flex items-center gap-2 text-xs font-extrabold text-ink hover:bg-blush-deep transition-all"
          title="Open AI Safe Journey Copilot Timeline"
        >
          <Compass className="w-4 h-4 text-brand-pink" />
          <span>
            {language === "hi"
              ? "एआई सुरक्षा कोपायलट"
              : "AI Safe Journey Copilot"}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-brand-pink text-surface-white text-[10px] font-bold">
            {activeCopilotPlan.stops.length} Stops
          </span>
        </button>
      )}

      {/* Slide-Over Copilot Drawer */}
      {copilotDrawerOpen && (
        <aside
          aria-label="AI Safe Journey Copilot Timeline Drawer"
          className="fixed top-16 left-0 bottom-0 z-[85] w-full sm:w-[410px] bg-surface-white border-r-2 border-brand-pink shadow-elevated flex flex-col overflow-hidden"
        >
          {/* Drawer Header */}
          <div className="p-4 bg-blush-deep border-b border-border-rose space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-btn bg-brand-pink text-surface-white flex items-center justify-center font-bold">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink">
                      {language === "hi"
                        ? "एआई सुरक्षा कोपायलट"
                        : "AI Safe Journey Copilot"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-surface-white border border-brand-pink text-[10px] font-bold text-ink">
                      Score {activeCopilotPlan.overallSafetyScore}/100
                    </span>
                  </div>
                  <h2 className="text-sm font-extrabold text-ink leading-snug">
                    {language === "hi"
                      ? activeCopilotPlan.hindiTitle
                      : activeCopilotPlan.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCopilotDrawerOpen(false)}
                className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose text-xs font-bold text-ink hover:bg-blush-light flex items-center gap-1"
                aria-label="Close Copilot Drawer"
              >
                <span>← Back</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Return Deadline & Safety Buffer Bar (Ghumo India style) */}
            <div className="p-2.5 rounded-card bg-surface-white border border-border-rose flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-ink">
                <Clock className="w-3.5 h-3.5 text-brand-pink" />
                <span>
                  Safe Arrival By:{" "}
                  <strong className="font-extrabold">
                    {activeCopilotPlan.returnDeadline}
                  </strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blush-deep border border-brand-pink text-[11px] font-extrabold text-brand-pink">
                +{activeCopilotPlan.safetyBufferMinutes}m Safety Buffer
              </span>
            </div>
          </div>

          {/* 1-Tap Quick Replan Automation Bar (Directly modeled on Ghumo India's Ev drawer) */}
          <div className="p-3 bg-blush-light border-b border-border-rose space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-ink-muted uppercase tracking-wider">
              <span className="flex items-center gap-1 text-ink">
                <Sparkles className="w-3.5 h-3.5 text-brand-pink" />
                <span>
                  {language === "hi"
                    ? "1-टैप स्वचालित री-प्लान"
                    : "1-Tap Automated Safety Replan"}
                </span>
              </span>
              <span>Mode: {activeCopilotPlan.travelMode}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => replanCopilotDelay(20)}
                className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose hover:border-brand-pink hover:bg-blush-deep text-[11px] font-bold text-ink flex items-center gap-1.5 transition-colors text-left"
              >
                <Clock className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                <span>Running 20m Late</span>
              </button>

              <button
                type="button"
                onClick={replanCopilotAddSafeHaven}
                className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose hover:border-brand-pink hover:bg-blush-deep text-[11px] font-bold text-ink flex items-center gap-1.5 transition-colors text-left"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                <span>+ Add Pink PCR Stop</span>
              </button>

              <button
                type="button"
                onClick={replanCopilotSwitchToCab}
                className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose hover:border-brand-pink hover:bg-blush-deep text-[11px] font-bold text-ink flex items-center gap-1.5 transition-colors text-left"
              >
                <Car className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                <span>Switch to Verified Cab</span>
              </button>

              <button
                type="button"
                onClick={() => replanCopilotDelay(15)}
                className="px-2.5 py-1.5 rounded-btn bg-surface-white border border-border-rose hover:border-brand-pink hover:bg-blush-deep text-[11px] font-bold text-ink flex items-center gap-1.5 transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                <span>+15m Buffer Check</span>
              </button>
            </div>
          </div>

          {/* Numbered Corridor Stops Timeline */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {activeCopilotPlan.stops.map((stop) => {
              const isCurrent = stop.status === "current";
              return (
                <div
                  key={stop.id}
                  className={`p-3.5 rounded-card border transition-all space-y-2.5 ${
                    isCurrent
                      ? "bg-blush-deep border-2 border-brand-pink"
                      : "bg-surface-white border-border-rose"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-extrabold flex items-center justify-center shrink-0 ${
                          stop.status === "completed"
                            ? "bg-ink text-surface-white"
                            : isCurrent
                            ? "bg-brand-pink text-surface-white"
                            : "bg-blush-deep text-ink border border-brand-pink"
                        }`}
                      >
                        {stop.status === "completed" ? "✓" : stop.stopNumber}
                      </span>
                      <div>
                        <div className="text-[11px] font-bold text-brand-pink">
                          {stop.startTime} – {stop.endTime} (
                          {stop.durationMinutes}m)
                        </div>
                        <h3 className="text-xs sm:text-sm font-extrabold text-ink leading-snug">
                          {language === "hi" ? stop.hindiName : stop.name}
                        </h3>
                      </div>
                    </div>

                    <RiskBadge
                      level={stop.riskLevel}
                      score={stop.safetyScore}
                      compact
                    />
                  </div>

                  {/* Why This Stop Is Safe */}
                  <div className="p-2.5 rounded-btn bg-surface-white border border-border-rose text-xs space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-pink block">
                      Why This Corridor Stop Is Safe ({stop.safetyScore}/100):
                    </span>
                    <p className="text-[11px] text-ink leading-relaxed">
                      {language === "hi" ? stop.whySafeHi : stop.whySafe}
                    </p>
                  </div>

                  {/* Per-Stop Action Row */}
                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <div className="flex items-center gap-1.5">
                      {stop.areaSlug && (
                        <button
                          type="button"
                          onClick={() => {
                            if (stop.areaSlug) setSelectedAreaSlug(stop.areaSlug);
                          }}
                          className="px-2 py-1 rounded bg-blush-light border border-border-rose text-[11px] font-bold text-ink hover:bg-blush-deep flex items-center gap-1"
                        >
                          <MapPin className="w-3 h-3 text-brand-pink" />
                          <span>Focus Map</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => extendCopilotStop(stop.id, 10)}
                        className="px-2 py-1 rounded bg-blush-light border border-border-rose text-[11px] font-bold text-ink hover:bg-blush-deep"
                      >
                        +10m Stay
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setExternalChatPrompt(
                            `Explain the safety score, lighting, and nearest 24x7 safe haven for Stop #${stop.stopNumber}: ${stop.name}.`
                          );
                          setPortalViewMode("split");
                        }}
                        className="px-2 py-1 rounded bg-blush-light border border-border-rose text-[11px] font-bold text-brand-pink hover:bg-blush-deep"
                      >
                        Ask Vira AI
                      </button>
                    </div>

                    {activeCopilotPlan.stops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCopilotStop(stop.id)}
                        className="p-1 rounded text-ink-muted hover:text-danger-red"
                        title="Remove stop"
                        aria-label="Remove stop"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-3.5 bg-surface-white border-t border-border-rose space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/journey"
                onClick={() => setCopilotDrawerOpen(false)}
                className="vira-btn-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Start Live Monitor</span>
              </Link>
              <Link
                href="/planner"
                onClick={() => setCopilotDrawerOpen(false)}
                className="vira-btn-secondary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>Full Route Comparison</span>
                <ArrowRight className="w-3.5 h-3.5 text-brand-pink" />
              </Link>
            </div>
          </div>
        </aside>
      )}
    </>
  );
}
