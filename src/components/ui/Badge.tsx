"use client";
// src/components/ui/Badge.tsx
// Refined soft pill status badges in FlowAI / Premium SaaS style.

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

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  critical: {
    container: "bg-red-50 text-red-700 border-red-200/80",
    dot: "bg-red-600",
  },
  warning: {
    container: "bg-amber-50 text-amber-800 border-amber-200/80",
    dot: "bg-amber-600",
  },
  success: {
    container: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dot: "bg-emerald-600",
  },
  info: {
    container: "bg-blue-50 text-blue-700 border-blue-200/80",
    dot: "bg-blue-600",
  },
  accent: {
    container: "bg-sky-50 text-sky-700 border-sky-200/80",
    dot: "bg-sky-600",
  },
  neutral: {
    container: "bg-slate-100 text-slate-700 border-slate-200/80",
    dot: "bg-slate-400",
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
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-0.5 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border select-none transition-colors ${styles.container} ${sizeClasses} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />}
      {children}
    </span>
  );
}
