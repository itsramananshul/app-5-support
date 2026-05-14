"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  SupportTicket,
  TicketSeverity,
  TicketStatus,
} from "@/lib/types";
import {
  ActivityFeed,
  type ActivityAction,
  type ActivityEntry,
} from "./ActivityFeed";
import { ApiKeyManager } from "./ApiKeyManager";
import { ComingSoon } from "./ComingSoon";
import { CriticalTickets } from "./CriticalTickets";
import { DonutChart } from "./DonutChart";
import { FilterDropdown, type SeverityFilter } from "./FilterDropdown";
import { MetricCard } from "./MetricCard";
import { NewTicketModal, type NewTicketModalInput } from "./NewTicketModal";
import { RecentTickets } from "./RecentTickets";
import { Toast, type ToastState } from "./Toast";
import { TopNav, type NavView } from "./TopNav";

interface DashboardProps {
  instanceName: string;
}

const POLL_INTERVAL_MS = 5000;
const ACTIVITY_MAX = 50;

const COMING_SOON_COPY: Record<
  Exclude<NavView, "dashboard">,
  { title: string; description: string }
> = {
  tickets: {
    title: "Tickets — coming soon",
    description:
      "Dedicated ticket queue with full filtering, bulk actions, and SLA tracking.",
  },
  customers: {
    title: "Customers — coming soon",
    description:
      "Customer accounts, contact history, and per-account ticket trends.",
  },
  "knowledge-base": {
    title: "Knowledge Base — coming soon",
    description:
      "Searchable articles, runbooks, and resolution templates for common issues.",
  },
  reports: {
    title: "Reports — coming soon",
    description:
      "Time-to-resolution, severity distributions, and team performance dashboards.",
  },
};

function nextSeverityValue(s: TicketSeverity): TicketSeverity | null {
  if (s === "LOW") return "MEDIUM";
  if (s === "MEDIUM") return "HIGH";
  if (s === "HIGH") return "CRITICAL";
  return null;
}

function newActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function scrollToRecent() {
  const el = document.getElementById("recent-tickets");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function Dashboard({ instanceName }: DashboardProps) {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [view, setView] = useState<NavView>("dashboard");
  const [filter, setFilter] = useState<SeverityFilter>("ALL");
  const [expanded, setExpanded] = useState(false);

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketBusy, setNewTicketBusy] = useState(false);
  const [newTicketError, setNewTicketError] = useState<string | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const fetchTickets = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/tickets", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data: SupportTicket[] = await res.json();
      setTickets(data);
      setLoadError(null);
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLoadError(
        err instanceof Error ? err.message : "Failed to load tickets",
      );
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
    const id = setInterval(() => {
      void fetchTickets();
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(id);
      abortRef.current?.abort();
    };
  }, [fetchTickets]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const stats = useMemo(() => {
    const list = tickets ?? [];
    const total = list.length;
    const open = list.filter((t) => t.status === "OPEN").length;
    const inProgress = list.filter((t) => t.status === "IN_PROGRESS").length;
    const resolved = list.filter((t) => t.status === "RESOLVED").length;
    const closed = list.filter((t) => t.status === "CLOSED").length;

    const low = list.filter((t) => t.severity === "LOW").length;
    const medium = list.filter((t) => t.severity === "MEDIUM").length;
    const high = list.filter((t) => t.severity === "HIGH").length;
    const critical = list.filter((t) => t.severity === "CRITICAL").length;

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      low,
      medium,
      high,
      critical,
    };
  }, [tickets]);

  const filterCounts: Record<SeverityFilter, number> = useMemo(
    () => ({
      ALL: stats.total,
      LOW: stats.low,
      MEDIUM: stats.medium,
      HIGH: stats.high,
      CRITICAL: stats.critical,
    }),
    [stats],
  );

  const appendActivity = useCallback((entry: ActivityEntry) => {
    setActivity((prev) => [entry, ...prev].slice(0, ACTIVITY_MAX));
  }, []);

  const pushToast = useCallback((kind: ToastState["kind"], message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  const recordActivity = useCallback(
    (params: {
      action: ActivityAction;
      ticket: SupportTicket | { ticket_number: string; title: string };
      detail: string;
      result: "success" | "failure";
      message?: string;
    }) => {
      appendActivity({
        id: newActivityId(),
        timestamp: new Date(),
        action: params.action,
        ticketNumber: params.ticket.ticket_number,
        title: params.ticket.title,
        detail: params.detail,
        result: params.result,
        message: params.message,
      });
    },
    [appendActivity],
  );

  const patchStatus = useCallback(
    async (ticket: SupportTicket, nextStatus: TicketStatus): Promise<void> => {
      const body: { status: TicketStatus; resolution?: string } = {
        status: nextStatus,
      };
      if (nextStatus === "RESOLVED" || nextStatus === "CLOSED") {
        const existing = ticket.resolution?.trim();
        body.resolution =
          existing && existing.length > 0
            ? existing
            : `Auto-resolved via dashboard at ${new Date().toLocaleString()}`;
      }
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; ticket?: SupportTicket }
          | null;
        if (!res.ok || data?.success !== true) {
          throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
        }
        recordActivity({
          action: "status_change",
          ticket,
          detail: `${ticket.status} → ${nextStatus}`,
          result: "success",
        });
        pushToast(
          "success",
          `${ticket.ticket_number} → ${nextStatus.replace(/_/g, " ")}`,
        );
        void fetchTickets();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Status change failed";
        recordActivity({
          action: "status_change",
          ticket,
          detail: `${ticket.status} → ${nextStatus}`,
          result: "failure",
          message,
        });
        pushToast("error", `Status change failed: ${message}`);
      }
    },
    [fetchTickets, pushToast, recordActivity],
  );

  const escalateSeverity = useCallback(
    async (ticket: SupportTicket): Promise<void> => {
      const next = nextSeverityValue(ticket.severity);
      if (!next) {
        pushToast("error", `${ticket.ticket_number} is already CRITICAL`);
        return;
      }
      try {
        const res = await fetch(`/api/tickets/${ticket.id}/severity`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ severity: next }),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; ticket?: SupportTicket }
          | null;
        if (!res.ok || data?.success !== true) {
          throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
        }
        recordActivity({
          action: "severity_change",
          ticket,
          detail: `${ticket.severity} → ${next}`,
          result: "success",
        });
        pushToast(
          "success",
          `${ticket.ticket_number} severity → ${next}`,
        );
        void fetchTickets();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Severity change failed";
        recordActivity({
          action: "severity_change",
          ticket,
          detail: `${ticket.severity} → ${next}`,
          result: "failure",
          message,
        });
        pushToast("error", `Escalate failed: ${message}`);
      }
    },
    [fetchTickets, pushToast, recordActivity],
  );

  const createTicket = useCallback(
    async (input: NewTicketModalInput): Promise<void> => {
      setNewTicketBusy(true);
      setNewTicketError(null);
      try {
        const res = await fetch("/api/tickets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; ticket?: SupportTicket }
          | null;
        if (!res.ok || data?.success !== true) {
          throw new Error(data?.error ?? `Request failed (HTTP ${res.status})`);
        }
        recordActivity({
          action: "created",
          ticket: { ticket_number: input.ticket_number, title: input.title },
          detail: `${input.category} · ${input.severity}`,
          result: "success",
        });
        pushToast("success", `Created ticket ${input.ticket_number}`);
        setNewTicketOpen(false);
        void fetchTickets();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Create failed";
        recordActivity({
          action: "created",
          ticket: { ticket_number: input.ticket_number, title: input.title },
          detail: `${input.category} · ${input.severity}`,
          result: "failure",
          message,
        });
        setNewTicketError(message);
        pushToast("error", `Create failed: ${message}`);
      } finally {
        setNewTicketBusy(false);
      }
    },
    [fetchTickets, pushToast, recordActivity],
  );

  const handleViewRecent = useCallback(() => {
    setExpanded(true);
    setTimeout(scrollToRecent, 50);
  }, []);

  return (
    <div>
      <TopNav
        instanceName={instanceName}
        currentView={view}
        onChangeView={(v) => {
          setView(v);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onOpenApiKeys={() => setApiKeysOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {view !== "dashboard" ? (
          <>
            <div className="mb-6 flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {view.replace("-", " ")}
              </p>
              <h1 className="text-2xl font-bold capitalize text-gray-900">
                {view.replace("-", " ")}
              </h1>
            </div>
            <ComingSoon
              title={COMING_SOON_COPY[view].title}
              description={COMING_SOON_COPY[view].description}
              onBack={() => setView("dashboard")}
            />
          </>
        ) : (
          <>
            <div className="mb-6 flex items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Overview
                </p>
                <h1 className="text-2xl font-bold text-gray-900">
                  {instanceName} Dashboard
                </h1>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewTicketError(null);
                    setNewTicketOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  New Ticket
                </button>
                <FilterDropdown
                  value={filter}
                  counts={filterCounts}
                  onChange={setFilter}
                />
              </div>
            </div>

            {loadError ? (
              <div className="mb-6 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
                Failed to load tickets: {loadError}
              </div>
            ) : null}

            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total Tickets"
                value={stats.total}
                onViewDetail={handleViewRecent}
              />
              <MetricCard
                label="Open"
                value={stats.open}
                hint={stats.open > 0 ? "Awaiting triage" : "All addressed"}
                onViewDetail={handleViewRecent}
              />
              <MetricCard
                label="In Progress"
                value={stats.inProgress}
                hint={stats.inProgress > 0 ? "Being worked" : "Idle"}
                onViewDetail={handleViewRecent}
              />
              <MetricCard
                label="Resolved"
                value={stats.resolved}
                hint={stats.resolved > 0 ? "Awaiting close" : "—"}
                onViewDetail={handleViewRecent}
              />
            </section>

            <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <RecentTickets
                  tickets={tickets ?? []}
                  loading={tickets === null}
                  filter={filter}
                  expanded={expanded}
                  onTransitionStatus={patchStatus}
                  onEscalate={escalateSeverity}
                  onToggleExpand={() => setExpanded((v) => !v)}
                />
              </div>
              <div className="flex flex-col gap-4 lg:col-span-2">
                <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <header className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Distribution
                      </p>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Severity Breakdown
                      </h2>
                    </div>
                  </header>
                  <DonutChart
                    total={stats.total}
                    centerLabel="Tickets"
                    slices={[
                      { label: "Low", value: stats.low, hex: "#10b981" },
                      { label: "Medium", value: stats.medium, hex: "#f59e0b" },
                      { label: "High", value: stats.high, hex: "#f97316" },
                      { label: "Critical", value: stats.critical, hex: "#ef4444" },
                    ].filter((s) => s.value > 0)}
                  />
                </section>
                <ActivityFeed entries={activity} />
              </div>
            </section>

            <section className="mb-6">
              <CriticalTickets
                tickets={tickets ?? []}
                onTransitionStatus={patchStatus}
                onViewAll={handleViewRecent}
              />
            </section>
          </>
        )}
      </main>

      <NewTicketModal
        open={newTicketOpen}
        busy={newTicketBusy}
        errorMessage={newTicketError}
        onCancel={() => {
          if (newTicketBusy) return;
          setNewTicketOpen(false);
          setNewTicketError(null);
        }}
        onSubmit={createTicket}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ApiKeyManager
        open={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
    </div>
  );
}
