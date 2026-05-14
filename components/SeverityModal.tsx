"use client";

import { useEffect, useState } from "react";
import { TICKET_SEVERITIES, type TicketSeverity } from "@/lib/types";
import { SeverityBadge } from "./SeverityBadge";

interface SeverityModalProps {
  open: boolean;
  ticketNumber: string;
  currentSeverity: TicketSeverity;
  busy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (severity: TicketSeverity) => void;
}

export function SeverityModal({
  open,
  ticketNumber,
  currentSeverity,
  busy = false,
  errorMessage,
  onCancel,
  onSubmit,
}: SeverityModalProps) {
  const [selected, setSelected] = useState<TicketSeverity>(currentSeverity);

  useEffect(() => {
    if (open) setSelected(currentSeverity);
  }, [open, currentSeverity, ticketNumber]);

  if (!open) return null;

  const unchanged = selected === currentSeverity;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">
          Change severity
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Ticket{" "}
          <span className="font-mono text-slate-300">{ticketNumber}</span>
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-800/60 px-3 py-2 ring-1 ring-inset ring-slate-700">
          <span className="text-xs text-slate-400">Current:</span>
          <SeverityBadge severity={currentSeverity} />
        </div>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (busy || unchanged) return;
            onSubmit(selected);
          }}
        >
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium uppercase tracking-wider text-slate-400">
              New severity
            </legend>
            {TICKET_SEVERITIES.map((s) => (
              <label
                key={s}
                className={`flex cursor-pointer items-center gap-2 rounded-md bg-slate-800/50 px-3 py-2 ring-1 ring-inset ${
                  selected === s ? "ring-sky-500/60" : "ring-slate-700"
                } hover:bg-slate-800`}
              >
                <input
                  type="radio"
                  name="severity"
                  value={s}
                  checked={selected === s}
                  onChange={() => setSelected(s)}
                  disabled={busy}
                  className="h-4 w-4 border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500"
                />
                <SeverityBadge severity={s} />
              </label>
            ))}
          </fieldset>

          {errorMessage ? (
            <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || unchanged}
              className="rounded-lg bg-rose-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Saving…" : "Update severity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
