"use client";
// src/components/ui/Card.tsx
// Premium Card with richer shadow layering, fluted footer, and inset highlight.

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hasFlutedFooter?: boolean;
}

export function Card({ children, className = "", hasFlutedFooter = false }: CardProps) {
  return (
    <div
      className={`relative bg-white border border-slate-200/80 rounded-2xl overflow-hidden transition-all duration-200
        shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.05),0_8px_24px_rgba(0,0,0,0.04)]
        ${className}`}
    >
      {/* Inset top highlight line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none" />
      {children}
      {hasFlutedFooter && (
        <div className="h-4 w-full pattern-fluted border-t border-slate-100 opacity-50" />
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
      className={`flex items-start justify-between gap-4 px-5 pt-5 pb-4 border-b border-slate-100 ${className}`}
    >
      <div className="space-y-0.5 min-w-0">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-slate-400">
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
