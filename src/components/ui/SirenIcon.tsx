"use client";

import React from "react";

interface SirenIconProps {
  size?: number;
  active?: boolean;
  variant?: "on-red" | "on-light";
  className?: string;
}

/**
 * Custom animated SirenIcon (SVG):
 * Beacon dome with a slow sweeping highlight and two expanding rings,
 * calm when idle, active on hover and during alerts. Appears on every SOS button.
 */
export function SirenIcon({
  size = 22,
  active = false,
  variant = "on-red",
  className = "",
}: SirenIconProps) {
  const strokeColor =
    variant === "on-red" ? "var(--surface-white)" : "var(--danger-red)";
  const domeFill =
    variant === "on-red" ? "var(--surface-white)" : "var(--danger-red)";
  const sweepColor =
    variant === "on-red" ? "var(--bg-blush-deep)" : "var(--surface-white)";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 group-hover:scale-105 transition-transform ${className}`}
      aria-hidden="true"
    >
      {/* Expanding Ring 1 */}
      <circle
        cx="16"
        cy="15"
        r="11"
        stroke={strokeColor}
        strokeWidth="1.4"
        className={
          active
            ? "siren-ring-a-active"
            : "siren-ring-a-idle group-hover:siren-ring-a-active"
        }
      />

      {/* Expanding Ring 2 */}
      <circle
        cx="16"
        cy="15"
        r="13.5"
        stroke={strokeColor}
        strokeWidth="1.1"
        strokeDasharray="3 2"
        className={
          active
            ? "siren-ring-b-active"
            : "siren-ring-b-idle group-hover:siren-ring-b-active"
        }
      />

      {/* Top radiating beacon rays */}
      <path
        d="M16 3.5V6M8.5 6.8L10.3 8.6M23.5 6.8L21.7 8.6"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Beacon Dome */}
      <path
        d="M10 19V14.5C10 11.1863 12.6863 8.5 16 8.5C19.3137 8.5 22 11.1863 22 14.5V19H10Z"
        fill={domeFill}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />

      {/* Sweeping internal highlight */}
      <path
        d="M13.5 17.5V14.2C13.5 12.6 14.6 11.3 16 11.3"
        stroke={sweepColor}
        strokeWidth="2.2"
        strokeLinecap="round"
        className={active ? "siren-sweep-active" : "siren-sweep-idle"}
      />

      {/* Siren Pedestal Base */}
      <rect
        x="8"
        y="19.5"
        width="16"
        height="4"
        rx="2"
        fill={domeFill}
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      <path
        d="M6.5 25.5H25.5"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
