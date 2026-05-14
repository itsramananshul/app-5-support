"use client";

import { Fragment, useState } from "react";
import type { SupportTicket } from "@/lib/types";
import { CategoryBadge } from "./CategoryBadge";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

export type TicketActionKind = "status" | "severity" | "assign";

interface TicketsTableProps {
  tickets: SupportTicket[];
  onAction: (ticket: SupportTicket, action: TicketActionKind) => void;
}

function formatDate(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return ts;
  }
}

export function TicketsTable({ tickets, onAction }: TicketsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 text-left font-medium">Ticket #</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Title</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Category</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Severity</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Status</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Assigned To</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Reported By</th>
              <th scope="col" className="px-3 py-3 text-left font-medium">Created</th>
              <th scope="col" className="px-3 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {tickets.map((t) => {
              const isExpanded = expanded.has(t.id);
              const tint =
                t.severity === "CRITICAL"
                  ? "bg-rose-500/5 hover:bg-rose-500/10"
                  : t.status === "OPEN" && t.severity === "HIGH"
                    ? "bg-amber-500/5 hover:bg-amber-500/10"
                    : "hover:bg-slate-800/40";
              return (
                <Fragment key={t.id}>
                  <tr className={`transition-colors ${tint}`}>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-300">
                      <button
                        type="button"
                        onClick={() => toggleExpand(t.id)}
                        className="inline-flex items-center gap-1 rounded text-slate-300 hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                        aria-expanded={isExpanded}
                        aria-controls={`row-${t.id}-detail`}
                        title={isExpanded ? "Hide details" : "Show details"}
                      >
                        <span aria-hidden className="text-slate-500">
                          {isExpanded ? "▾" : "▸"}
                        </span>
                        {t.ticket_number}
                      </button>
                    </td>
                    <td className="max-w-[320px] truncate px-3 py-3 text-slate-100">
                      {t.title}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <CategoryBadge category={t.category} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <SeverityBadge severity={t.severity} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                      {t.assigned_to === "Unassigned" ? (
                        <span className="italic text-slate-500">Unassigned</span>
                      ) : (
                        t.assigned_to
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                      {t.reported_by}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-400">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => onAction(t, "status")}
                          className="rounded-md bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300 ring-1 ring-inset ring-sky-500/30 hover:bg-sky-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        >
                          Status
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(t, "severity")}
                          className="rounded-md bg-rose-500/10 px-2 py-1 text-xs font-medium text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                        >
                          Severity
                        </button>
                        <button
                          type="button"
                          onClick={() => onAction(t, "assign")}
                          className="rounded-md bg-slate-700/30 px-2 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-600/50 hover:bg-slate-700/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                          Assign
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr
                      id={`row-${t.id}-detail`}
                      className="bg-slate-900/60"
                    >
                      <td className="px-3 py-3" colSpan={9}>
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                          <div>
                            <dt className="font-medium uppercase tracking-wider text-slate-500">
                              Description
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap break-words text-slate-300">
                              {t.description || (
                                <span className="italic text-slate-600">
                                  No description.
                                </span>
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-medium uppercase tracking-wider text-slate-500">
                              Resolution
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap break-words text-slate-300">
                              {t.resolution ? (
                                t.resolution
                              ) : (
                                <span className="italic text-slate-600">
                                  No resolution yet.
                                </span>
                              )}
                              {t.resolved_at ? (
                                <div className="mt-1 text-slate-500">
                                  Resolved at{" "}
                                  <span className="text-slate-400 tabular-nums">
                                    {new Date(t.resolved_at).toLocaleString()}
                                  </span>
                                </div>
                              ) : null}
                            </dd>
                          </div>
                        </dl>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {tickets.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No tickets match the current filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
