"use client";
// src/components/ui/Button.tsx
// Metro Pacific Water × HydroNode — Branded Button Component
// Primary uses MPW ocean blue (#0076A0 → #019FD7)

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outline" | "destructive" | "ghost" | "accent";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
}

// MPW brand-aligned variant styles
const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #0076A0 0%, #019FD7 100%)",
    color: "#ffffff",
    border: "1px solid #0076A0",
    boxShadow: "0 1px 3px rgba(0,118,160,0.3)",
  },
  secondary: {
    background: "#ffffff",
    color: "#2D5A7A",
    border: "1px solid #C8E5F2",
    boxShadow: "0 1px 2px rgba(0,118,160,0.06)",
  },
  outline: {
    background: "transparent",
    color: "#0076A0",
    border: "1px solid #0076A0",
  },
  destructive: {
    background: "#dc2626",
    color: "#ffffff",
    border: "1px solid transparent",
    boxShadow: "0 1px 3px rgba(220,38,38,0.3)",
  },
  ghost: {
    background: "transparent",
    color: "#2D5A7A",
    border: "1px solid transparent",
  },
  accent: {
    background: "#F3FFD1",
    color: "#4a7a00",
    border: "1px solid #A6CE38",
    boxShadow: "0 1px 2px rgba(166,206,56,0.15)",
  },
};

const variantHover: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: "linear-gradient(135deg, #005f80 0%, #0076A0 100%)" },
  secondary: { background: "#F4FAFD" },
  outline: { background: "#EEF6FA" },
  destructive: { background: "#b91c1c" },
  ghost: { background: "#EEF6FA", color: "#0076A0" },
  accent: { background: "#e8fdb0" },
};

const sizeClasses: Record<ButtonSize, string> = {
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
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [hovered, setHovered] = React.useState(false);

  const baseStyle: React.CSSProperties = {
    ...variantStyles[variant],
    ...(hovered && !disabled && !loading ? variantHover[variant] : {}),
    ...(style ?? {}),
    transition: "all 0.15s ease",
    fontWeight: variant === "primary" || variant === "destructive" ? 600 : 500,
  };

  return (
    <button
      disabled={disabled || loading}
      style={baseStyle}
      className={`inline-flex items-center justify-center select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeClasses[size]} ${className}`}
      onMouseEnter={(e) => {
        setHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        onMouseLeave?.(e);
      }}
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
