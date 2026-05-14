"use client";

import { useState } from "react";
import type { SupportTicket, TicketStatus } from "@/lib/types";
import { CategoryBadge } from "./CategoryBadge";
import { SeverityBadge } from "./SeverityBadge";

interface CriticalTicketsProps {
  tickets: SupportTicket[];
  onTransitionStatus: (
    ticket: SupportTicket,
    nextStatus: TicketStatus,
  ) => Promise<void>;
  onViewAll: () => void;
}

function nextStatusLabel(status: TicketStatus): {
  label: string;
  next: TicketStatus;
} | null {
  if (status === "OPEN") return { label: "Start", next: "IN_PROGRESS" };
  if (status === "IN_PROGRESS") return { label: "Resolve", next: "RESOLVED" };
  return null;
}

export function CriticalTickets({
  tickets,
  onTransitionStatus,
  onViewAll,
}: CriticalTicketsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const critical = tickets.filter(
    (t) =>
      (t.severity === "HIGH" || t.severity === "CRITICAL") &&
      t.status !== "CLOSED" &&
      t.status !== "RESOLVED",
  );

  const top = critical.slice(0, 6);

  const handle = async (ticket: SupportTicket, next: TicketStatus) => {
    if (busyId) return;
    setBusyId(ticket.id);
    try {
      await onTransitionStatus(ticket, next);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Hot Queue
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            Critical Tickets
          </h2>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
        >
          View all
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </header>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {top.map((t) => {
          const action = nextStatusLabel(t.status);
          const rowBusy = busyId === t.id;
          return (
            <div
              key={t.id}
              className="group flex flex-col rounded-lg border border-rose-200 bg-rose-50/30 p-3 transition-colors hover:border-rose-300"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] text-gray-600 ring-1 ring-inset ring-gray-200">
                  {t.ticket_number}
                </span>
                <SeverityBadge severity={t.severity} />
              </div>
              <p
                className="mt-2 line-clamp-2 text-sm font-medium text-gray-900"
                title={t.title}
              >
                {t.title}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <CategoryBadge category={t.category} />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                Reported by{" "}
                <span className="text-gray-700">{t.reported_by}</span>
              </p>
              <div className="mt-3">
                {action ? (
                  <button
                    type="button"
                    disabled={rowBusy}
                    onClick={() => void handle(t, action.next)}
                    className="w-full rounded-md bg-rose-500 px-2 py-1.5 text-[11px] font-semibold text-white shadow-sm hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {rowBusy ? "Working…" : action.label}
                  </button>
                ) : (
                  <span className="block rounded-md bg-gray-100 px-2 py-1.5 text-center text-[11px] font-medium text-gray-500">
                    No action
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {top.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-gray-400">
            No critical or high-severity tickets pending. Nice.
          </p>
        ) : null}
      </div>
    </section>
  );
}
