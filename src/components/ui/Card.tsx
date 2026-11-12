"use client";
// src/components/ui/Card.tsx
// Clean industrial SCADA card component in Light Mode.
// Follows Rule 14: Inner radius = outer - padding.
// Outer: rounded-xl (12px), Padding: p-4 or p-5 (16px), inner elements rounded-lg (8px).

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-xs transition-shadow hover:shadow-sm ${className}`}
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
      className={`flex items-start justify-between gap-4 p-4 border-b border-slate-100 ${className}`}
    >
      <div className="space-y-0.5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-500">
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
