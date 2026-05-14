"use client";

import {
  TICKET_CATEGORIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type TicketCategory,
  type TicketSeverity,
  type TicketStatus,
} from "@/lib/types";

export type StatusFilter = TicketStatus | "ALL";
export type SeverityFilter = TicketSeverity | "ALL";
export type CategoryFilter = TicketCategory | "ALL";

interface FilterBarProps {
  statusFilter: StatusFilter;
  severityFilter: SeverityFilter;
  categoryFilter: CategoryFilter;
  search: string;
  criticalOnly: boolean;
  onStatusChange: (value: StatusFilter) => void;
  onSeverityChange: (value: SeverityFilter) => void;
  onCategoryChange: (value: CategoryFilter) => void;
  onSearchChange: (value: string) => void;
  onCriticalChange: (value: boolean) => void;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
}

const selectClass =
  "rounded-md border-0 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500";

export function FilterBar({
  statusFilter,
  severityFilter,
  categoryFilter,
  search,
  criticalOnly,
  onStatusChange,
  onSeverityChange,
  onCategoryChange,
  onSearchChange,
  onCriticalChange,
  resultCount,
  totalCount,
  onReset,
}: FilterBarProps) {
  const hasFilters =
    statusFilter !== "ALL" ||
    severityFilter !== "ALL" ||
    categoryFilter !== "ALL" ||
    search.trim() !== "" ||
    criticalOnly;

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-900/40 p-3 ring-1 ring-slate-800">
      <label className="flex flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Status
        </span>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        >
          <option value="ALL">All statuses</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Severity
        </span>
        <select
          className={selectClass}
          value={severityFilter}
          onChange={(e) =>
            onSeverityChange(e.target.value as SeverityFilter)
          }
        >
          <option value="ALL">All severities</option>
          {TICKET_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Category
        </span>
        <select
          className={selectClass}
          value={categoryFilter}
          onChange={(e) =>
            onCategoryChange(e.target.value as CategoryFilter)
          }
        >
          <option value="ALL">All categories</option>
          {TICKET_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 min-w-[200px] flex-col text-xs text-slate-400">
        <span className="mb-1 font-medium uppercase tracking-wider">
          Search
        </span>
        <input
          type="text"
          placeholder="Ticket #, title, or assignee"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className={`${selectClass} w-full`}
        />
      </label>

      <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={criticalOnly}
          onChange={(e) => onCriticalChange(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-rose-500 focus:ring-rose-500"
        />
        Critical only
      </label>

      <div className="ml-auto flex items-center gap-3 self-end pb-1 text-xs text-slate-400">
        <span className="tabular-nums">
          Showing <span className="text-slate-200">{resultCount}</span> of{" "}
          {totalCount}
        </span>
        {hasFilters ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-inset ring-slate-700 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Clear filters
          </button>
        ) : null}
      </div>
    </div>
  );
}
