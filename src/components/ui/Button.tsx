"use client";
// src/components/ui/Button.tsx
// Ultra-Premium SaaS Button component in FlowAI / Modern Linear style.

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 hover:bg-slate-800 active:bg-black text-white font-medium shadow-sm border border-slate-800 focus-visible:ring-slate-900",
  secondary:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-subtle focus-visible:ring-slate-400",
  outline:
    "bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 border border-slate-200/90 shadow-subtle focus-visible:ring-slate-400",
  destructive:
    "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium shadow-sm border border-transparent focus-visible:ring-red-500",
  ghost:
    "hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 focus-visible:ring-slate-400",
  accent:
    "bg-sky-50 hover:bg-sky-100 active:bg-sky-200 text-sky-700 border border-sky-200 font-medium shadow-subtle focus-visible:ring-sky-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 rounded-lg",
  md: "px-4 py-2 text-xs md:text-sm gap-2 rounded-xl",
  lg: "px-5 py-2.5 text-sm gap-2.5 rounded-xl font-semibold",
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
      className={`inline-flex items-center justify-center transition-all select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
