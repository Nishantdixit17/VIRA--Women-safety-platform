"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Route,
  MessageSquare,
  Clock,
  Building2,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { NineSafetyParametersGrid } from "@/components/safety/NineSafetyParametersGrid";
import { computeNineSafetyParameters } from "@/lib/engine/places-geocoder";
import { EnrichedAreaZone } from "@/lib/repositories/zones-repo";
import { evaluateAreaRisk, formatHourLabel } from "@/lib/engine/risk-engine";

export default function PlaceSafetyDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug || "minto-bridge-underpass-lane";

  const [zone, setZone] = useState<EnrichedAreaZone | null>(null);
  const [safeHavens, setSafeHavens] = useState<
    Array<{
      id: string;
      name: string;
      category: string;
      address: string;
      openHours: string;
      contactPhone: string;
      distanceText: string;
    }>
  >([]);
  const [reviews, setReviews] = useState<
    Array<{
      id: string;
      authorName: string;
      rating: number;
      lightingRating: number;
      crowdRating: number;
      comment: string;
      timeWindow: string;
      moderationConfidence: number;
      corroborations: number;
    }>
  >([]);
  const [hour, setHour] = useState(22);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/risk?slug=${slug}&hour=${hour}`).then((r) => r.json()),
      fetch(`/api/reviews?areaSlug=${slug}`).then((r) => r.json()),
    ])
      .then(([riskData, revData]) => {
        if (riskData.zone) setZone(riskData.zone);
        if (riskData.safeHavens) setSafeHavens(riskData.safeHavens);
        if (revData.reviews) setReviews(revData.reviews);
      })
      .finally(() => setLoading(false));
  }, [slug, hour]);

  if (loading && !zone) {
    return (
      <AppShell>
        <div className="p-8 max-w-6xl mx-auto">
          <div className="vira-card p-8 text-center text-sm font-bold text-ink-muted">
            Loading Area Safety Info...
          </div>
        </div>
      </AppShell>
    );
  }

  if (!zone) {
    return (
      <AppShell>
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          <div className="vira-card p-8 text-center space-y-3">
            <h1 className="text-xl font-bold text-ink">Area Not Found</h1>
            <Link
              href="/explore"
              className="vira-btn-primary inline-flex px-4 py-2 text-sm"
            >
              Back to Safety Map
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const safetyParams = computeNineSafetyParameters(
    zone.centerLat,
    zone.centerLng,
    zone.name,
    zone.district
  );

  const hourlyCurve = [16, 18, 19, 20, 21, 22, 23, 0, 1, 2, 4, 8, 12].map(
    (h) => {
      const ev = evaluateAreaRisk(zone, { hourOfDay: h });
      return {
        time: formatHourLabel(h),
        riskScore: ev.score,
        safetyScore: ev.safetyScore,
      };
    }
  );

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/explore"
            className="vira-btn-secondary px-3.5 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Safety Map</span>
          </Link>

          <Link
            href={`/planner?dest=${encodeURIComponent(zone.name)}`}
            className="vira-btn-primary px-4 py-2 text-xs sm:text-sm font-bold inline-flex items-center gap-2"
          >
            <Route className="w-4 h-4" />
            <span>Find Safe Route Here</span>
          </Link>
        </div>

        {/* Area Overview Card */}
        <div className="vira-card p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-rose pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Area Safety Report · {zone.district}, New Delhi
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
                {zone.name}
              </h1>
              <p className="text-xs font-semibold text-ink-muted">
                Road: {zone.corridorName}
              </p>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              <RiskBadge
                level={zone.evaluation.level}
                score={zone.evaluation.score}
              />
              <span className="text-xs font-bold text-ink-muted">
                Safety Score: {zone.evaluation.safetyScore}/100
              </span>
            </div>
          </div>

          <p className="text-sm text-ink leading-relaxed">{zone.summary}</p>

          <div className="p-4 rounded-xl bg-blush-deep border border-brand-pink space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Why This Area Has This Score at {formatHourLabel(hour)}
              </span>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brand-pink" />
                <select
                  aria-label="Select Time"
                  value={hour}
                  onChange={(e) => setHour(parseInt(e.target.value, 10))}
                  className="text-xs font-bold px-2.5 py-1 rounded bg-surface-white border border-border-rose text-ink"
                >
                  {[18, 19, 20, 21, 22, 23, 0, 1, 2, 9, 14].map((h) => (
                    <option key={h} value={h}>
                      Check at {formatHourLabel(h)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-sm sm:text-base font-bold text-ink">
              {zone.evaluation.headlineReason}
            </p>
            <p className="text-xs text-ink-muted">
              <strong>Simple Safety Tip:</strong> {zone.evaluation.howToAvoid}
            </p>
          </div>
        </div>

        {/* All 9 Safety Parameters */}
        <NineSafetyParametersGrid
          placeName={zone.name}
          safetyParams={safetyParams}
          safetyScore={zone.evaluation.safetyScore}
        />

        {/* Time Chart + Main Safety Factors */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 vira-card p-6 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                Risk by Time of Day
              </span>
              <h2 className="text-lg font-bold text-ink">
                When Does Risk Increase Here?
              </h2>
              <p className="text-xs text-ink-muted">
                {zone.evaluation.whenRiskIncreases}
              </p>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyCurve}>
                  <CartesianGrid stroke="#F1D4DC" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: "#2B1B21", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "#2B1B21", fontSize: 11 }}
                  />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="riskScore"
                    name="Risk (/100)"
                    stroke="#D91E3F"
                    fill="#FDECEF"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 pt-2 border-t border-border-rose">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Recent Reports in This Area
              </h3>
              {zone.recentIncidentsSummary.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-blush-light border border-border-rose text-xs text-ink flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-brand-pink shrink-0 mt-0.5" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 vira-card p-6 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
                What Affects Safety Here
              </span>
              <h2 className="text-lg font-bold text-ink">
                Main Safety Factors & What You Can Do
              </h2>
            </div>

            <div className="space-y-2.5">
              {zone.evaluation.rankedFactors.map((f) => (
                <div
                  key={f.id}
                  className="p-3.5 rounded-xl bg-blush-light border border-border-rose space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-ink">{f.label}</span>
                    <span
                      className={
                        f.contributionScore >= 65
                          ? "text-danger-red"
                          : "text-brand-pink"
                      }
                    >
                      Risk Level: {f.contributionScore}/100
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">{f.explanation}</p>
                  <div className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-pink shrink-0" />
                    <span>Tip: {f.preventiveAction}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Police & Safe Stops + Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="vira-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-brand-pink">
                  Nearby Emergency Help
                </span>
                <h2 className="text-lg font-bold text-ink">
                  Nearest Police, Hospital & Metro
                </h2>
              </div>
              <Building2 className="w-5 h-5 text-brand-pink" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-blush-light border border-border-rose flex justify-between">
                <span className="font-bold text-ink">
                  Nearest Police: {zone.nearestPoliceName}
                </span>
                <span className="font-bold text-brand-pink">
                  {zone.nearestPoliceDistM}m away
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blush-light border border-border-rose flex justify-between">
                <span className="font-bold text-ink">
                  Nearest Hospital: {zone.nearestHospitalName}
                </span>
                <span className="font-bold text-brand-pink">
                  {zone.nearestHospitalDistM}m away
                </span>
              </div>
              <div className="p-3 rounded-xl bg-blush-light border border-border-rose flex justify-between">
                <span className="font-bold text-ink">
                  Nearest Metro / Bus: {zone.nearestTransitName}
                </span>
                <span className="font-bold text-brand-pink">
                  {zone.nearestTransitDistM}m away
                </span>
              </div>
            </div>

            {safeHavens.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold text-ink-muted uppercase">
                  24x7 Safe Places Nearby
                </div>
                {safeHavens.map((sh) => (
                  <div
                    key={sh.id}
                    className="p-3.5 rounded-xl bg-blush-deep border border-brand-pink flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-bold text-ink">{sh.name}</div>
                      <div className="text-xs text-ink-muted">
                        {sh.address} · {sh.openHours}
                      </div>
                    </div>
                    <a
                      href={`tel:${sh.contactPhone.split("/")[0].trim()}`}
                      className="vira-btn-primary px-3 py-1.5 text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Call</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="vira-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-brand-pink">
                  Local Feedback
                </span>
                <h2 className="text-lg font-bold text-ink">
                  Reviews from Women Who Travelled Here ({reviews.length})
                </h2>
              </div>
              <Link
                href={`/reviews?areaSlug=${zone.slug}`}
                className="vira-btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-brand-pink" />
                <span>Add Review</span>
              </Link>
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-ink-muted">
                No reviews yet for this road.
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-xl bg-blush-light border border-border-rose space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink">
                        {rev.authorName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-surface-white font-bold text-brand-pink border border-border-rose">
                        Rating {rev.rating}/5
                      </span>
                    </div>
                    <p className="text-xs text-ink leading-relaxed">
                      {rev.comment}
                    </p>
                    <div className="text-[11px] text-ink-muted flex justify-between">
                      <span>Time: {rev.timeWindow}</span>
                      <span>{rev.corroborations} people agreed</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
