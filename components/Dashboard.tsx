"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NewTicketInput,
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
import { AssignModal } from "./AssignModal";
import { ConnectionStatus, type ConnectionState } from "./ConnectionStatus";
import {
  FilterBar,
  type CategoryFilter,
  type SeverityFilter,
  type StatusFilter,
} from "./FilterBar";
import { NewTicketModal } from "./NewTicketModal";
import { SeverityModal } from "./SeverityModal";
import { StatCard } from "./StatCard";
import { StatusModal } from "./StatusModal";
import { TicketsTable, type TicketActionKind } from "./TicketsTable";
import { Toast, type ToastState } from "./Toast";

interface DashboardProps {
  instanceName: string;
}

const POLL_INTERVAL_MS = 5000;
const STALE_THRESHOLD_MS = 15000;
const ACTIVITY_MAX = 50;

type ActionModal =
  | { kind: "status"; ticket: SupportTicket }
  | { kind: "severity"; ticket: SupportTicket }
  | { kind: "assign"; ticket: SupportTicket }
  | { kind: "new" }
  | null;

function todayLocalISO(now: Date): string {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function newActivityId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function Dashboard({ instanceName }: DashboardProps) {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionModal, setActionModal] = useState<ActionModal>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [lastSuccessAt, setLastSuccessAt] = useState<Date | null>(null);
  const [lastFetchOk, setLastFetchOk] = useState<boolean>(true);
  const [now, setNow] = useState<Date>(new Date());

  const [toast, setToast] = useState<ToastState | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [apiKeysOpen, setApiKeysOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [search, setSearch] = useState<string>("");
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);

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
      setLastFetchOk(true);
      setLastSuccessAt(new Date());
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setLastFetchOk(false);
      setLoadError(
        err instanceof Error ? err.message : "Failed to load tickets",
      );
    }
  }, []);

  useEffect(() => {
    void fetchTickets();
    const pollId = setInterval(() => {
      void fetchTickets();
    }, POLL_INTERVAL_MS);
    const tickId = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(pollId);
      clearInterval(tickId);
      abortRef.current?.abort();
    };
  }, [fetchTickets]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const connectionState: ConnectionState = useMemo(() => {
    if (!lastSuccessAt) return "connecting";
    const age = now.getTime() - lastSuccessAt.getTime();
    if (age > STALE_THRESHOLD_MS) return "stale";
    if (!lastFetchOk) return "reconnecting";
    return "live";
  }, [lastSuccessAt, lastFetchOk, now]);

  const today = useMemo(() => todayLocalISO(now), [now]);

  const stats = useMemo(() => {
    const list = tickets ?? [];
    const total = list.length;
    const open = list.filter((t) => t.status === "OPEN").length;
    const criticalOpen = list.filter(
      (t) => t.status === "OPEN" && t.severity === "CRITICAL",
    ).length;
    const resolvedToday = list.filter(
      (t) => t.resolved_at !== null && t.resolved_at.slice(0, 10) === today,
    ).length;
    return { total, open, criticalOpen, resolvedToday };
  }, [tickets, today]);

  const filtered = useMemo(() => {
    const list = tickets ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((t) => {
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;
      if (severityFilter !== "ALL" && t.severity !== severityFilter)
        return false;
      if (categoryFilter !== "ALL" && t.category !== categoryFilter)
        return false;
      if (criticalOnly && t.severity !== "CRITICAL") return false;
      if (term) {
        const hay =
          `${t.ticket_number} ${t.title} ${t.assigned_to}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [
    tickets,
    statusFilter,
    severityFilter,
    categoryFilter,
    search,
    criticalOnly,
  ]);

  const appendActivity = useCallback((entry: ActivityEntry) => {
    setActivity((prev) => [entry, ...prev].slice(0, ACTIVITY_MAX));
  }, []);

  const handleAction = useCallback(
    (ticket: SupportTicket, action: TicketActionKind) => {
      setActionError(null);
      setActionModal({ kind: action, ticket });
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    if (actionBusy) return;
    setActionModal(null);
    setActionError(null);
  }, [actionBusy]);

  const handleResetFilters = useCallback(() => {
    setStatusFilter("ALL");
    setSeverityFilter("ALL");
    setCategoryFilter("ALL");
    setSearch("");
    setCriticalOnly(false);
  }, []);

  const submitMutation = useCallback(
    async (params: {
      url: string;
      method: "POST" | "PATCH";
      body: unknown;
      action: ActivityAction;
      ticketNumber: string;
      title: string;
      detail: string;
      successMessage: string;
      failurePrefix: string;
    }) => {
      setActionBusy(true);
      setActionError(null);
      try {
        const res = await fetch(params.url, {
          method: params.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(params.body),
        });
        const body = (await res.json().catch(() => null)) as
          | { success?: boolean; error?: string; ticket?: SupportTicket }
          | null;
        const ok = res.ok && body?.success === true;
        if (!ok) {
          throw new Error(body?.error ?? `Request failed (HTTP ${res.status})`);
        }

        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: params.action,
          ticketNumber: params.ticketNumber,
          title: params.title,
          detail: params.detail,
          result: "success",
        });
        setToast({
          id: Date.now(),
          kind: "success",
          message: params.successMessage,
        });
        setActionModal(null);
        void fetchTickets();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Action failed";
        appendActivity({
          id: newActivityId(),
          timestamp: new Date(),
          action: params.action,
          ticketNumber: params.ticketNumber,
          title: params.title,
          detail: params.detail,
          result: "failure",
          message,
        });
        setActionError(message);
        setToast({
          id: Date.now(),
          kind: "error",
          message: `${params.failurePrefix}: ${message}`,
        });
      } finally {
        setActionBusy(false);
      }
    },
    [appendActivity, fetchTickets],
  );

  const handleStatusSubmit = useCallback(
    (newStatus: TicketStatus, resolution?: string) => {
      if (actionModal?.kind !== "status") return;
      const t = actionModal.ticket;
      const body: { status: TicketStatus; resolution?: string } = {
        status: newStatus,
      };
      if (resolution !== undefined) body.resolution = resolution;
      void submitMutation({
        url: `/api/tickets/${t.id}/status`,
        method: "PATCH",
        body,
        action: "status_change",
        ticketNumber: t.ticket_number,
        title: t.title,
        detail: `${t.status} → ${newStatus}`,
        successMessage: `${t.ticket_number} → ${newStatus.replace(/_/g, " ")}`,
        failurePrefix: "Status change failed",
      });
    },
    [actionModal, submitMutation],
  );

  const handleSeveritySubmit = useCallback(
    (newSeverity: TicketSeverity) => {
      if (actionModal?.kind !== "severity") return;
      const t = actionModal.ticket;
      void submitMutation({
        url: `/api/tickets/${t.id}/severity`,
        method: "PATCH",
        body: { severity: newSeverity },
        action: "severity_change",
        ticketNumber: t.ticket_number,
        title: t.title,
        detail: `${t.severity} → ${newSeverity}`,
        successMessage: `${t.ticket_number} severity → ${newSeverity}`,
        failurePrefix: "Severity change failed",
      });
    },
    [actionModal, submitMutation],
  );

  const handleAssignSubmit = useCallback(
    (assignedTo: string) => {
      if (actionModal?.kind !== "assign") return;
      const t = actionModal.ticket;
      void submitMutation({
        url: `/api/tickets/${t.id}/assign`,
        method: "PATCH",
        body: { assignedTo },
        action: "assign",
        ticketNumber: t.ticket_number,
        title: t.title,
        detail: `${t.assigned_to} → ${assignedTo}`,
        successMessage: `${t.ticket_number} assigned to ${assignedTo}`,
        failurePrefix: "Assign failed",
      });
    },
    [actionModal, submitMutation],
  );

  const handleNewTicketSubmit = useCallback(
    (input: NewTicketInput) => {
      void submitMutation({
        url: "/api/tickets",
        method: "POST",
        body: input,
        action: "create",
        ticketNumber: input.ticket_number,
        title: input.title,
        detail: `${input.category} · ${input.severity}`,
        successMessage: `Created ticket ${input.ticket_number}`,
        failurePrefix: "Create failed",
      });
    },
    [submitMutation],
  );

  const lastRefreshedAgo = useMemo(() => {
    if (!lastSuccessAt) return null;
    return Math.max(
      0,
      Math.floor((now.getTime() - lastSuccessAt.getTime()) / 1000),
    );
  }, [lastSuccessAt, now]);

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400">
              Support Tickets
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-50">
              {instanceName}{" "}
              <span className="text-slate-500">— Support Tickets</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Standalone tickets instance. Auto-refreshes every 5 seconds.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-inset ring-slate-700"
              title="Set via INSTANCE_NAME env var. Read-only in the UI."
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-3.5 w-3.5 text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 1 1 8 0v3" />
              </svg>
              Current Instance: {instanceName}
            </span>
            <ConnectionStatus state={connectionState} />
            <button
              type="button"
              onClick={() => setApiKeysOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <span aria-hidden>🔑</span> API Keys
            </button>
            <button
              type="button"
              onClick={() => {
                setActionError(null);
                setActionModal({ kind: "new" });
              }}
              className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              + New ticket
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>
            <span className="text-slate-500">Last refreshed:</span>{" "}
            <span className="text-slate-300 tabular-nums">
              {lastSuccessAt ? lastSuccessAt.toLocaleTimeString() : "—"}
            </span>
            {lastRefreshedAgo !== null ? (
              <span className="ml-1 text-slate-500">
                ({lastRefreshedAgo}s ago)
              </span>
            ) : null}
          </span>
          <span className="text-slate-700">·</span>
          <span>
            Polling every {Math.round(POLL_INTERVAL_MS / 1000)} s · stale after{" "}
            {Math.round(STALE_THRESHOLD_MS / 1000)} s
          </span>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tickets" value={stats.total} />
        <StatCard
          label="Open Tickets"
          value={stats.open}
          tone={stats.open > 0 ? "warning" : "default"}
          hint={stats.open > 0 ? "Awaiting triage or work" : "All addressed"}
        />
        <StatCard
          label="Critical Open"
          value={stats.criticalOpen}
          tone={stats.criticalOpen > 0 ? "danger" : "default"}
          hint={
            stats.criticalOpen > 0
              ? "Health is degraded while > 0"
              : "Nothing critical pending"
          }
        />
        <StatCard
          label="Resolved Today"
          value={stats.resolvedToday}
          tone="success"
          hint={`resolved_at = ${today}`}
        />
      </section>

      {loadError ? (
        <div className="mt-6 rounded-md bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
          Failed to load tickets: {loadError}
        </div>
      ) : null}

      <section className="mt-6">
        <FilterBar
          statusFilter={statusFilter}
          severityFilter={severityFilter}
          categoryFilter={categoryFilter}
          search={search}
          criticalOnly={criticalOnly}
          onStatusChange={setStatusFilter}
          onSeverityChange={setSeverityFilter}
          onCategoryChange={setCategoryFilter}
          onSearchChange={setSearch}
          onCriticalChange={setCriticalOnly}
          resultCount={filtered.length}
          totalCount={tickets?.length ?? 0}
          onReset={handleResetFilters}
        />
      </section>

      <section className="mt-4">
        {tickets === null && !loadError ? (
          <div className="rounded-xl bg-slate-900/40 px-4 py-12 text-center text-sm text-slate-500 ring-1 ring-slate-800">
            Loading tickets…
          </div>
        ) : (
          <TicketsTable tickets={filtered} onAction={handleAction} />
        )}
      </section>

      <section className="mt-6">
        <ActivityFeed entries={activity} />
      </section>

      <StatusModal
        open={actionModal?.kind === "status"}
        ticketNumber={
          actionModal?.kind === "status"
            ? actionModal.ticket.ticket_number
            : ""
        }
        currentStatus={
          actionModal?.kind === "status" ? actionModal.ticket.status : "OPEN"
        }
        currentResolution={
          actionModal?.kind === "status" ? actionModal.ticket.resolution : ""
        }
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleStatusSubmit}
      />

      <SeverityModal
        open={actionModal?.kind === "severity"}
        ticketNumber={
          actionModal?.kind === "severity"
            ? actionModal.ticket.ticket_number
            : ""
        }
        currentSeverity={
          actionModal?.kind === "severity"
            ? actionModal.ticket.severity
            : "MEDIUM"
        }
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleSeveritySubmit}
      />

      <AssignModal
        open={actionModal?.kind === "assign"}
        ticketNumber={
          actionModal?.kind === "assign"
            ? actionModal.ticket.ticket_number
            : ""
        }
        currentAssignedTo={
          actionModal?.kind === "assign"
            ? actionModal.ticket.assigned_to
            : "Unassigned"
        }
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleAssignSubmit}
      />

      <NewTicketModal
        open={actionModal?.kind === "new"}
        busy={actionBusy}
        errorMessage={actionError}
        onCancel={handleCloseModal}
        onSubmit={handleNewTicketSubmit}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />

      <ApiKeyManager
        open={apiKeysOpen}
        onClose={() => setApiKeysOpen(false)}
      />
    </main>
  );
}
