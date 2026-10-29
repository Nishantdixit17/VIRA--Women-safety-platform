"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  EyeOff,
  Clock,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const CORRIDOR_OPTIONS = [
  {
    slug: "minto-bridge-underpass-lane",
    name: "Minto Bridge Underpass Service Corridor",
  },
  {
    slug: "hauz-khas-deer-park-approach",
    name: "Hauz Khas Village Deer Park Approach Lane",
  },
  {
    slug: "munirka-outer-ring-underpass",
    name: "Munirka Flyover Underpass & Service Stretch",
  },
  {
    slug: "nehru-place-skywalk-service-road",
    name: "Nehru Place Back Service Road & Metro Approach",
  },
  {
    slug: "north-campus-vishwavidyalaya-mall-road",
    name: "North Campus Vishwavidyalaya & Cavalry Lane",
  },
  {
    slug: "lajpat-nagar-central-market-plaza",
    name: "Lajpat Nagar Central Market Metro Corridor",
  },
  {
    slug: "connaught-place-inner-circle",
    name: "Connaught Place Inner Circle Safe Corridor",
  },
  {
    slug: "aiims-ansari-nagar-safe-corridor",
    name: "AIIMS Main Gate & Aurobindo Marg Medical Hub",
  },
];

function ReviewsContent() {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get("areaSlug") || "";

  const [reviews, setReviews] = useState<
    Array<{
      id: string;
      areaSlug: string;
      placeName: string;
      authorName: string;
      isAnonymous: boolean;
      rating: number;
      lightingRating: number;
      crowdRating: number;
      comment: string;
      timeWindow: string;
      moderationConfidence: number;
      corroborations: number;
    }>
  >([]);
  const [placeSummaries, setPlaceSummaries] = useState<
    Array<{
      areaSlug: string;
      placeName: string;
      count: number;
      avgRating: number;
      avgLighting: number;
      avgCrowd: number;
      avgModerationConfidence: number;
    }>
  >([]);

  const [selectedSlug, setSelectedSlug] = useState(
    initialSlug || CORRIDOR_OPTIONS[0].slug
  );
  const [rating, setRating] = useState(4);
  const [lightingRating, setLightingRating] = useState(4);
  const [crowdRating, setCrowdRating] = useState(4);
  const [timeWindow, setTimeWindow] = useState("21:00 - 23:00");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [comment, setComment] = useState("");
  const [toast, setToast] = useState("");

  const loadReviews = () => {
    fetch("/api/reviews")
      .then((r) => r.json())
      .then((d) => {
        if (d.reviews) setReviews(d.reviews);
        if (d.placeSummaries) setPlaceSummaries(d.placeSummaries);
      });
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const corridor =
      CORRIDOR_OPTIONS.find((c) => c.slug === selectedSlug) ||
      CORRIDOR_OPTIONS[0];
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        areaSlug: corridor.slug,
        placeName: corridor.name,
        isAnonymous,
        rating,
        lightingRating,
        crowdRating,
        timeWindow,
        comment,
      }),
    });
    if (res.ok) {
      setComment("");
      setToast(
        "Community safety review verified and incorporated into live corridor risk scoring."
      );
      loadReviews();
    }
  };

  return (
    <AppShell>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div className="vira-card p-6 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-pink">
            Corroborated Community Safety Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Community Safety Reviews & Corridor Ratings
          </h1>
          <p className="text-xs sm:text-sm text-ink-muted">
            Rate a road segment 1 to 5 for overall safety, street lighting, and
            pedestrian activity. Anonymous reporting is enabled by default.
          </p>
        </div>

        {toast && (
          <div
            role="status"
            className="p-3.5 rounded-card bg-blush-deep border border-brand-pink text-xs font-bold text-ink flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-pink" />
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

        {/* Per-Place Average Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {placeSummaries.map((ps) => (
            <div
              key={ps.areaSlug}
              className="vira-card p-4 bg-blush-light space-y-2"
            >
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="px-2 py-0.5 rounded bg-brand-pink text-surface-white">
                  Avg {ps.avgRating}/5 Safety
                </span>
                <span className="text-ink-muted">
                  Moderation Confidence: {ps.avgModerationConfidence}%
                </span>
              </div>
              <div className="text-sm font-extrabold text-ink">
                {ps.placeName}
              </div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span>Lighting: {ps.avgLighting}/5</span>
                <span>Crowd: {ps.avgCrowd}/5</span>
                <span>{ps.count} Reviews</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 5 Columns: Submit Review Form */}
          <div className="lg:col-span-5 vira-card p-6 space-y-4">
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-pink" />
              <span>Submit a Corridor Safety Review</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="rev-corridor"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Select Road Segment / Place
                </label>
                <select
                  id="rev-corridor"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-btn border border-border-rose bg-surface-white text-xs sm:text-sm font-bold text-ink"
                >
                  {CORRIDOR_OPTIONS.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 1-5 Rating Selectors */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="rev-overall"
                    className="block text-[11px] font-bold text-ink mb-1"
                  >
                    Overall (1-5)
                  </label>
                  <select
                    id="rev-overall"
                    value={rating}
                    onChange={(e) => setRating(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rev-light"
                    className="block text-[11px] font-bold text-ink mb-1"
                  >
                    Lighting (1-5)
                  </label>
                  <select
                    id="rev-light"
                    value={lightingRating}
                    onChange={(e) =>
                      setLightingRating(parseInt(e.target.value, 10))
                    }
                    className="w-full px-2.5 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="rev-crowd"
                    className="block text-[11px] font-bold text-ink mb-1"
                  >
                    Footfall (1-5)
                  </label>
                  <select
                    id="rev-crowd"
                    value={crowdRating}
                    onChange={(e) =>
                      setCrowdRating(parseInt(e.target.value, 10))
                    }
                    className="w-full px-2.5 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} / 5
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rev-window"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Time Window Observed
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-brand-pink absolute left-3 top-2.5" />
                  <select
                    id="rev-window"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-btn border border-border-rose bg-surface-white text-xs font-bold text-ink"
                  >
                    <option value="18:00 - 20:00">6:00 PM - 8:00 PM</option>
                    <option value="20:00 - 22:00">8:00 PM - 10:00 PM</option>
                    <option value="22:00 - 00:00">10:00 PM - 12:00 AM</option>
                    <option value="00:00 - 02:00">12:00 AM - 2:00 AM</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rev-comment"
                  className="block text-xs font-bold text-ink mb-1"
                >
                  Observation (Lighting, Sightlines, Safe Havens, or Concerns)
                </label>
                <textarea
                  id="rev-comment"
                  rows={3}
                  required
                  placeholder="Describe what made this corridor feel safe or risky..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 rounded-btn border border-border-rose bg-surface-white text-xs sm:text-sm text-ink"
                />
              </div>

              <label className="p-3 rounded-card bg-blush-light border border-border-rose flex items-center gap-2.5 text-xs font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-brand-pink"
                />
                <EyeOff className="w-4 h-4 text-brand-pink shrink-0" />
                <span>Post Anonymously (Protect Commuter Identity)</span>
              </label>

              <button
                type="submit"
                className="vira-btn-primary w-full py-2.5 px-4 text-sm font-bold"
              >
                Publish Verified Safety Report
              </button>
            </form>
          </div>

          {/* Right 7 Columns: Feed of Verified Reviews */}
          <div className="lg:col-span-7 space-y-3.5">
            {reviews.map((rev) => (
              <div key={rev.id} className="vira-card p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold text-ink">
                      {rev.placeName}
                    </h3>
                    <div className="text-xs text-ink-muted">
                      By {rev.authorName} · Observed {rev.timeWindow}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-blush-deep text-xs font-bold text-brand-pink border border-border-rose">
                      Safety {rev.rating}/5
                    </span>
                    <span className="px-2.5 py-1 rounded bg-blush-light text-xs font-bold text-ink border border-border-rose flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-brand-pink" />
                      Moderation Confidence {rev.moderationConfidence}%
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-ink leading-relaxed">
                  {rev.comment}
                </p>

                <div className="pt-2 border-t border-border-rose flex flex-wrap items-center justify-between text-xs text-ink-muted">
                  <span>
                    Lighting: <strong>{rev.lightingRating}/5</strong> ·
                    Footfall: <strong>{rev.crowdRating}/5</strong>
                  </span>
                  <span className="font-bold text-brand-pink">
                    {rev.corroborations} Community Corroborations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-blush-light" />}>
      <ReviewsContent />
    </Suspense>
  );
}
