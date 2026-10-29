"use client";

import React, { useEffect, useState } from "react";
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  FileWarning,
  CheckCircle2,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ChainVerificationResult } from "@/lib/engine/evidence-chain";

interface EvidenceBlockItem {
  id: string;
  sequenceNumber: number;
  eventType: string;
  placeName: string;
  summary: string;
  detailsJson: string;
  timestampIso: string;
  prevHash: string;
  currentHash: string;
}

export default function EvidenceVaultPage() {
  const [records, setRecords] = useState<EvidenceBlockItem[]>([]);
  const [verification, setVerification] =
    useState<ChainVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const loadVault = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/evidence");
      const data = await res.json();
      if (data.records) setRecords(data.records);
      if (data.verification) setVerification(data.verification);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVault();
  }, []);

  const handleVerifyTimeline = async () => {
    setVerifying(true);
    await loadVault();
    setTimeout(() => setVerifying(false), 300);
  };

  const handleSimulateTamper = async () => {
    setVerifying(true);
    const res = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "SIMULATE_TAMPER" }),
    });
    const data = await res.json();
    if (data.records) setRecords(data.records);
    if (data.verification) setVerification(data.verification);
    setVerifying(false);
  };

  const handleRestoreIntegrity = async () => {
    setVerifying(true);
    const res = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "RESTORE_INTEGRITY" }),
    });
    const data = await res.json();
    if (data.records) setRecords(data.records);
    if (data.verification) setVerification(data.verification);
    setVerifying(false);
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="vira-card p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-pink">
                <Lock className="w-4 h-4" />
                <span>SHA-256 Cryptographic Evidence Preservation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                Tamper-Evident Evidence Vault
              </h1>
              <p className="text-xs sm:text-sm text-ink-muted max-w-2xl">
                Every SOS trigger, silent alert, route deviation, check-in, and
                distress voice event is automatically chained using SHA-256 of
                the previous block&apos;s hash plus the canonical event payload.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleVerifyTimeline}
                disabled={verifying}
                className="vira-btn-primary px-4 py-2.5 text-xs sm:text-sm font-bold flex items-center gap-2"
              >
                <RefreshCw
                  className={`w-4 h-4 ${verifying ? "animate-spin" : ""}`}
                />
                <span>Verify Timeline Integrity</span>
              </button>

              {verification?.valid ? (
                <button
                  type="button"
                  onClick={handleSimulateTamper}
                  className="vira-btn-secondary px-3.5 py-2.5 text-xs font-bold border-danger-red text-danger-red flex items-center gap-1.5"
                >
                  <FileWarning className="w-4 h-4" />
                  <span>Simulate Tampering (Test Detector)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRestoreIntegrity}
                  className="vira-btn-secondary px-3.5 py-2.5 text-xs font-bold border-2 border-ink flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-pink" />
                  <span>Restore Valid Hash Chain</span>
                </button>
              )}
            </div>
          </div>

          {/* Verification Result Banner */}
          {verification && (
            <div
              role="status"
              className={`p-4 rounded-card border-2 flex flex-wrap items-center justify-between gap-3 ${
                verification.valid
                  ? "bg-blush-deep border-brand-pink"
                  : "bg-blush-light border-danger-red"
              }`}
            >
              <div className="flex items-start gap-3">
                {verification.valid ? (
                  <CheckCircle2 className="w-6 h-6 text-brand-pink shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-danger-red shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5">
                  <div
                    className={`text-sm font-extrabold ${
                      verification.valid ? "text-ink" : "text-danger-red"
                    }`}
                  >
                    {verification.valid
                      ? `SHA-256 Chain Intact (${verification.verifiedCount}/${verification.totalRecords} Blocks Verified)`
                      : `Tampering Detected at Block #${verification.tamperedSequenceNumber}`}
                  </div>
                  <p className="text-xs text-ink">{verification.reason}</p>
                </div>
              </div>

              <span
                className={`px-3 py-1 rounded text-xs font-extrabold uppercase border ${
                  verification.valid
                    ? "bg-surface-white text-brand-pink border-brand-pink"
                    : "bg-danger-red text-surface-white border-danger-red"
                }`}
              >
                {verification.valid ? "CRYPTOGRAPHICALLY VALID" : "HASH MISMATCH"}
              </span>
            </div>
          )}
        </div>

        {/* Hash-Chained Blocks Timeline */}
        <div className="space-y-4">
          {loading && records.length === 0 ? (
            <div className="vira-card p-8 text-center text-sm text-ink-muted">
              Loading cryptographic evidence blocks...
            </div>
          ) : (
            records.map((rec) => {
              const isTamperedBlock =
                verification &&
                !verification.valid &&
                verification.tamperedSequenceNumber === rec.sequenceNumber;
              return (
                <div
                  key={rec.id}
                  className={`vira-card p-5 space-y-3 ${
                    isTamperedBlock
                      ? "border-2 border-danger-red bg-blush-deep"
                      : "bg-surface-white"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-rose pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded bg-brand-pink text-surface-white text-xs font-extrabold">
                        Block #{rec.sequenceNumber}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-blush-light text-xs font-bold text-ink border border-border-rose">
                        {rec.eventType.replace(/_/g, " ")}
                      </span>
                      {isTamperedBlock && (
                        <span className="px-2.5 py-1 rounded bg-danger-red text-surface-white text-xs font-bold">
                          TAMPERED PAYLOAD DETECTED
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-ink-muted">
                      {new Date(rec.timestampIso).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-ink">{rec.summary}</p>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <MapPin className="w-3.5 h-3.5 text-brand-pink" />
                    <span>Verified Place Name: {rec.placeName}</span>
                  </div>

                  {/* Prev Hash & Current SHA-256 Hash */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px] font-mono">
                    <div className="p-2.5 rounded bg-blush-light border border-border-rose truncate">
                      <span className="font-sans font-bold text-ink-muted block mb-0.5">
                        Previous Block SHA-256:
                      </span>
                      <span className="text-ink">{rec.prevHash}</span>
                    </div>
                    <div className="p-2.5 rounded bg-blush-light border border-border-rose truncate">
                      <span className="font-sans font-bold text-brand-pink block mb-0.5">
                        Current Block SHA-256 Signature:
                      </span>
                      <span className="text-ink">{rec.currentHash}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}
