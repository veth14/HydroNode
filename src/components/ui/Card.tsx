"use client";
// src/components/ui/Card.tsx
// Metro Pacific Water × HydroNode — Branded Card Component
// Subtle MPW ocean-blue border tint; clean white surface

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hasFlutedFooter?: boolean;
}

export function Card({ children, className = "", hasFlutedFooter = false }: CardProps) {
  return (
    <div
      className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-200 ${className}`}
      style={{
        border: "1px solid #DFF5FF",
        boxShadow:
          "0 1px 2px rgba(0,118,160,0.04), 0 4px 12px rgba(0,118,160,0.05), 0 8px 24px rgba(0,118,160,0.04)",
      }}
    >
      {/* Inset top highlight — MPW blue tint */}
      <div
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(1,159,215,0.3), transparent)",
        }}
      />
      {children}
      {hasFlutedFooter && (
        <div className="h-4 w-full pattern-fluted border-t opacity-50" style={{ borderColor: "#DFF5FF" }} />
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
      className={`flex items-start justify-between gap-4 px-5 pt-5 pb-4 ${className}`}
      style={{ borderBottom: "1px solid #DFF5FF" }}
    >
      <div className="space-y-0.5 min-w-0">
        <h3 className="text-sm font-semibold tracking-tight" style={{ color: "#0C2340" }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs" style={{ color: "#819FD7" }}>
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
