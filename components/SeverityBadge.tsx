"use client";

import type { TicketSeverity } from "@/lib/types";

const styles: Record<TicketSeverity, string> = {
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-600/20",
  HIGH: "bg-orange-50 text-orange-700 ring-orange-600/20",
  CRITICAL: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

const labels: Record<TicketSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

interface SeverityBadgeProps {
  severity: TicketSeverity;
  onClick?: () => void;
  title?: string;
}

export function SeverityBadge({ severity, onClick, title }: SeverityBadgeProps) {
  const base = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[severity]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
        title={title ?? "Click to start work"}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {labels[severity]}
      </button>
    );
  }
  return (
    <span className={base}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {labels[severity]}
    </span>
  );
}
