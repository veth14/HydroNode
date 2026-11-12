"use client";
// src/components/ui/Card.tsx
// Ultra-Premium Card component with diffused shadows and rounded-2xl geometry.

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hasFlutedFooter?: boolean;
}

export function Card({ children, className = "", hasFlutedFooter = false }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl shadow-premium overflow-hidden transition-all ${className}`}
    >
      {children}
      {hasFlutedFooter && (
        <div className="h-3.5 w-full pattern-fluted border-t border-slate-100 opacity-60" />
      )}
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
      className={`flex items-start justify-between gap-4 p-5 pb-4 border-b border-slate-100 ${className}`}
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
  return <div className={`p-5 ${className}`}>{children}</div>;
}
