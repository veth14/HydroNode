"use client";
// src/components/ui/Button.tsx

import React from "react";

type ButtonVariant = "primary" | "secondary" | "destructive" | "ghost" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-[0_0_16px_-3px_rgba(0,180,216,0.5)] focus-visible:ring-cyan-400",
  secondary:
    "bg-[#141c24] hover:bg-[#1a2430] text-[#c0d0e0] border border-[#1e2733] hover:border-[#2a3644] focus-visible:ring-slate-500",
  destructive:
    "bg-red-600 hover:bg-red-500 text-white font-semibold shadow-[0_0_16px_-3px_rgba(239,68,68,0.5)] focus-visible:ring-red-400",
  ghost:
    "hover:bg-[#141c24] text-[#7a8fa6] hover:text-[#e8edf2] focus-visible:ring-slate-500",
  accent:
    "bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-800/60 shadow-[0_0_12px_-3px_rgba(0,180,216,0.3)] focus-visible:ring-cyan-400",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs gap-1.5 rounded-lg",
  md: "px-3.5 py-1.5 text-xs gap-2 rounded-lg font-medium",
  lg: "px-4 py-2 text-sm gap-2 rounded-xl font-semibold",
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
      className={`inline-flex items-center justify-center transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0d12] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
