"use client";
// src/components/ui/Button.tsx
// Professional industrial button component in Light Mode.
// Follows 20 Rules:
// - Emphasizes CTAs with high contrast solid colors
// - No fake glowing shadows
// - Subtle micro-interaction feedback on click (active:scale-[0.98])
// - Proper loading state spinner

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold shadow-xs border border-transparent focus-visible:ring-sky-500",
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-300 shadow-xs focus-visible:ring-slate-400",
  destructive:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold shadow-xs border border-transparent focus-visible:ring-red-500",
  ghost:
    "hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400",
  accent:
    "bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-800 border border-sky-200 font-semibold shadow-xs focus-visible:ring-sky-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1.5 rounded-md",
  md: "px-3.5 py-1.5 text-xs gap-2 rounded-lg font-medium",
  lg: "px-4 py-2 text-sm gap-2 rounded-lg font-semibold",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  icon,
  loading = false,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
