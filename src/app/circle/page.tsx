"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Plus,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Trash2,
  Lock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useSafetyStore } from "@/store/useSafetyStore";

interface TrustedContactRecord {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email: string;
  consentWhen: "MANUAL" | "NIGHT_ONLY" | "HIGH_RISK_ZONE" | "SOS_ONLY";
  consentWhatJson: string;
  consentDurationMinutes: number;
  isActive: boolean;
  currentlySharing: boolean;
}

export default function TrustedCirclePage() {
  const { currentPlaceName } = useSafetyStore();
  const [contacts, setContacts] = useState<TrustedContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [lastAdded, setLastAdded] = useState<TrustedContactRecord | null>(null);

  // Add contact form state
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("Friend");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [consentWhen, setConsentWhen] = useState<
    "MANUAL" | "NIGHT_ONLY" | "HIGH_RISK_ZONE" | "SOS_ONLY"
  >("NIGHT_ONLY");
  const [consentDurationMinutes, setConsentDurationMinutes] = useState(45);

  const loadContacts = () => {
    setLoading(true);
    fetch("/api/circle")
      .then((r) => r.json())
      .then((d) => {
        if (d.contacts) setContacts(d.contacts);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const res = await fetch("/api/circle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        relationship,
        phone,
        email,
        consentWhen,
        consentDurationMinutes,
      }),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data?.contact) setLastAdded(data.contact as TrustedContactRecord);
      setName("");
      setPhone("+91 ");
      setEmail("");
      setToast("Trusted contact added with granular consent policy.");
      loadContacts();
    }
  };

  const handleUpdateConsent = async (
    contact: TrustedContactRecord,
    updates: Partial<{
      consentWhen: string;
      consentWhat: Record<string, boolean>;
      consentDurationMinutes: number;
      currentlySharing: boolean;
    }>
  ) => {
    const res = await fetch("/api/circle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contactId: contact.id,
        placeName: currentPlaceName,
        ...updates,
      }),
    });
    if (res.ok) {
      setToast(
        updates.currentlySharing
          ? `Temporary journey sharing activated for ${contact.name} (auto-expires on arrival).`
          : `Consent settings updated for ${contact.name}.`
      );
      loadContacts();
    }
  };

  const handleEndAllSharingOnArrival = async () => {
    const res = await fetch("/api/circle", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endAllSharingOnArrival: true,
        placeName: currentPlaceName,
      }),
    });
    if (res.ok) {
      setToast(
        "Safe arrival logged: All temporary Trusted Circle location sharing revoked automatically."
      );
      loadContacts();
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/circle?id=${id}`, { method: "DELETE" });
    loadContacts();
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="vira-card p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Consent-Based Protection · Zero Permanent Tracking
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Trusted Circle & Granular Consent Matrix
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted max-w-2xl">
                Control exactly <strong>WHO</strong> receives your journey
                status, <strong>WHEN</strong> they are notified,{" "}
                <strong>WHAT</strong> fields they see, and{" "}
                <strong>HOW LONG</strong> access lasts. Sharing always ends
                automatically upon safe arrival.
              </p>
            </div>

            <button
              type="button"
              onClick={handleEndAllSharingOnArrival}
              className="vira-btn-secondary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2 border-2 border-ink"
            >
              <ShieldCheck className="w-4 h-4 text-brand-pink" />
              <span>Simulate Safe Arrival (End All Sharing Now)</span>
            </button>
          </div>

          {toast && (
            <div
              role="status"
              className="p-3 rounded-btn bg-blush-deep border border-brand-pink text-xs font-bold text-ink flex items-center justify-between"
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
        </div>

        {/* My trusted contacts: count + details */}
        <div className="vira-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-pink text-surface-white flex items-center justify-center text-xl font-extrabold">
                {contacts.length}
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-ink">
                  My Trusted Contacts
                </h2>
                <p className="text-xs text-ink-muted">
                  {contacts.length === 0
                    ? "No contacts yet. Add one on the right."
                    : `${contacts.length} saved · ${
                        contacts.filter((c) => c.currentlySharing).length
                      } sharing your trip now`}
                </p>
              </div>
            </div>
          </div>

          {lastAdded && (
            <div
              role="status"
              className="p-3.5 rounded-card bg-blush-deep border border-brand-pink text-xs space-y-1"
            >
              <div className="font-extrabold text-brand-pink flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Just added
              </div>
              <div className="text-ink">
                <strong>{lastAdded.name}</strong> ({lastAdded.relationship}) ·{" "}
                {lastAdded.phone}
                {lastAdded.email ? ` · ${lastAdded.email}` : ""}
              </div>
              <div className="text-ink-muted">
                Total trusted contacts now: <strong>{contacts.length}</strong>
              </div>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {contacts.map((c, i) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-blush-light border border-border-rose flex items-center gap-3"
                >
                  <span className="w-8 h-8 rounded-full bg-surface-white border border-border-rose flex items-center justify-center text-xs font-extrabold text-brand-pink shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink truncate">
                      {c.name}{" "}
                      <span className="text-[11px] font-semibold text-ink-muted">
                        ({c.relationship})
                      </span>
                    </div>
                    <div className="text-xs text-ink-muted truncate">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Per-Contact Consent Cards */}
          <div className="lg:col-span-7 space-y-4">
            {loading && contacts.length === 0 ? (
              <div className="vira-card p-6 text-center text-sm text-ink-muted">
                Loading Trusted Circle contacts...
              </div>
            ) : (
              contacts.map((contact) => {
                let whatObj = {
                  location: true,
                  route: true,
                  eta: true,
                  status: true,
                };
                try {
                  whatObj = JSON.parse(contact.consentWhatJson);
                } catch {
                  // Default
                }

                return (
                  <div
                    key={contact.id}
                    className={`vira-card p-5 space-y-4 ${
                      contact.currentlySharing
                        ? "border-2 border-brand-pink bg-blush-deep"
                        : "bg-surface-white"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-rose pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-extrabold text-ink">
                            {contact.name}
                          </h2>
                          <span className="px-2 py-0.5 rounded bg-blush-light text-xs font-bold text-brand-pink border border-border-rose">
                            {contact.relationship}
                          </span>
                        </div>
                        <div className="text-xs text-ink-muted">
                          {contact.phone} · {contact.email}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateConsent(contact, {
                              currentlySharing: !contact.currentlySharing,
                            })
                          }
                          className={
                            contact.currentlySharing
                              ? "vira-btn-primary px-3.5 py-1.5 text-xs font-bold"
                              : "vira-btn-secondary px-3.5 py-1.5 text-xs font-bold"
                          }
                        >
                          {contact.currentlySharing
                            ? "Sharing Active (Tap to Revoke)"
                            : "Start Temporary Share"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(contact.id)}
                          className="p-2 rounded bg-blush-light border border-border-rose text-ink-muted hover:text-danger-red"
                          title="Remove Contact"
                          aria-label={`Remove ${contact.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* WHEN & HOW LONG Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor={`when-${contact.id}`}
                          className="block text-[11px] font-bold uppercase text-ink-muted mb-1"
                        >
                          WHEN to Share Automatically
                        </label>
                        <select
                          id={`when-${contact.id}`}
                          value={contact.consentWhen}
                          onChange={(e) =>
                            handleUpdateConsent(contact, {
                              consentWhen: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                        >
                          <option value="NIGHT_ONLY">
                            Night Journeys Only (8 PM - 5 AM)
                          </option>
                          <option value="HIGH_RISK_ZONE">
                            When Entering Elevated/High Risk Zone
                          </option>
                          <option value="SOS_ONLY">
                            Strictly on SOS / Missed Check-In Only
                          </option>
                          <option value="MANUAL">
                            Manual One-Tap Consent Only
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`dur-${contact.id}`}
                          className="block text-[11px] font-bold uppercase text-ink-muted mb-1"
                        >
                          HOW LONG (Auto-Expiry Window)
                        </label>
                        <select
                          id={`dur-${contact.id}`}
                          value={contact.consentDurationMinutes}
                          onChange={(e) =>
                            handleUpdateConsent(contact, {
                              consentDurationMinutes: parseInt(
                                e.target.value,
                                10
                              ),
                            })
                          }
                          className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                        >
                          <option value={30}>
                            30 Minutes (or Safe Arrival)
                          </option>
                          <option value={45}>
                            45 Minutes (or Safe Arrival)
                          </option>
                          <option value={60}>
                            60 Minutes (or Safe Arrival)
                          </option>
                          <option value={90}>
                            90 Minutes (or Safe Arrival)
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* WHAT Fields Checkboxes */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-bold uppercase text-ink-muted">
                        WHAT Information Is Shared (Place Names Only)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            { key: "location", label: "Live Place Name" },
                            { key: "route", label: "Selected Safe Route" },
                            { key: "eta", label: "Live Arrival ETA" },
                            { key: "status", label: "Check-In Status" },
                          ] as const
                        ).map((field) => {
                          const checked = Boolean(
                            whatObj[field.key as keyof typeof whatObj]
                          );
                          return (
                            <label
                              key={field.key}
                              className="p-2 rounded bg-surface-white border border-border-rose flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const nextWhat = {
                                    ...whatObj,
                                    [field.key]: e.target.checked,
                                  };
                                  handleUpdateConsent(contact, {
                                    consentWhat: nextWhat,
                                  });
                                }}
                                className="rounded text-brand-pink"
                              />
                              <span>{field.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right 5 Columns: Add New Trusted Contact Form */}
          <div className="lg:col-span-5 vira-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-pink" />
              <h2 className="text-lg font-extrabold text-ink">
                Add Trusted Circle Member
              </h2>
            </div>

            <form onSubmit={handleAddContact} className="space-y-3.5">
              <div>
                <label
                  htmlFor="tc-name"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Contact Full Name
                </label>
                <input
                  id="tc-name"
                  type="text"
                  required
                  placeholder="e.g. Neha Kapoor (Sister)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="tc-rel"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Relationship
                </label>
                <input
                  id="tc-rel"
                  type="text"
                  required
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="tc-phone"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Phone Number
                </label>
                <input
                  id="tc-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-sm text-ink"
                />
              </div>

              <div>
                <label
                  htmlFor="tc-when"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Default Consent Trigger (WHEN)
                </label>
                <select
                  id="tc-when"
                  value={consentWhen}
                  onChange={(e) =>
                    setConsentWhen(
                      e.target.value as
                        | "MANUAL"
                        | "NIGHT_ONLY"
                        | "HIGH_RISK_ZONE"
                        | "SOS_ONLY"
                    )
                  }
                  className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                >
                  <option value="NIGHT_ONLY">
                    Night Journeys Only (8 PM - 5 AM)
                  </option>
                  <option value="HIGH_RISK_ZONE">
                    When Entering Elevated/High Risk Zone
                  </option>
                  <option value="SOS_ONLY">Strictly on SOS Only</option>
                  <option value="MANUAL">Manual One-Tap Consent Only</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="tc-dur"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Maximum Session Duration (HOW LONG)
                </label>
                <select
                  id="tc-dur"
                  value={consentDurationMinutes}
                  onChange={(e) =>
                    setConsentDurationMinutes(parseInt(e.target.value, 10))
                  }
                  className="w-full px-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <button
                type="submit"
                className="vira-btn-primary w-full py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Save Trusted Contact</span>
              </button>
            </form>

            <div className="p-3.5 rounded-card bg-blush-light border border-border-rose text-xs text-ink-muted space-y-1">
              <div className="font-bold text-ink flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-brand-pink" />
                <span>Automatic Arrival Revocation</span>
              </div>
              <p>
                Unlike permanent family-tracking apps, Vira revokes access the
                moment your monitored journey reaches 100% or the time window
                expires.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
