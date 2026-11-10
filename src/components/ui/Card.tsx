"use client";
// src/components/ui/Card.tsx
// Industrial SCADA card component.
// Follows Rule 14: Inner radius = outer - padding.
// Outer: rounded-xl (12px), Padding: p-4 or p-5 (16-20px), inner elements rounded-lg (8px).

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = "", glow = false }: CardProps) {
  return (
    <div
      className={`bg-[#0f1419] border border-[#1e2733] rounded-xl transition-all ${
        glow ? "shadow-[0_0_24px_-6px_rgba(0,180,216,0.25)] border-[#00b4d840]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 p-4 border-b border-[#1e2733] ${className}`}
    >
      <div className="space-y-0.5 min-w-0">
        <h3 className="text-sm font-semibold text-[#e8edf2] tracking-tight truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-[#7a8fa6]">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardContent({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}
