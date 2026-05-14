"use client";

import { useMemo, useState } from "react";
import type {
  SupportTicket,
  TicketSeverity,
  TicketStatus,
} from "@/lib/types";
import { CategoryBadge } from "./CategoryBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export type SeverityFilter = "ALL" | TicketSeverity;

interface RecentTicketsProps {
  tickets: SupportTicket[];
  loading: boolean;
  filter: SeverityFilter;
  expanded: boolean;
  onTransitionStatus: (
    ticket: SupportTicket,
    nextStatus: TicketStatus,
  ) => Promise<void>;
  onEscalate: (ticket: SupportTicket) => Promise<void>;
  onToggleExpand: () => void;
}

const STATUS_PROGRESS: Record<TicketStatus, number> = {
  OPEN: 20,
  IN_PROGRESS: 60,
  RESOLVED: 100,
  CLOSED: 100,
};

function nextSeverity(s: TicketSeverity): TicketSeverity | null {
  if (s === "LOW") return "MEDIUM";
  if (s === "MEDIUM") return "HIGH";
  if (s === "HIGH") return "CRITICAL";
  return null;
}

export function RecentTickets({
  tickets,
  loading,
  filter,
  expanded,
  onTransitionStatus,
  onEscalate,
  onToggleExpand,
}: RecentTicketsProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "ALL") return tickets;
    return tickets.filter((t) => t.severity === filter);
  }, [tickets, filter]);

  const visible = expanded ? filtered : filtered.slice(0, 6);

  const wrapAction = async (
    ticket: SupportTicket,
    fn: () => Promise<void>,
  ) => {
    if (busyId) return;
    setBusyId(ticket.id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section
      id="recent-tickets"
      className="h-full rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
    >
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Tickets
          </p>
          <h2 className="text-lg font-semibold text-gray-900">Recent Tickets</h2>
          {filter !== "ALL" ? (
            <p className="mt-0.5 text-xs text-gray-400">
              Filtered to <span className="font-medium text-teal-600">{filter}</span>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
        >
          {expanded ? "Show less" : "View detail"}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-3 w-3 transition-transform ${expanded ? "rotate-90" : ""}`}
            aria-hidden
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </header>

      {loading && tickets.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">
          Loading tickets…
        </div>
      ) : null}

      <ul className="divide-y divide-gray-100">
        {visible.map((t) => {
          const pct = STATUS_PROGRESS[t.status];
          const isHotSev = t.severity === "HIGH" || t.severity === "CRITICAL";
          const isClosed = t.status === "CLOSED";
          const barColor = isClosed ? "bg-gray-300" : "bg-teal-500";
          const rowBusy = busyId === t.id;
          const cantEscalate = t.severity === "CRITICAL";

          return (
            <li key={t.id} className="py-3.5">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                      {t.ticket_number}
                    </span>
                    <span className="truncate text-sm font-medium text-gray-900">
                      {t.title}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Reported by{" "}
                    <span className="text-gray-600">{t.reported_by}</span>
                    {t.assigned_to && t.assigned_to !== "Unassigned" ? (
                      <>
                        {" "}· Assigned to{" "}
                        <span className="text-gray-600">{t.assigned_to}</span>
                      </>
                    ) : null}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <SeverityBadge
                      severity={t.severity}
                      onClick={
                        isHotSev && !rowBusy && t.status !== "IN_PROGRESS"
                          ? () =>
                              void wrapAction(t, () =>
                                onTransitionStatus(t, "IN_PROGRESS"),
                              )
                          : undefined
                      }
                      title={
                        isHotSev && t.status !== "IN_PROGRESS"
                          ? "Click to start work"
                          : undefined
                      }
                    />
                    <StatusBadge status={t.status} />
                    <CategoryBadge category={t.category} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-gray-500">
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex gap-1">
                    {t.status === "OPEN" ? (
                      <>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() =>
                            void wrapAction(t, () =>
                              onTransitionStatus(t, "IN_PROGRESS"),
                            )
                          }
                          className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy || cantEscalate}
                          onClick={() =>
                            void wrapAction(t, () => onEscalate(t))
                          }
                          className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                          title={
                            cantEscalate
                              ? "Already at CRITICAL"
                              : "Bump severity to next level"
                          }
                        >
                          Escalate
                        </button>
                      </>
                    ) : null}

                    {t.status === "IN_PROGRESS" ? (
                      <>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() =>
                            void wrapAction(t, () =>
                              onTransitionStatus(t, "RESOLVED"),
                            )
                          }
                          className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy || cantEscalate}
                          onClick={() =>
                            void wrapAction(t, () => onEscalate(t))
                          }
                          className="rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                          title={
                            cantEscalate
                              ? "Already at CRITICAL"
                              : "Bump severity to next level"
                          }
                        >
                          Escalate
                        </button>
                      </>
                    ) : null}

                    {t.status === "RESOLVED" ? (
                      <>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() =>
                            void wrapAction(t, () =>
                              onTransitionStatus(t, "IN_PROGRESS"),
                            )
                          }
                          className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Reopen
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() =>
                            void wrapAction(t, () =>
                              onTransitionStatus(t, "CLOSED"),
                            )
                          }
                          className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Close
                        </button>
                      </>
                    ) : null}

                    {t.status === "CLOSED" ? (
                      <span className="rounded-md bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500">
                        Done
                      </span>
                    ) : null}
                  </div>
                  {cantEscalate && t.status !== "CLOSED" && t.status !== "RESOLVED" ? (
                    <span className="text-[10px] text-gray-400">
                      Max severity
                    </span>
                  ) : null}
                  {nextSeverity(t.severity) && t.status !== "CLOSED" && t.status !== "RESOLVED" ? (
                    <span className="text-[10px] text-gray-400">
                      Next: {nextSeverity(t.severity)}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
        {!loading && filtered.length === 0 ? (
          <li className="py-10 text-center text-sm text-gray-400">
            {filter === "ALL"
              ? "No tickets yet."
              : `No tickets match the ${filter} severity filter.`}
          </li>
        ) : null}
      </ul>
      {filtered.length > 6 ? (
        <p className="mt-3 text-center text-xs text-gray-400">
          {expanded
            ? `Showing all ${filtered.length}`
            : `Showing 6 of ${filtered.length}`}
        </p>
      ) : null}
    </section>
  );
}
