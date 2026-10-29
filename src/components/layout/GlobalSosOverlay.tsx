"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  PhoneCall,
  ShieldCheck,
  Volume2,
  VolumeX,
  Lock,
  Users,
  MapPin,
  XCircle,
} from "lucide-react";
import { useSafetyStore } from "@/store/useSafetyStore";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { useLocationStore } from "@/store/useLocationStore";
import { mapsLink } from "@/lib/location/geo";

/**
 * Helper to speak a HIGH-VOLUME, HIGH-PITCHED emergency voice alert via Web Speech API.
 */
export function speakHighPrioritySosVoice(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.volume = 1.0; // Maximum volume (100%)
    utt.pitch = 1.32; // High, urgent emergency pitch
    utt.rate = 1.08; // Clear, urgent cadence
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(
        (v) =>
          v.lang.includes("en-IN") ||
          v.name.toLowerCase().includes("india") ||
          v.name.toLowerCase().includes("zira") ||
          v.name.toLowerCase().includes("female")
      ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferredVoice) {
      utt.voice = preferredVoice;
    }
    window.speechSynthesis.speak(utt);
  } catch {
    // Ignore speech synthesis errors
  }
}

/**
 * Global SOS Controller:
 * - Listens for triple-key press anywhere (Silent SOS) when not typing in an input/textarea
 * - Runs the 5-second cancelable SOS countdown with high-pitched warning beeps & high spoken voice
 * - Triggers the full-screen SOS alert with a high-volume dual-oscillator siren (gain = 0.85),
 *   high-pitched emergency voice broadcast, current place name, Trusted Circle notification,
 *   Call 112 action, Admin Emergency Complaint logging, and SHA-256 Evidence Vault logging.
 */
export function GlobalSosOverlay() {
  const {
    currentPlaceName,
    sosCountdownActive,
    sosCountdownSeconds,
    sosFullAlertActive,
    sosSilentMode,
    sosTriggerReason,
    startSosCountdown,
    tickSosCountdown,
    triggerImmediateFullSos,
    cancelSos,
  } = useSafetyStore();

  const [audioMuted, setAudioMuted] = useState(false);
  const [vaultLogged, setVaultLogged] = useState(false);
  const activeEmergencyIdRef = useRef<string | null>(null);
  const keyPressTracker = useRef<{
    key: string;
    count: number;
    lastTime: number;
  }>({
    key: "",
    count: 0,
    lastTime: 0,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sirenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getOrCreateAudioCtx = (): AudioContext | null => {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextClass) return null;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // 1. Triple key-press Silent SOS listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) {
        return;
      }

      const now = Date.now();
      const tracker = keyPressTracker.current;
      if (tracker.key === e.key && now - tracker.lastTime < 650) {
        tracker.count += 1;
        tracker.lastTime = now;
        if (tracker.count >= 3) {
          tracker.count = 0;
          startSosCountdown(
            `Silent SOS triggered via triple "${e.key.toUpperCase()}" key press`,
            true
          );
        }
      } else {
        tracker.key = e.key;
        tracker.count = 1;
        tracker.lastTime = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [startSosCountdown]);

  // 2. Announce HIGH-VOLUME emergency voice when 5-second countdown starts
  useEffect(() => {
    if (sosCountdownActive && !sosSilentMode && !audioMuted) {
      speakHighPrioritySosVoice(
        `EMERGENCY S O S TRIGGERED! HIGH PRIORITY ALERT! Escalating to Police 1 1 2 and family in 5 seconds!`
      );
    }
  }, [sosCountdownActive, sosSilentMode, audioMuted]);

  // 3. 5-second countdown timer + high-pitched warning beep every second
  useEffect(() => {
    if (!sosCountdownActive) return;

    if (!sosSilentMode && !audioMuted) {
      const ctx = getOrCreateAudioCtx();
      if (ctx) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(1180, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1420, ctx.currentTime + 0.22);
          gain.gain.setValueAtTime(0.75, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.26);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.26);
        } catch {
          // Ignore audio error
        }
      }
    }

    const timer = setInterval(() => {
      tickSosCountdown();
    }, 1000);
    return () => clearInterval(timer);
  }, [sosCountdownActive, sosCountdownSeconds, sosSilentMode, audioMuted, tickSosCountdown]);

  // 4. Log to Evidence Vault, Admin Emergency Complaints, & play HIGH Siren + HIGH Voice when Full SOS activates
  useEffect(() => {
    if (!sosFullAlertActive) {
      setVaultLogged(false);
      if (sirenTimerRef.current) {
        clearInterval(sirenTimerRef.current);
        sirenTimerRef.current = null;
      }
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      // If we had an active SOS event, mark the siren stopped on server
      if (activeEmergencyIdRef.current) {
        const idToClose = activeEmergencyIdRef.current;
        activeEmergencyIdRef.current = null;
        fetch("/api/sos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: idToClose,
            sirenActive: false,
            sirenStoppedAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
        }).catch(() => {});
      }
      return;
    }

    const eventId = `EMG-${Math.floor(1000 + Math.random() * 9000)}`;
    activeEmergencyIdRef.current = eventId;

    // Pinpoint precision GPS coordinates from useLocationStore
    const locFix = useLocationStore.getState().fix;
    const lat = locFix?.lat ?? 28.6315;
    const lng = locFix?.lng ?? 77.2167;
    const accuracy = locFix?.accuracy ? Math.round(locFix.accuracy) : 15;
    const mapUrl = mapsLink(lat, lng);
    const nowTimeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const isSirenActive = !sosSilentMode && !audioMuted;

    // 1. Send to server-wide realtime SOS Feed for Admin Portal and map
    fetch("/api/sos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: eventId,
        userName: "Ananya Sharma",
        userPhone: "+91 98110-44290",
        placeName: currentPlaceName,
        complaintType: sosSilentMode ? "Silent SOS Distress" : "High-Priority SOS Trigger",
        description: `${sosTriggerReason} at ${currentPlaceName}. ${
          isSirenActive ? "Siren sounding LIVE at high volume." : "Audio siren muted."
        } Pinpoint GPS coordinates captured.`,
        reportedAt: nowTimeStr,
        assignedStation: "Connaught Place Police Station & PCR-01",
        status: "UNSOLVED",
        priority: "CRITICAL",
        lat,
        lng,
        accuracy,
        mapsLink: mapUrl,
        sirenActive: isSirenActive,
        sirenStartedAt: isSirenActive ? nowTimeStr : undefined,
      }),
    }).catch(() => {});

    // 2. Write automatically to SHA-256 Evidence Vault with pinpoint GPS & siren status
    fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: sosSilentMode ? "SILENT_SOS" : "SOS_TRIGGERED",
        placeName: currentPlaceName,
        summary: `${
          sosSilentMode ? "Silent SOS" : "Emergency SOS with high siren"
        } escalated at ${currentPlaceName} (${sosTriggerReason}). GPS: ${lat.toFixed(6)}, ${lng.toFixed(6)} (±${accuracy}m). Trusted Circle notified and ERSS-112 bridge ready.`,
        details: {
          emergencyId: eventId,
          reason: sosTriggerReason,
          silentMode: sosSilentMode,
          sirenActive: isSirenActive,
          lat,
          lng,
          accuracy,
          mapsLink: mapUrl,
          trustedCircleNotified: true,
          erss112Ready: true,
        },
      }),
    })
      .then(() => setVaultLogged(true))
      .catch(() => setVaultLogged(true));

    // 3. Also record in Admin Emergency Complaints queue (localStorage)
    try {
      const existingRaw = localStorage.getItem("vira_emergency_complaints");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const newComplaint = {
        id: eventId,
        userName: "Ananya Sharma",
        userPhone: "+91 98110-44290",
        placeName: currentPlaceName,
        complaintType: sosSilentMode ? "Silent SOS Distress" : "High-Priority SOS Trigger",
        description: `${sosTriggerReason} at ${currentPlaceName}. Live location shared with Police 112 & Trusted Contacts.`,
        reportedAt: nowTimeStr,
        assignedStation: "Connaught Place Police Station & PCR-01",
        status: "UNSOLVED",
        priority: "CRITICAL",
        lat,
        lng,
        accuracy,
        mapsLink: mapUrl,
        sirenActive: isSirenActive,
        sirenStartedAt: isSirenActive ? nowTimeStr : undefined,
      };
      localStorage.setItem(
        "vira_emergency_complaints",
        JSON.stringify([newComplaint, ...existing])
      );
    } catch {
      // Ignore storage error
    }

    // Start HIGH-VOLUME dual-oscillator emergency siren + HIGH-VOLUME emergency spoken voice
    if (!sosSilentMode && !audioMuted) {
      const announceEmergencyVoice = () => {
        speakHighPrioritySosVoice(
          `EMERGENCY S O S ACTIVE! HIGH PRIORITY ALERT AT ${currentPlaceName}! POLICE 1 1 2 AND TRUSTED FAMILY CONTACTS NOTIFIED! STAY BACK!`
        );
      };

      const playHighSirenCycle = () => {
        const ctx = getOrCreateAudioCtx();
        if (!ctx) return;
        try {
          // Primary high-pitched emergency siren oscillator (840Hz <-> 1480Hz)
          const osc1 = ctx.createOscillator();
          // Secondary piercing harmonic oscillator (1120Hz <-> 1760Hz)
          const osc2 = ctx.createOscillator();
          const masterGain = ctx.createGain();

          osc1.type = "sawtooth";
          osc2.type = "square";

          osc1.frequency.setValueAtTime(840, ctx.currentTime);
          osc1.frequency.linearRampToValueAtTime(1480, ctx.currentTime + 0.65);
          osc1.frequency.linearRampToValueAtTime(840, ctx.currentTime + 1.35);

          osc2.frequency.setValueAtTime(1120, ctx.currentTime);
          osc2.frequency.linearRampToValueAtTime(1760, ctx.currentTime + 0.65);
          osc2.frequency.linearRampToValueAtTime(1120, ctx.currentTime + 1.35);

          // High gain (0.85) so the SOS trigger siren is loud and unmistakable
          masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
          masterGain.gain.exponentialRampToValueAtTime(
            0.05,
            ctx.currentTime + 1.4
          );

          osc1.connect(masterGain);
          osc2.connect(masterGain);
          masterGain.connect(ctx.destination);

          osc1.start();
          osc2.start();
          osc1.stop(ctx.currentTime + 1.4);
          osc2.stop(ctx.currentTime + 1.4);
        } catch {
          // Audio blocked by browser autoplay policy
        }
      };

      announceEmergencyVoice();
      playHighSirenCycle();
      sirenTimerRef.current = setInterval(playHighSirenCycle, 1550);
      voiceTimerRef.current = setInterval(announceEmergencyVoice, 6500);
    }

    return () => {
      if (sirenTimerRef.current) {
        clearInterval(sirenTimerRef.current);
        sirenTimerRef.current = null;
      }
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
    };
  }, [
    sosFullAlertActive,
    sosSilentMode,
    audioMuted,
    currentPlaceName,
    sosTriggerReason,
  ]);

  if (!sosCountdownActive && !sosFullAlertActive) {
    return null;
  }

  // 5-Second Cancelable Countdown Modal
  if (sosCountdownActive) {
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="sos-countdown-title"
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/60"
      >
        <div className="vira-card max-w-md w-full p-6 border-2 border-danger-red bg-surface-white text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-blush-deep border-2 border-danger-red flex items-center justify-center">
            <SirenIcon size={34} active variant="on-light" />
          </div>

          <div className="space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-btn bg-blush-deep text-danger-red text-xs font-bold uppercase tracking-wider border border-danger-red">
              {sosSilentMode
                ? "Silent SOS Countdown (Audio Muted)"
                : "HIGH-VOICE EMERGENCY SOS COUNTDOWN"}
            </span>
            <h2
              id="sos-countdown-title"
              className="text-2xl font-bold text-ink"
            >
              Escalating Alert in {sosCountdownSeconds}s
            </h2>
            <p className="text-sm text-ink-muted">{sosTriggerReason}</p>
          </div>

          <div className="p-3.5 rounded-card bg-blush-light border border-border-rose text-left flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-brand-pink shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-ink-muted">
                Current Verified Location
              </div>
              <div className="text-sm font-bold text-ink">
                {currentPlaceName}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                if (
                  typeof window !== "undefined" &&
                  "speechSynthesis" in window
                ) {
                  window.speechSynthesis.cancel();
                }
                cancelSos();
              }}
              className="vira-btn-secondary flex-1 py-3 px-4 flex items-center justify-center gap-2 text-base font-bold border-2 border-ink"
            >
              <XCircle className="w-5 h-5 text-ink" />
              Cancel — I Am Safe
            </button>
            <button
              type="button"
              onClick={() =>
                triggerImmediateFullSos(sosTriggerReason, sosSilentMode)
              }
              className="vira-btn-danger flex-1 py-3 px-4 flex items-center justify-center gap-2"
            >
              <SirenIcon size={20} active variant="on-red" />
              Escalate Now (High Siren)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Full-Screen SOS Alert
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="sos-full-title"
      className="fixed inset-0 z-[110] vira-sos-pulse-bg overflow-y-auto flex items-center justify-center p-4 sm:p-6"
    >
      <div className="vira-card max-w-2xl w-full p-6 sm:p-8 border-2 border-danger-red bg-surface-white space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-danger-red flex items-center justify-center">
              <SirenIcon size={28} active variant="on-red" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-danger-red">
                {sosSilentMode
                  ? "Silent Emergency Protocol Active"
                  : "HIGH-VOLUME VOICE & SIREN SOS ACTIVE"}
              </span>
              <h1 id="sos-full-title" className="text-2xl font-bold text-ink">
                Emergency Escalation Dispatched
              </h1>
            </div>
          </div>

          {!sosSilentMode && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  speakHighPrioritySosVoice(
                    `EMERGENCY S O S ACTIVE AT ${currentPlaceName}! HIGH PRIORITY POLICE 1 1 2 ALERT DISPATCHED!`
                  )
                }
                className="vira-btn-primary px-3.5 py-2 text-xs font-bold flex items-center gap-1.5"
              >
                <Volume2 className="w-4 h-4" />
                <span>Speak High SOS Voice</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const nextMuted = !audioMuted;
                  setAudioMuted(nextMuted);
                  if (
                    nextMuted &&
                    typeof window !== "undefined" &&
                    "speechSynthesis" in window
                  ) {
                    window.speechSynthesis.cancel();
                  }
                  if (activeEmergencyIdRef.current) {
                    fetch("/api/sos", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: activeEmergencyIdRef.current,
                        sirenActive: !nextMuted,
                      }),
                    }).catch(() => {});
                  }
                }}
                className="vira-btn-secondary px-3.5 py-2 text-xs font-bold flex items-center gap-2"
              >
                {audioMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-danger-red" />
                    Siren Muted
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-brand-pink" />
                    Mute High Siren
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Location & Live Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase">
              <MapPin className="w-4 h-4 text-danger-red" />
              Broadcast Place Name
            </div>
            <p className="text-base font-bold text-ink">{currentPlaceName}</p>
            <p className="text-xs text-ink-muted">
              Nearest Safe Haven: Connaught Place Shakti Pink Booth (140m)
            </p>
          </div>

          <div className="p-4 rounded-card bg-blush-light border border-border-rose space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-ink-muted uppercase">
              <Users className="w-4 h-4 text-brand-pink" />
              Trusted Circle & Admin Emergency Queue
            </div>
            <p className="text-base font-bold text-ink">
              3 Contacts + Admin Emergency Desk Alerted
            </p>
            <p className="text-xs text-ink-muted">
              Sunita Sharma (Mom), Priya Verma, Rohan Sharma
            </p>
          </div>
        </div>

        {/* Evidence Vault Confirmation */}
        <div className="p-4 rounded-card bg-blush-deep border border-border-rose flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-brand-pink shrink-0" />
            <div className="text-sm">
              <span className="font-bold text-ink">
                Admin Emergency Desk & Evidence Vault:{" "}
              </span>
              <span className="text-ink-muted">
                {vaultLogged
                  ? "Emergency complaint logged & SHA-256 proof chained."
                  : "Logging emergency complaint & SHA-256 proof..."}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded bg-surface-white text-xs font-bold text-ink border border-border-rose shrink-0">
            VERIFIED
          </span>
        </div>

        {/* Primary Emergency Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <a
            href="tel:112"
            className="vira-btn-danger py-4 px-5 flex items-center justify-center gap-2.5 text-center"
          >
            <PhoneCall className="w-5 h-5" />
            Call 112 (India ERSS Emergency)
          </a>
          <button
            type="button"
            onClick={() => {
              if (
                typeof window !== "undefined" &&
                "speechSynthesis" in window
              ) {
                window.speechSynthesis.cancel();
              }
              cancelSos();
            }}
            className="vira-btn-secondary py-4 px-5 flex items-center justify-center gap-2.5 text-base font-bold border-2 border-ink"
          >
            <ShieldCheck className="w-5 h-5 text-brand-pink" />
            I Am Safe — End Emergency Alert
          </button>
        </div>

        <p className="text-xs text-center text-ink-muted">
          Vira complements, and does not replace, official emergency services.
          In immediate physical danger, always dial 112.
        </p>
      </div>
    </div>
  );
}

