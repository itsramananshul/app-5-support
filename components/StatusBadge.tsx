"use client";

import type { TicketStatus } from "@/lib/types";

const styles: Record<TicketStatus, string> = {
  OPEN: "bg-amber-50 text-amber-700 ring-amber-600/20",
  IN_PROGRESS: "bg-blue-50 text-blue-700 ring-blue-600/20",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-gray-100 text-gray-700 ring-gray-300",
};

const labels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

interface StatusBadgeProps {
  status: TicketStatus;
  onClick?: () => void;
  title?: string;
}

export function StatusBadge({ status, onClick, title }: StatusBadgeProps) {
  const base = `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} cursor-pointer transition-shadow hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400`}
        title={title ?? "Click to change status"}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
        {labels[status]}
      </button>
    );
  }
  return (
    <span className={base}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {labels[status]}
    </span>
  );
}
