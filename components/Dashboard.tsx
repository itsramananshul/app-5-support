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
        {view === "tickets" ? (
          <TicketsListView tickets={tickets} />
        ) : view === "customers" ? (
          <CustomersView tickets={tickets} />
        ) : view === "knowledge-base" ? (
          <KnowledgeBaseView tickets={tickets} />
        ) : view === "reports" ? (
          <ReportsView tickets={tickets} />
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

// ─── Derived views ────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<TicketSeverity, string> = {
  LOW: "#94a3b8",
  MEDIUM: "#3b82f6",
  HIGH: "#f59e0b",
  CRITICAL: "#ef4444",
};

const STATUS_HEX: Record<TicketStatus, string> = {
  OPEN: "#ef4444",
  IN_PROGRESS: "#f59e0b",
  RESOLVED: "#10b981",
  CLOSED: "#94a3b8",
};

const STATUS_TEXT: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function PageHeader({ title }: { title: string }) {
  return (
    <div className="mb-6 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </p>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
    </div>
  );
}

function resolutionHours(t: SupportTicket): number | null {
  if (!t.resolved_at) return null;
  const a = new Date(t.created_at).getTime();
  const b = new Date(t.resolved_at).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.max(0, Math.round((b - a) / (1000 * 60 * 60)));
}

function TicketsListView({ tickets }: { tickets: SupportTicket[] | null }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");
  const list = tickets ?? [];
  const q = search.trim().toLowerCase();
  const filtered = list.filter((t) => {
    if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
    if (!q) return true;
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      t.reported_by.toLowerCase().includes(q) ||
      t.assigned_to.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
    );
  });
  return (
    <>
      <PageHeader title="Tickets" />
      <div className="mb-3 flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "ALL" | TicketStatus)}
          className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700"
        >
          <option value="ALL">All statuses</option>
          {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as TicketStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_TEXT[s]}</option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Search ticket #, title, reporter, agent…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800"
        />
        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} of {list.length}
        </span>
      </div>
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          {tickets === null ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading tickets…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">
              {list.length === 0 ? "No tickets yet." : "No tickets match the current filters."}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">Ticket</th>
                  <th className="px-4 py-2 text-left">Title</th>
                  <th className="px-4 py-2 text-left">Reporter</th>
                  <th className="px-4 py-2 text-left">Assignee</th>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-left">Severity</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs text-gray-700">{t.ticket_number}</td>
                    <td className="px-4 py-2 text-gray-800 max-w-xs truncate">{t.title}</td>
                    <td className="px-4 py-2 text-gray-700">{t.reported_by}</td>
                    <td className="px-4 py-2 text-gray-700">{t.assigned_to || "—"}</td>
                    <td className="px-4 py-2 text-gray-600">{t.category}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_COLOR[t.severity] }} />
                        {t.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_HEX[t.status] }} />
                        {STATUS_TEXT[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-xs text-gray-500">
                      {t.resolved_at
                        ? `${resolutionHours(t) ?? "—"}h to resolve`
                        : `${Math.round((Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60))}h open`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

function CustomersView({ tickets }: { tickets: SupportTicket[] | null }) {
  const list = tickets ?? [];
  const groups = useMemo(() => {
    const m = new Map<
      string,
      {
        customer: string;
        total: number;
        open: number;
        critical: number;
        lastSeen: string;
      }
    >();
    for (const t of list) {
      const g =
        m.get(t.reported_by) ?? {
          customer: t.reported_by,
          total: 0,
          open: 0,
          critical: 0,
          lastSeen: t.updated_at,
        };
      g.total += 1;
      if (t.status === "OPEN" || t.status === "IN_PROGRESS") g.open += 1;
      if (t.severity === "CRITICAL") g.critical += 1;
      if (new Date(t.updated_at).getTime() > new Date(g.lastSeen).getTime()) {
        g.lastSeen = t.updated_at;
      }
      m.set(t.reported_by, g);
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total);
  }, [list]);
  return (
    <>
      <PageHeader title="Customers" />
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
        {groups.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">
            No customer activity yet — tickets will populate this view.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">Reporter</th>
                <th className="px-4 py-2 text-right">Total tickets</th>
                <th className="px-4 py-2 text-right">Currently open</th>
                <th className="px-4 py-2 text-right">Critical</th>
                <th className="px-4 py-2 text-left">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.customer} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium text-gray-900">{g.customer}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-gray-700">{g.total}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${g.open > 0 ? "text-amber-700 font-semibold" : "text-gray-700"}`}>{g.open}</td>
                  <td className={`px-4 py-2 text-right tabular-nums ${g.critical > 0 ? "text-rose-700 font-semibold" : "text-gray-700"}`}>{g.critical}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{new Date(g.lastSeen).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function KnowledgeBaseView({ tickets }: { tickets: SupportTicket[] | null }) {
  const [search, setSearch] = useState("");
  const list = tickets ?? [];
  const resolved = list.filter((t) => t.resolved_at && t.resolution);
  const q = search.trim().toLowerCase();
  const filtered = q
    ? resolved.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.resolution.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      )
    : resolved;
  return (
    <>
      <PageHeader title="Knowledge Base" />
      <div className="mb-3 flex items-center gap-2">
        <input
          type="search"
          placeholder="Search resolutions, titles, categories…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-80 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800"
        />
        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} resolved {filtered.length === 1 ? "ticket" : "tickets"}
        </span>
      </div>
      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm ring-1 ring-gray-100">
            No resolved tickets yet — the knowledge base will populate once tickets are resolved.
          </div>
        ) : (
          filtered.map((t) => (
            <article key={t.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <header className="flex items-center justify-between gap-2 text-xs text-gray-500">
                <span className="font-mono">{t.ticket_number}</span>
                <span>{t.category}</span>
                <span>
                  resolved {resolutionHours(t) ?? "—"}h after open · {new Date(t.resolved_at!).toLocaleDateString()}
                </span>
              </header>
              <h3 className="mt-1 text-sm font-semibold text-gray-900">{t.title}</h3>
              <p className="mt-1 text-sm text-gray-700">{t.resolution}</p>
            </article>
          ))
        )}
      </section>
    </>
  );
}

function ReportsView({ tickets }: { tickets: SupportTicket[] | null }) {
  const list = tickets ?? [];
  const total = list.length;
  const statusCounts: Record<TicketStatus, number> = {
    OPEN: 0,
    IN_PROGRESS: 0,
    RESOLVED: 0,
    CLOSED: 0,
  };
  const severityCounts: Record<TicketSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    CRITICAL: 0,
  };
  for (const t of list) {
    statusCounts[t.status] += 1;
    severityCounts[t.severity] += 1;
  }
  const resolvedHours = list
    .map((t) => resolutionHours(t))
    .filter((n): n is number => typeof n === "number");
  const avgResolution =
    resolvedHours.length === 0
      ? 0
      : Math.round(resolvedHours.reduce((s, h) => s + h, 0) / resolvedHours.length);

  const byCategory = (() => {
    const m = new Map<string, { total: number; open: number; avgHrs: number; resolved: number; sumHrs: number }>();
    for (const t of list) {
      const g = m.get(t.category) ?? { total: 0, open: 0, avgHrs: 0, resolved: 0, sumHrs: 0 };
      g.total += 1;
      if (t.status === "OPEN" || t.status === "IN_PROGRESS") g.open += 1;
      const hrs = resolutionHours(t);
      if (hrs !== null) {
        g.resolved += 1;
        g.sumHrs += hrs;
      }
      m.set(t.category, g);
    }
    return Array.from(m.entries())
      .map(([category, v]) => ({
        category,
        total: v.total,
        open: v.open,
        avgHrs: v.resolved === 0 ? 0 : Math.round(v.sumHrs / v.resolved),
      }))
      .sort((a, b) => b.total - a.total);
  })();

  const byAgent = (() => {
    const m = new Map<string, { total: number; open: number; resolved: number; sumHrs: number }>();
    for (const t of list) {
      const who = t.assigned_to || "Unassigned";
      const g = m.get(who) ?? { total: 0, open: 0, resolved: 0, sumHrs: 0 };
      g.total += 1;
      if (t.status === "OPEN" || t.status === "IN_PROGRESS") g.open += 1;
      const hrs = resolutionHours(t);
      if (hrs !== null) {
        g.resolved += 1;
        g.sumHrs += hrs;
      }
      m.set(who, g);
    }
    return Array.from(m.entries())
      .map(([agent, v]) => ({
        agent,
        total: v.total,
        open: v.open,
        avgHrs: v.resolved === 0 ? 0 : Math.round(v.sumHrs / v.resolved),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  })();

  return (
    <>
      <PageHeader title="Reports" />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Tickets by Status</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {(Object.keys(statusCounts) as TicketStatus[]).map((k) => {
              const pct = total === 0 ? 0 : (statusCounts[k] / total) * 100;
              return (
                <li key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700">{STATUS_TEXT[k]}</span>
                    <span className="text-gray-500 tabular-nums">{statusCounts[k]}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
                    <div style={{ width: `${pct}%`, background: STATUS_HEX[k], height: "100%" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Tickets by Severity</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {(Object.keys(severityCounts) as TicketSeverity[]).map((k) => {
              const pct = total === 0 ? 0 : (severityCounts[k] / total) * 100;
              return (
                <li key={k}>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-700">{k}</span>
                    <span className="text-gray-500 tabular-nums">{severityCounts[k]}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-gray-100">
                    <div style={{ width: `${pct}%`, background: SEVERITY_COLOR[k], height: "100%" }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Workload by Agent</h3>
          {byAgent.length === 0 ? (
            <div className="text-xs text-gray-400">No tickets yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-1 text-left">Agent</th>
                  <th className="py-1 text-right">Tickets</th>
                  <th className="py-1 text-right">Open</th>
                  <th className="py-1 text-right">Avg resolve</th>
                </tr>
              </thead>
              <tbody>
                {byAgent.map((a) => (
                  <tr key={a.agent} className="border-t border-gray-100">
                    <td className="py-1 text-gray-800">{a.agent}</td>
                    <td className="py-1 text-right tabular-nums text-gray-700">{a.total}</td>
                    <td className={`py-1 text-right tabular-nums ${a.open > 0 ? "text-amber-700 font-semibold" : "text-gray-700"}`}>{a.open}</td>
                    <td className="py-1 text-right tabular-nums text-gray-700">{a.avgHrs > 0 ? `${a.avgHrs}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            By Category
            <span className="ml-2 text-xs font-normal text-gray-500">
              · Avg resolution {avgResolution}h overall
            </span>
          </h3>
          {byCategory.length === 0 ? (
            <div className="text-xs text-gray-400">No tickets yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-gray-500">
                <tr>
                  <th className="py-1 text-left">Category</th>
                  <th className="py-1 text-right">Total</th>
                  <th className="py-1 text-right">Open</th>
                  <th className="py-1 text-right">Avg resolve</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c.category} className="border-t border-gray-100">
                    <td className="py-1 text-gray-800">{c.category}</td>
                    <td className="py-1 text-right tabular-nums text-gray-700">{c.total}</td>
                    <td className={`py-1 text-right tabular-nums ${c.open > 0 ? "text-amber-700 font-semibold" : "text-gray-700"}`}>{c.open}</td>
                    <td className="py-1 text-right tabular-nums text-gray-700">{c.avgHrs > 0 ? `${c.avgHrs}h` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
