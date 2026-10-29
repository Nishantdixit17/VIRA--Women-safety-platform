"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Lock,
  FileCheck2,
  PlusCircle,
  Search,
  ShieldCheck,
  ShieldAlert,
  Paperclip,
  Download,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

interface ChainRecord {
  id: string;
  sequenceNumber: number;
  userId: string;
  eventType: string;
  placeName: string;
  summary: string;
  detailsJson: string;
  timestampIso: string;
  prevHash: string;
  currentHash: string;
}

type ReviewStatus = "PENDING" | "VERIFIED" | "REJECTED";

interface OfficerReview {
  status: ReviewStatus;
  officer: string;
  at: string;
  note: string;
}

interface BlockCheck {
  hashOk: boolean;
  linkOk: boolean;
  checkedAt: string;
}

const GENESIS =
  "0000000000000000000000000000000000000000000000000000000000000000";
const REVIEW_KEY = "vira_evidence_reviews";

const EVIDENCE_TYPES: Array<{ value: string; label: string }> = [
  { value: "INCIDENT_NOTE", label: "Case statement (police / complainant)" },
  { value: "SOS_TRIGGERED", label: "SOS alert record" },
  { value: "CCTV_FOOTAGE", label: "CCTV footage reference" },
  { value: "WITNESS_STATEMENT", label: "Witness statement" },
  { value: "VEHICLE_DETAILS", label: "Vehicle / plate details" },
  { value: "ROUTE_DEVIATION", label: "Cab or auto route deviation" },
  { value: "MISSED_CHECKIN", label: "Missed check-in" },
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

async function sha256Hex(input: string | ArrayBuffer): Promise<string> {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonical(r: ChainRecord, prevHash: string) {
  return [
    prevHash,
    String(r.sequenceNumber),
    r.userId,
    r.eventType,
    r.placeName,
    r.summary,
    r.detailsJson,
    r.timestampIso,
  ].join("|");
}

function parseDetails(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

interface Props {
  onNotify?: (message: string) => void;
}

export function AdminEvidenceSection({ onNotify }: Props) {
  const [records, setRecords] = useState<ChainRecord[]>([]); // chronological
  const [serverCheck, setServerCheck] = useState<{
    valid: boolean;
    reason: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Record<string, OfficerReview>>({});
  const [checks, setChecks] = useState<Record<string, BlockCheck>>({});
  const [verifyingAll, setVerifyingAll] = useState(false);

  // Intake form
  const [type, setType] = useState("INCIDENT_NOTE");
  const [place, setPlace] = useState("Connaught Place, New Delhi");
  const [caseRef, setCaseRef] = useState("");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number]>("MEDIUM");
  const [officer, setOfficer] = useState("");
  const [summary, setSummary] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // List controls
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [reviewFilter, setReviewFilter] = useState<"ALL" | ReviewStatus>("ALL");
  const [openId, setOpenId] = useState<string | null>(null);
  const [reviewer, setReviewer] = useState("Inspector, Delhi Police");

  const notify = useCallback(
    (m: string) => {
      onNotify?.(m);
    },
    [onNotify]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/evidence");
      const data = await res.json();
      const chrono: ChainRecord[] = (
        data.chronologicalRecords ||
        [...(data.records || [])].reverse()
      ) as ChainRecord[];
      setRecords(chrono);
      if (data.verification) {
        setServerCheck({
          valid: Boolean(data.verification.valid),
          reason: String(data.verification.reason || ""),
        });
      }
    } catch {
      // keep current
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    try {
      const raw = localStorage.getItem(REVIEW_KEY);
      if (raw) setReviews(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [load]);

  const saveReviews = (next: Record<string, OfficerReview>) => {
    setReviews(next);
    try {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const verifyBlock = useCallback(
    async (rec: ChainRecord): Promise<BlockCheck> => {
      const idx = records.findIndex((r) => r.id === rec.id);
      const expectedPrev = idx > 0 ? records[idx - 1].currentHash : GENESIS;
      const linkOk = rec.prevHash === expectedPrev;
      let hashOk = false;
      try {
        hashOk = (await sha256Hex(canonical(rec, rec.prevHash))) === rec.currentHash;
      } catch {
        hashOk = false;
      }
      return { hashOk, linkOk, checkedAt: new Date().toISOString() };
    },
    [records]
  );

  const handleVerifyOne = async (rec: ChainRecord) => {
    const result = await verifyBlock(rec);
    setChecks((c) => ({ ...c, [rec.id]: result }));
    notify(
      result.hashOk && result.linkOk
        ? `Block #${rec.sequenceNumber} is genuine: fingerprint and chain link match.`
        : `Block #${rec.sequenceNumber} FAILED the check. It may have been changed.`
    );
  };

  const handleVerifyAll = async () => {
    setVerifyingAll(true);
    await load();
    const next: Record<string, BlockCheck> = {};
    for (const rec of records) next[rec.id] = await verifyBlock(rec);
    setChecks(next);
    const bad = Object.values(next).filter((c) => !c.hashOk || !c.linkOk).length;
    setVerifyingAll(false);
    notify(
      bad === 0
        ? `All ${records.length} evidence blocks verified. Nothing has been changed.`
        : `${bad} block(s) failed verification. Review them below.`
    );
  };

  const setReview = (rec: ChainRecord, status: ReviewStatus, note = "") => {
    saveReviews({
      ...reviews,
      [rec.id]: {
        status,
        officer: reviewer.trim() || "Admin",
        at: new Date().toISOString(),
        note,
      },
    });
    notify(
      `Block #${rec.sequenceNumber} marked ${
        status === "VERIFIED" ? "VERIFIED" : status === "REJECTED" ? "REJECTED" : "PENDING"
      } by ${reviewer.trim() || "Admin"}.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (summary.trim().length < 10) {
      setFormError("Please write at least 10 characters in the summary.");
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setFormError("File is too large. Please keep it under 10 MB.");
      return;
    }
    setSaving(true);
    try {
      const details: Record<string, unknown> = {
        caseRef: caseRef.trim() || undefined,
        severity,
        recordedBy: officer.trim() || "Admin",
        source: "Admin Evidence Intake",
      };
      if (file) {
        details.attachment = {
          fileName: file.name,
          fileType: file.type || "unknown",
          fileSizeBytes: file.size,
          fileSha256: await sha256Hex(await file.arrayBuffer()),
        };
      }
      const res = await fetch("/api/evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: type,
          placeName: place.trim() || "New Delhi",
          summary: summary.trim(),
          details,
        }),
      });
      if (!res.ok) throw new Error("save failed");
      setSummary("");
      setCaseRef("");
      setFile(null);
      await load();
      notify("Evidence saved and locked with a SHA-256 fingerprint. Verify it below.");
    } catch {
      setFormError("Could not save the evidence. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const exportRecord = (rec: ChainRecord) => {
    const blob = new Blob([JSON.stringify(rec, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-block-${rec.sequenceNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const newestFirst = useMemo(() => [...records].reverse(), [records]);
  const visible = newestFirst.filter((r) => {
    const status = reviews[r.id]?.status || "PENDING";
    if (typeFilter !== "ALL" && r.eventType !== typeFilter) return false;
    if (reviewFilter !== "ALL" && status !== reviewFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const d = parseDetails(r.detailsJson);
      const hay = `${r.summary} ${r.placeName} ${r.eventType} ${String(d.caseRef || "")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    total: records.length,
    verified: records.filter((r) => reviews[r.id]?.status === "VERIFIED").length,
    rejected: records.filter((r) => reviews[r.id]?.status === "REJECTED").length,
  };
  const pending = counts.total - counts.verified - counts.rejected;

  return (
    <section className="vira-card p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-rose pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blush-deep text-brand-pink text-xs font-extrabold uppercase border border-brand-pink">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Section 5 · Evidence</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink mt-1">
            Evidence Vault
          </h2>
          <p className="text-xs text-ink-muted">
            Add evidence, find it fast, and check it was never changed.
          </p>
        </div>
        <button
          type="button"
          onClick={handleVerifyAll}
          className="vira-btn-primary px-4 py-2 text-xs font-extrabold flex items-center gap-1.5"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>{verifyingAll ? "Checking..." : "Verify All Evidence"}</span>
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: "Total", value: counts.total, tone: "text-ink" },
          { label: "Pending review", value: pending, tone: "text-ink" },
          { label: "Officer verified", value: counts.verified, tone: "text-brand-pink" },
          { label: "Rejected", value: counts.rejected, tone: "text-danger-red" },
        ].map((k) => (
          <div
            key={k.label}
            className="p-3 rounded-xl bg-blush-light border border-border-rose"
          >
            <div className={`text-2xl font-extrabold ${k.tone}`}>{k.value}</div>
            <div className="text-[11px] font-bold uppercase text-ink-muted">
              {k.label}
            </div>
          </div>
        ))}
      </div>

      {serverCheck && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
            serverCheck.valid
              ? "bg-blush-deep border-brand-pink text-ink"
              : "bg-surface-white border-danger-red text-danger-red"
          }`}
        >
          {serverCheck.valid ? (
            <ShieldCheck className="w-4 h-4 text-brand-pink shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 shrink-0" />
          )}
          <span>
            Chain status: {serverCheck.valid ? "Intact" : "Broken"}.{" "}
            {serverCheck.reason}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Intake form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-4 p-4 rounded-2xl bg-blush-light border border-border-rose space-y-3"
        >
          <div className="text-xs font-extrabold uppercase text-brand-pink flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4" />
            <span>Add New Evidence</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            >
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Case / complaint no.
              </label>
              <input
                type="text"
                value={caseRef}
                onChange={(e) => setCaseRef(e.target.value)}
                placeholder="e.g. EMG-9041"
                className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Severity
              </label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as (typeof SEVERITIES)[number])
                }
                className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Place
            </label>
            <input
              type="text"
              required
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Recorded by
            </label>
            <input
              type="text"
              value={officer}
              onChange={(e) => setOfficer(e.target.value)}
              placeholder="Officer or staff name"
              className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              What happened
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="CCTV reference, vehicle number, witness note..."
              className="w-full px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink mb-1">
              Attach a file (optional)
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-brand-pink bg-surface-white text-xs font-semibold text-ink cursor-pointer">
              <Paperclip className="w-4 h-4 text-brand-pink shrink-0" />
              <span className="truncate">
                {file ? `${file.name} (${Math.round(file.size / 1024)} KB)` : "Photo, video, PDF..."}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            <p className="text-[11px] text-ink-muted mt-1">
              Only the file&apos;s SHA-256 fingerprint is saved, so anyone can
              later prove the same file was not edited.
            </p>
          </div>

          {formError && (
            <div role="alert" className="text-xs font-bold text-danger-red">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="vira-btn-primary w-full py-2.5 text-xs font-extrabold"
          >
            {saving ? "Saving..." : "Save & Lock Evidence"}
          </button>
        </form>

        {/* List */}
        <div className="lg:col-span-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5 relative">
              <Search className="w-4 h-4 text-ink-muted absolute left-3 top-2.5" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search place, case no., words..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="sm:col-span-4 px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            >
              <option value="ALL">All types</option>
              {EVIDENCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={reviewFilter}
              onChange={(e) =>
                setReviewFilter(e.target.value as "ALL" | ReviewStatus)
              }
              className="sm:col-span-3 px-3 py-2 rounded-xl border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            >
              <option value="ALL">Any review</option>
              <option value="PENDING">Pending</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <label className="font-bold text-ink shrink-0">Reviewing as</label>
            <input
              type="text"
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="flex-1 px-3 py-1.5 rounded-lg border border-border-rose bg-surface-white text-xs font-semibold text-ink"
            />
          </div>

          {loading && (
            <div className="p-4 text-xs text-ink-muted">Loading evidence...</div>
          )}
          {!loading && visible.length === 0 && (
            <div className="p-6 rounded-2xl bg-blush-light border border-border-rose text-center text-xs text-ink-muted">
              No evidence found. Add one using the form.
            </div>
          )}

          {visible.map((rec) => {
            const review = reviews[rec.id];
            const status: ReviewStatus = review?.status || "PENDING";
            const check = checks[rec.id];
            const details = parseDetails(rec.detailsJson);
            const attachment = details.attachment as
              | { fileName?: string; fileSha256?: string; fileSizeBytes?: number }
              | undefined;
            const open = openId === rec.id;
            return (
              <div
                key={rec.id}
                className="p-4 rounded-2xl bg-surface-white border border-border-rose space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-ink text-surface-white text-[11px] font-extrabold">
                      #{rec.sequenceNumber}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-blush-deep text-brand-pink text-[11px] font-extrabold border border-border-rose">
                      {EVIDENCE_TYPES.find((t) => t.value === rec.eventType)?.label ||
                        rec.eventType}
                    </span>
                    {typeof details.severity === "string" && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-extrabold border border-border-rose text-ink">
                        {details.severity}
                      </span>
                    )}
                    {typeof details.caseRef === "string" && (
                      <span className="text-[11px] font-bold text-ink-muted">
                        Case {details.caseRef}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                      status === "VERIFIED"
                        ? "bg-blush-deep text-brand-pink border-brand-pink"
                        : status === "REJECTED"
                        ? "bg-surface-white text-danger-red border-danger-red"
                        : "bg-blush-light text-ink-muted border-border-rose"
                    }`}
                  >
                    {status === "VERIFIED" ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : status === "REJECTED" ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <Clock className="w-3 h-3" />
                    )}
                    {status === "PENDING" ? "Awaiting review" : status}
                  </span>
                </div>

                <div className="text-xs font-bold text-ink">
                  {rec.placeName} ·{" "}
                  <span className="text-ink-muted font-semibold">
                    {new Date(rec.timestampIso).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs text-ink leading-relaxed">{rec.summary}</p>

                {check && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      check.hashOk && check.linkOk
                        ? "bg-blush-deep text-ink border border-brand-pink"
                        : "bg-surface-white text-danger-red border border-danger-red"
                    }`}
                  >
                    {check.hashOk && check.linkOk ? (
                      <ShieldCheck className="w-4 h-4 text-brand-pink shrink-0" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                    )}
                    <span>
                      {check.hashOk && check.linkOk
                        ? "Genuine: fingerprint matches and the chain link is intact."
                        : `Failed: ${!check.hashOk ? "content was changed" : ""}${
                            !check.hashOk && !check.linkOk ? " and " : ""
                          }${!check.linkOk ? "chain link is broken" : ""}.`}
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyOne(rec)}
                    className="vira-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <FileCheck2 className="w-3.5 h-3.5 text-brand-pink" />
                    Check Fingerprint
                  </button>
                  <button
                    type="button"
                    onClick={() => setReview(rec, "VERIFIED")}
                    className="vira-btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Verified
                  </button>
                  <button
                    type="button"
                    onClick={() => setReview(rec, "REJECTED")}
                    className="vira-btn-secondary px-3 py-1.5 text-xs font-bold text-danger-red border-danger-red flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  {status !== "PENDING" && (
                    <button
                      type="button"
                      onClick={() => setReview(rec, "PENDING")}
                      className="text-xs font-bold text-ink-muted underline"
                    >
                      Undo
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => exportRecord(rec)}
                    className="ml-auto text-xs font-bold text-ink-muted hover:text-ink flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : rec.id)}
                    className="text-xs font-bold text-brand-pink flex items-center gap-1"
                  >
                    {open ? "Hide details" : "Details"}
                    {open ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {review && (
                  <div className="text-[11px] text-ink-muted">
                    {review.status === "VERIFIED" ? "Verified" : review.status === "REJECTED" ? "Rejected" : "Reset"} by{" "}
                    <strong className="text-ink">{review.officer}</strong> on{" "}
                    {new Date(review.at).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                )}

                {open && (
                  <div className="space-y-2">
                    {typeof details.recordedBy === "string" && (
                      <div className="text-xs text-ink">
                        Recorded by: <strong>{details.recordedBy}</strong>
                      </div>
                    )}
                    {attachment?.fileName && (
                      <div className="p-2.5 rounded-xl bg-blush-light border border-border-rose text-xs space-y-0.5 break-all">
                        <div className="font-bold text-ink flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-brand-pink" />
                          {attachment.fileName}{" "}
                          {attachment.fileSizeBytes
                            ? `(${Math.round(attachment.fileSizeBytes / 1024)} KB)`
                            : ""}
                        </div>
                        <div className="font-mono text-[10px] text-ink-muted">
                          File SHA-256: {attachment.fileSha256}
                        </div>
                      </div>
                    )}
                    <div className="p-2.5 rounded-xl bg-blush-light border border-border-rose font-mono text-[10px] text-ink-muted space-y-0.5 break-all">
                      <div>
                        <strong className="text-ink">Previous hash:</strong>{" "}
                        {rec.prevHash}
                      </div>
                      <div>
                        <strong className="text-brand-pink">This block&apos;s SHA-256:</strong>{" "}
                        {rec.currentHash}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

