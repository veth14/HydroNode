"use client";
// src/components/ui/Badge.tsx
// Semantic status badge with optional dot indicator.

import React from "react";

type BadgeVariant =
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

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  critical: {
    container: "bg-red-950/60 text-red-300 border-red-900/60",
    dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
  },
  warning: {
    container: "bg-amber-950/60 text-amber-300 border-amber-900/60",
    dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]",
  },
  success: {
    container: "bg-emerald-950/50 text-emerald-300 border-emerald-900/50",
    dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
  },
  info: {
    container: "bg-blue-950/50 text-blue-300 border-blue-900/50",
    dot: "bg-blue-400",
  },
  accent: {
    container: "bg-cyan-950/50 text-cyan-300 border-cyan-800/50",
    dot: "bg-cyan-400 shadow-[0_0_6px_rgba(0,180,216,0.8)]",
  },
  neutral: {
    container: "bg-[#141c24] text-[#7a8fa6] border-[#1e2733]",
    dot: "bg-[#4a5a6e]",
  },
};

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}: BadgeProps) {
  const styles = variantStyles[variant];
  const sizeClasses =
    size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border font-mono tracking-tight select-none ${styles.container} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      {children}
    </span>
  );
}
