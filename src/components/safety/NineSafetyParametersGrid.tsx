"use client";

import React from "react";
import {
  AlertTriangle,
  Sun,
  ShieldCheck,
  Users,
  EyeOff,
  AlertOctagon,
  Building2,
  Camera,
  PhoneCall,
} from "lucide-react";
import { NineSafetyParameters } from "@/lib/engine/places-geocoder";

interface NineSafetyParametersGridProps {
  placeName: string;
  safetyParams: NineSafetyParameters;
  safetyScore?: number;
  compact?: boolean;
}

export function NineSafetyParametersGrid({
  placeName,
  safetyParams,
  safetyScore,
}: NineSafetyParametersGridProps) {
  const effectiveScore = safetyScore ?? safetyParams.overallSafetyScore;

  const items = [
    {
      key: "pre-harassment",
      number: "1",
      title: "Pre-harassment history",
      value: `${safetyParams.preHarassmentHistory.status} — ${safetyParams.preHarassmentHistory.detail}`,
      status:
        safetyParams.preHarassmentHistory.safeScore < 45
          ? "danger"
          : safetyParams.preHarassmentHistory.safeScore < 72
          ? "warn"
          : "safe",
      icon: AlertTriangle,
      simpleMeaning: "Past complaints reported in this area",
    },
    {
      key: "lighting",
      number: "2",
      title: "Lighting",
      value: safetyParams.lighting.status,
      status:
        safetyParams.lighting.score < 50
          ? "danger"
          : safetyParams.lighting.score < 72
          ? "warn"
          : "safe",
      icon: Sun,
      simpleMeaning: "Working streetlights on the road",
    },
    {
      key: "security",
      number: "3",
      title: "Security",
      value: safetyParams.security.status,
      status:
        safetyParams.security.score < 50
          ? "danger"
          : safetyParams.security.score < 72
          ? "warn"
          : "safe",
      icon: ShieldCheck,
      simpleMeaning: "Police patrol & guards nearby",
    },
    {
      key: "footfall",
      number: "4",
      title: "Footfall",
      value: safetyParams.footfall.status,
      status:
        safetyParams.footfall.score < 45
          ? "danger"
          : safetyParams.footfall.score < 68
          ? "warn"
          : "safe",
      icon: Users,
      simpleMeaning: "How many people walk here",
    },
    {
      key: "stalking",
      number: "5",
      title: "Stalking",
      value: `${safetyParams.stalking.status} — ${safetyParams.stalking.detail}`,
      status:
        safetyParams.stalking.safeScore < 45
          ? "danger"
          : safetyParams.stalking.safeScore < 72
          ? "warn"
          : "safe",
      icon: EyeOff,
      simpleMeaning: "Reported following or staring cases",
    },
    {
      key: "suspicious",
      number: "6",
      title: "Suspicious activity",
      value: `${safetyParams.suspiciousActivity.status} — ${safetyParams.suspiciousActivity.detail}`,
      status:
        safetyParams.suspiciousActivity.safeScore < 45
          ? "danger"
          : safetyParams.suspiciousActivity.safeScore < 72
          ? "warn"
          : "safe",
      icon: AlertOctagon,
      simpleMeaning: "Dark corners or loitering spots",
    },
    {
      key: "density",
      number: "7",
      title: "Area density",
      value: safetyParams.areaDensity.status,
      status:
        safetyParams.areaDensity.score < 45
          ? "danger"
          : safetyParams.areaDensity.score < 70
          ? "warn"
          : "safe",
      icon: Building2,
      simpleMeaning: "Open shops & homes vs empty road",
    },
    {
      key: "cctv",
      number: "8",
      title: "CCTV present",
      value: safetyParams.cctvPresent.status,
      status:
        safetyParams.cctvPresent.score < 50
          ? "danger"
          : safetyParams.cctvPresent.score < 72
          ? "warn"
          : "safe",
      icon: Camera,
      simpleMeaning: "Working security cameras",
    },
    {
      key: "police",
      number: "9",
      title: "Nearest police stations",
      value: `${safetyParams.nearestPoliceStation.name} (${safetyParams.nearestPoliceStation.distanceText} · Call ${safetyParams.nearestPoliceStation.phone})`,
      status: "safe",
      icon: PhoneCall,
      simpleMeaning: "Closest police help & distance",
    },
  ];

  return (
    <div className="rounded-2xl border border-[#EA8A9A]/35 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#EA8A9A]/20 pb-2.5">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#C84B62]">
            All 9 Safety Parameters
          </span>
          <h3 className="text-base font-bold text-[#2D1418]">
            {placeName} — Simple Safety Check
          </h3>
        </div>
        <span
          className={`rounded-xl px-3 py-1 text-xs font-extrabold ${
            effectiveScore >= 70
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : effectiveScore >= 45
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          Overall Safety: {effectiveScore}/100 ({safetyParams.overallStatus})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {items.map((item) => {
          const Icon = item.icon;
          const badgeStyle =
            item.status === "danger"
              ? "border-red-200 bg-red-50/70 text-red-900"
              : item.status === "warn"
              ? "border-amber-200 bg-amber-50/70 text-amber-900"
              : "border-emerald-200 bg-emerald-50/60 text-emerald-900";

          const iconColor =
            item.status === "danger"
              ? "text-red-600 bg-red-100"
              : item.status === "warn"
              ? "text-amber-700 bg-amber-100"
              : "text-emerald-700 bg-emerald-100";

          return (
            <div
              key={item.key}
              className={`rounded-xl border p-3 transition-all ${badgeStyle}`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconColor}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold uppercase tracking-wide">
                    {item.number}. {item.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-snug">
                    {item.value}
                  </p>
                  <p className="mt-0.5 text-[11px] opacity-75">
                    {item.simpleMeaning}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
