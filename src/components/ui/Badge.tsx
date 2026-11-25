"use client";
// src/components/ui/Badge.tsx
// Metro Pacific Water × HydroNode — Branded Status Badges
// Primary accent: #0076A0 / #019FD7 (ocean blue), #A6CE38 (lime green)

import React from "react";

export type BadgeVariant =
  | "critical"
  | "warning"
  | "success"
  | "info"
  | "neutral"
  | "accent";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties & { dot: React.CSSProperties }> = {
  critical: {
    background: "#fef2f2",
    color: "#b91c1c",
    border: "1px solid rgba(252,165,165,0.8)",
    dot: { background: "#dc2626" },
  },
  warning: {
    background: "#fefce8",
    color: "#a16207",
    border: "1px solid rgba(253,230,138,0.8)",
    dot: { background: "#ca8a04" },
  },
  success: {
    background: "#f0fdf4",
    color: "#15803d",
    border: "1px solid rgba(134,239,172,0.8)",
    dot: { background: "#22c55e" },
  },
  // MPW ocean blue for "info"
  info: {
    background: "#DFF5FF",
    color: "#0076A0",
    border: "1px solid rgba(171,224,249,0.8)",
    dot: { background: "#019FD7" },
  },
  // MPW ocean blue for "accent" (primary brand color)
  accent: {
    background: "#DFF5FF",
    color: "#0076A0",
    border: "1px solid #ABE0F9",
    dot: { background: "#019FD7" },
  },
  neutral: {
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid rgba(226,232,240,0.8)",
    dot: { background: "#94a3b8" },
  },
};

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  const { dot: dotStyle, ...containerStyle } = variantStyles[variant];
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full select-none ${sizeClasses} ${className}`}
      style={containerStyle}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={dotStyle}
        />
      )}
      {children}
    </span>
  );
}
