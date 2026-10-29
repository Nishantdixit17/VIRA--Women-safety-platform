"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PhoneCall,
  EyeOff,
  ShieldCheck,
  MapPin,
  Users,
  Lock,
  Building2,
  Keyboard,
  Volume2,
  Send,
  MessageCircle,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { SirenIcon } from "@/components/ui/SirenIcon";
import { useSafetyStore } from "@/store/useSafetyStore";
import { speakHighPrioritySosVoice } from "@/components/layout/GlobalSosOverlay";
import {
  phoneToIntl,
  useTrustedContacts,
} from "@/lib/hooks/useTrustedContacts";

export default function SosPage() {
  const {
    currentPlaceName,
    startSosCountdown,
    triggerImmediateFullSos,
    activeJourney,
  } = useSafetyStore();
  const { contacts } = useTrustedContacts();
  const [sentInfo, setSentInfo] = useState("");

  const buildDistressMessage = (mapsLink?: string) => {
    const trip =
      activeJourney.startPlaceName && activeJourney.destPlaceName
        ? ` I was travelling from ${activeJourney.startPlaceName} to ${activeJourney.destPlaceName}.`
        : "";
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `EMERGENCY! I need help. I am at ${currentPlaceName} (${time}).${trip} Please call me now. If I do not answer, call Police 112.${
      mapsLink ? ` My location: ${mapsLink}` : ""
    } - sent from VIRA Safety`;
  };

  const handleSendDistress = () => {
    if (contacts.length === 0) {
      setSentInfo("Add a trusted contact first (Trusted Circle page).");
      return;
    }
    const send = (mapsLink?: string) => {
      const msg = buildDistressMessage(mapsLink);
      const numbers = contacts.map((c) => phoneToIntl(c.phone)).join(",");
      try {
        const raw = localStorage.getItem("vira_emergency_complaints");
        const list = raw ? JSON.parse(raw) : [];
        list.unshift({
          id: `EMG-${Math.floor(1000 + Math.random() * 9000)}`,
          userName: "Ananya Sharma",
          userPhone: "+91 98110-44290",
          placeName: currentPlaceName,
          complaintType: "Distress Message to Trusted Contacts",
          description: `Distress message sent to ${contacts.length} trusted contact(s): ${contacts
            .map((c) => c.name)
            .join(", ")}.`,
          reportedAt: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          assignedStation: "New Delhi Police Control Room · PCR-02",
          status: "UNSOLVED",
          priority: "CRITICAL",
        });
        localStorage.setItem("vira_emergency_complaints", JSON.stringify(list));
      } catch {
        // ignore storage errors
      }
      fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "TRUSTED_CIRCLE_NOTIFIED",
          placeName: currentPlaceName,
          summary: `Distress message sent to ${contacts.length} trusted contact(s).`,
          details: { contacts: contacts.map((c) => c.name) },
        }),
      }).catch(() => {});
      setSentInfo(
        `Distress message ready for ${contacts.length} contact(s). Tap Send in your messages app.`
      );
      window.location.href = `sms:${numbers}?body=${encodeURIComponent(msg)}`;
    };
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) =>
          send(
            `https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`
          ),
        () => send(),
        { timeout: 2500 }
      );
    } else {
      send();
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
        <div className="vira-card p-6 sm:p-8 border-2 border-danger-red space-y-6 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blush-deep border border-danger-red text-xs font-bold uppercase tracking-wider text-danger-red">
            Emergency SOS & Police Help
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink">
            Get Immediate Help or Send a Silent Alert
          </h1>

          <p className="text-sm sm:text-base text-ink-muted max-w-2xl mx-auto">
            Press the big red SOS button to start a 5-second alarm, share your
            location with your family, and call 112 Police.
          </p>

          {/* Current Place Name Banner */}
          <div className="max-w-lg mx-auto p-3.5 rounded-card bg-blush-light border border-border-rose flex items-center justify-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-danger-red shrink-0" />
            <span className="text-ink-muted">Your Current Area:</span>
            <strong className="font-bold text-ink">{currentPlaceName}</strong>
          </div>

          {/* Primary Large SOS Siren Button */}
          <div className="py-4 flex flex-col items-center justify-center gap-4">
            <button
              type="button"
              onClick={() =>
                startSosCountdown("SOS Center Primary Beacon Activated", false)
              }
              className="group w-44 h-44 rounded-full bg-danger-red text-surface-white border-4 border-blush-deep shadow-elevated flex flex-col items-center justify-center gap-2 hover:scale-105 transition-transform"
            >
              <SirenIcon size={54} active variant="on-red" />
              <span className="text-xl font-extrabold tracking-tight">
                START SOS
              </span>
              <span className="text-[11px] font-semibold opacity-90">
                5s Cancel Countdown
              </span>
            </button>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  startSosCountdown("Silent SOS Button Activated", true)
                }
                className="vira-btn-secondary px-5 py-3 text-sm font-bold border-2 border-ink flex items-center gap-2"
              >
                <EyeOff className="w-4 h-4 text-brand-pink" />
                <span>Trigger Silent SOS (No Audio Siren)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  triggerImmediateFullSos("Zero-Delay Instant SOS", false)
                }
                className="vira-btn-danger px-5 py-3 text-sm font-bold flex items-center gap-2"
              >
                <SirenIcon size={18} active variant="on-red" />
                <span>Instant Full Alert (High Voice & Siren)</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  speakHighPrioritySosVoice(
                    `EMERGENCY S O S TRIGGERED AT ${currentPlaceName}! HIGH PRIORITY VOICE ALERT ACTIVE! CALLING POLICE 1 1 2!`
                  )
                }
                className="vira-btn-primary px-5 py-3 text-sm font-bold flex items-center gap-2"
              >
                <Volume2 className="w-4 h-4" />
                <span>Test High SOS Voice</span>
              </button>

              <a
                href="tel:112"
                className="vira-btn-danger px-5 py-3 text-sm font-bold flex items-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call 112 (ERSS India)</span>
              </a>
            </div>
          </div>
        </div>

        {/* Send distress message to trusted contacts */}
        <div className="vira-card p-5 sm:p-6 space-y-4 border-2 border-brand-pink">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-pink">
                <Send className="w-4 h-4" />
                <span>Tell My Trusted Contacts</span>
              </div>
              <h2 className="text-lg font-extrabold text-ink">
                Send Distress Message
              </h2>
              <p className="text-xs text-ink-muted">
                Sends your place and trip to all {contacts.length} trusted
                contact(s) in one tap.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSendDistress}
              className="vira-btn-danger px-5 py-3 text-sm font-bold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Send Distress Message to All</span>
            </button>
          </div>

          {sentInfo && (
            <div
              role="status"
              className="p-3 rounded-xl bg-blush-deep border border-brand-pink text-xs font-bold text-ink flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-brand-pink shrink-0" />
              {sentInfo}
            </div>
          )}

          {contacts.length === 0 ? (
            <Link
              href="/circle"
              className="inline-block text-xs font-bold text-brand-pink underline"
            >
              No trusted contacts yet. Add one →
            </Link>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contacts.map((c) => {
                const msg = buildDistressMessage();
                return (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-blush-light border border-border-rose space-y-2"
                  >
                    <div className="text-sm font-bold text-ink">
                      {c.name}{" "}
                      <span className="text-[11px] font-semibold text-ink-muted">
                        ({c.relationship}) · {c.phone}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`sms:${phoneToIntl(c.phone)}?body=${encodeURIComponent(msg)}`}
                        className="vira-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5 text-brand-pink" />
                        SMS
                      </a>
                      <a
                        href={`https://wa.me/${phoneToIntl(c.phone)}?text=${encodeURIComponent(msg)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="vira-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-brand-pink" />
                        WhatsApp
                      </a>
                      <a
                        href={`tel:${phoneToIntl(c.phone)}`}
                        className="vira-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-brand-pink" />
                        Call
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              navigator.clipboard
                ?.writeText(buildDistressMessage())
                .then(() => setSentInfo("Message copied. Paste it anywhere."))
                .catch(() => {});
            }}
            className="text-xs font-bold text-ink-muted hover:text-ink flex items-center gap-1.5"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy message
          </button>
        </div>
        {/* Silent SOS Triple-Key Instructions & Connected Response Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="vira-card p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-pink">
              <Keyboard className="w-4 h-4" />
              <span>Discreet Keyboard Shortcut</span>
            </div>
            <h2 className="text-lg font-bold text-ink">
              Triple-Key Silent SOS
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Press any key 3 times rapidly on any page (for example{" "}
              <code className="px-1.5 py-0.5 rounded bg-blush-deep font-bold text-ink">
                S - S - S
              </code>{" "}
              or{" "}
              <code className="px-1.5 py-0.5 rounded bg-blush-deep font-bold text-ink">
                Space - Space - Space
              </code>
              ) to initiate Silent SOS without audible sirens.
            </p>
          </div>

          <div className="vira-card p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-pink">
              <Users className="w-4 h-4" />
              <span>Trusted Circle Escalation</span>
            </div>
            <h2 className="text-lg font-bold text-ink">
              Automatic Circle Dispatch
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Your Trusted Circle receives your current place name (
              {currentPlaceName}), active route corridor, and nearest Safe Haven
              details immediately.
            </p>
            <Link
              href="/circle"
              className="inline-block text-xs font-bold text-brand-pink underline"
            >
              Configure Trusted Contacts →
            </Link>
          </div>

          <div className="vira-card p-5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-brand-pink">
              <Lock className="w-4 h-4" />
              <span>Admin & Police Emergency Desk</span>
            </div>
            <h2 className="text-lg font-bold text-ink">
              Sent to Admin Emergency Portal
            </h2>
            <p className="text-xs text-ink-muted leading-relaxed">
              Every SOS trigger and distress complaint is automatically sent to
              the VIRA Admin & Police Command Portal with tamper-evident
              SHA-256 evidence so authorities can track and solve your case.
            </p>
          </div>
        </div>

        {/* Official Helplines Directory */}
        <div className="vira-card p-5 sm:p-6 bg-blush-light space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-ink">
            <Building2 className="w-4 h-4 text-brand-pink" />
            <span>
              Official Emergency Helplines (Vira Complements ERSS-112 & Safe
              City)
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <a
              href="tel:112"
              className="p-3 rounded-card bg-surface-white border border-border-rose flex items-center justify-between font-bold text-ink hover:bg-blush-deep"
            >
              <span>All-India Emergency (ERSS)</span>
              <span className="text-danger-red text-sm">112</span>
            </a>
            <a
              href="tel:1091"
              className="p-3 rounded-card bg-surface-white border border-border-rose flex items-center justify-between font-bold text-ink hover:bg-blush-deep"
            >
              <span>Women Police Helpline</span>
              <span className="text-brand-pink text-sm">1091</span>
            </a>
            <a
              href="tel:181"
              className="p-3 rounded-card bg-surface-white border border-border-rose flex items-center justify-between font-bold text-ink hover:bg-blush-deep"
            >
              <span>National Women Distress Line</span>
              <span className="text-brand-pink text-sm">181</span>
            </a>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

