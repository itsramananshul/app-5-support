"use client";

import { useEffect, useRef, useState } from "react";
import {
  TICKET_CATEGORIES,
  TICKET_SEVERITIES,
  TICKET_STATUSES,
  type NewTicketInput,
  type TicketCategory,
  type TicketSeverity,
  type TicketStatus,
} from "@/lib/types";

export interface NewTicketModalInput extends NewTicketInput {
  status: TicketStatus;
}

interface NewTicketModalProps {
  open: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (input: NewTicketModalInput) => void;
}

function defaultTicketNumber(): string {
  return `TKT-${Date.now().toString(36).toUpperCase()}`;
}

export function NewTicketModal({
  open,
  busy = false,
  errorMessage,
  onCancel,
  onSubmit,
}: NewTicketModalProps) {
  const [ticketNumber, setTicketNumber] = useState<string>(defaultTicketNumber());
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [category, setCategory] = useState<TicketCategory>("GENERAL");
  const [severity, setSeverity] = useState<TicketSeverity>("MEDIUM");
  const [status, setStatus] = useState<TicketStatus>("OPEN");
  const [assignedTo, setAssignedTo] = useState<string>("Unassigned");
  const [reportedBy, setReportedBy] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTicketNumber(defaultTicketNumber());
      setTitle("");
      setDescription("");
      setCategory("GENERAL");
      setSeverity("MEDIUM");
      setStatus("OPEN");
      setAssignedTo("Unassigned");
      setReportedBy("");
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const isValid =
    ticketNumber.trim().length > 0 &&
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    reportedBy.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-ticket-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/30 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl ring-1 ring-gray-100">
        <h2
          id="new-ticket-modal-title"
          className="text-lg font-semibold text-gray-900"
        >
          Create new ticket
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Capture the details now. You can change status, severity, and
          assignment later from the dashboard.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValid || busy) return;
            onSubmit({
              ticket_number: ticketNumber.trim(),
              title: title.trim(),
              description: description.trim(),
              category,
              severity,
              status,
              assigned_to: assignedTo.trim() || "Unassigned",
              reported_by: reportedBy.trim(),
            });
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Ticket number
              </span>
              <input
                ref={inputRef}
                type="text"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                disabled={busy}
                className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Reported by
              </span>
              <input
                type="text"
                value={reportedBy}
                onChange={(e) => setReportedBy(e.target.value)}
                disabled={busy}
                placeholder="e.g. Jane Operator"
                className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Title
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              placeholder="Short summary"
              className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Description
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={3}
              placeholder="What happened, what's affected, anything you've already tried."
              className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Category
              </span>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TicketCategory)
                }
                disabled={busy}
                className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0) + c.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Severity
              </span>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as TicketSeverity)
                }
                disabled={busy}
                className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              >
                {TICKET_SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                disabled={busy}
                className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
              >
                {TICKET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Assigned to
            </span>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={busy}
              className="mt-2 w-full rounded-lg border-0 bg-gray-50 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-inset ring-rose-200">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || busy}
              className="rounded-lg bg-teal-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
