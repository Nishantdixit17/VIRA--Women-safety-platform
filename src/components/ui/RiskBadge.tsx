"use client";

import React from "react";
import {
  ShieldCheck,
  Info,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { RiskLevel, getRiskBadgeMetadata } from "@/lib/engine/risk-engine";
import { SirenIcon } from "./SirenIcon";

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  compact?: boolean;
  className?: string;
}

/**
 * The five risk levels (Low, Caution, Elevated, High, Active Incident) differ by
 * tints and shades of pink and red PLUS a distinct icon, label and outline style,
 * so meaning never depends on color alone.
 */
export function RiskBadge({
  level,
  score,
  compact = false,
  className = "",
}: RiskBadgeProps) {
  const meta = getRiskBadgeMetadata(level);

  const isDanger = level === "HIGH" || level === "ACTIVE_INCIDENT";
  const borderColor = isDanger
    ? "var(--danger-red)"
    : level === "LOW"
    ? "var(--border-rose)"
    : "var(--brand-pink)";

  const bgColor =
    level === "LOW" || level === "HIGH"
      ? "var(--bg-blush-light)"
      : "var(--bg-blush-deep)";

  const textColor = isDanger ? "var(--danger-red)" : "var(--text-ink)";

  const renderIcon = () => {
    switch (meta.iconName) {
      case "ShieldCheck":
        return <ShieldCheck className="w-4 h-4 shrink-0 text-brand-pink" />;
      case "Info":
        return <Info className="w-4 h-4 shrink-0 text-brand-pink" />;
      case "Eye":
        return <Eye className="w-4 h-4 shrink-0 text-brand-pink" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-4 h-4 shrink-0 text-danger-red" />;
      case "Siren":
        return <SirenIcon size={17} active variant="on-light" />;
    }
  };

  const shortLabels: Record<RiskLevel, string> = {
    LOW: "Low Risk",
    CAUTION: "Caution",
    ELEVATED: "Elevated Risk",
    HIGH: "High Risk",
    ACTIVE_INCIDENT: "Active Incident",
  };

  return (
    <span
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor,
        borderStyle: meta.borderStyle,
        borderWidth: `${meta.borderWidthPx}px`,
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-btn text-xs font-semibold tracking-tight ${className}`}
      title={meta.outlineDescription}
    >
      {renderIcon()}
      <span>{compact ? shortLabels[level] : meta.levelLabel}</span>
      {typeof score === "number" && (
        <span className="ml-1 px-1.5 py-0.5 rounded bg-surface-white text-ink font-bold border border-border-rose">
          {score}/100
        </span>
      )}
    </span>
  );
}
