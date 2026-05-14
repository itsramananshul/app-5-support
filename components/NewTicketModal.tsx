"use client";

import { useEffect, useState } from "react";
import {
  TICKET_CATEGORIES,
  TICKET_SEVERITIES,
  type NewTicketInput,
  type TicketCategory,
  type TicketSeverity,
} from "@/lib/types";

interface NewTicketModalProps {
  open: boolean;
  busy?: boolean;
  errorMessage?: string | null;
  onCancel: () => void;
  onSubmit: (input: NewTicketInput) => void;
}

interface FormState {
  ticket_number: string;
  title: string;
  description: string;
  category: TicketCategory;
  severity: TicketSeverity;
  assigned_to: string;
  reported_by: string;
}

const emptyForm = (): FormState => ({
  ticket_number: "",
  title: "",
  description: "",
  category: "GENERAL",
  severity: "MEDIUM",
  assigned_to: "Unassigned",
  reported_by: "",
});

const inputClass =
  "w-full rounded-lg border-0 bg-slate-800 px-3 py-2 text-sm text-slate-100 ring-1 ring-inset ring-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60";

const labelText = "text-xs font-medium uppercase tracking-wider text-slate-400";

export function NewTicketModal({
  open,
  busy = false,
  errorMessage,
  onCancel,
  onSubmit,
}: NewTicketModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(emptyForm());
      setTouched(false);
    }
  }, [open]);

  if (!open) return null;

  const errors: Partial<Record<keyof FormState, string>> = {};
  if (!form.ticket_number.trim()) errors.ticket_number = "Required";
  if (!form.title.trim()) errors.title = "Required";
  if (!form.reported_by.trim()) errors.reported_by = "Required";

  const isValid = Object.keys(errors).length === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="w-full max-w-2xl rounded-xl bg-slate-900 p-6 shadow-2xl ring-1 ring-slate-700">
        <h2 className="text-lg font-semibold text-slate-100">
          Create new ticket
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Ticket is scoped to the current instance. New tickets start in OPEN.
        </p>

        <form
          className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (!isValid || busy) return;
            onSubmit({
              ticket_number: form.ticket_number.trim(),
              title: form.title.trim(),
              description: form.description.trim(),
              category: form.category,
              severity: form.severity,
              assigned_to:
                form.assigned_to.trim() === ""
                  ? "Unassigned"
                  : form.assigned_to.trim(),
              reported_by: form.reported_by.trim(),
            });
          }}
        >
          <label className="block">
            <span className={labelText}>Ticket Number</span>
            <input
              className={inputClass}
              value={form.ticket_number}
              onChange={(e) =>
                setForm((s) => ({ ...s, ticket_number: e.target.value }))
              }
              disabled={busy}
              placeholder="TKT-F1-099"
            />
            {touched && errors.ticket_number ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.ticket_number}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Reported By</span>
            <input
              className={inputClass}
              value={form.reported_by}
              onChange={(e) =>
                setForm((s) => ({ ...s, reported_by: e.target.value }))
              }
              disabled={busy}
              placeholder="Name and/or role"
            />
            {touched && errors.reported_by ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.reported_by}
              </span>
            ) : null}
          </label>

          <label className="block sm:col-span-2">
            <span className={labelText}>Title</span>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) =>
                setForm((s) => ({ ...s, title: e.target.value }))
              }
              disabled={busy}
              placeholder="Short summary"
            />
            {touched && errors.title ? (
              <span className="mt-1 block text-xs text-rose-300">
                {errors.title}
              </span>
            ) : null}
          </label>

          <label className="block">
            <span className={labelText}>Category</span>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  category: e.target.value as TicketCategory,
                }))
              }
              disabled={busy}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelText}>Severity</span>
            <select
              className={inputClass}
              value={form.severity}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  severity: e.target.value as TicketSeverity,
                }))
              }
              disabled={busy}
            >
              {TICKET_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block sm:col-span-2">
            <span className={labelText}>Assigned To (optional)</span>
            <input
              className={inputClass}
              value={form.assigned_to}
              onChange={(e) =>
                setForm((s) => ({ ...s, assigned_to: e.target.value }))
              }
              disabled={busy}
              placeholder="Defaults to Unassigned"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className={labelText}>Description (optional)</span>
            <textarea
              className={inputClass}
              rows={4}
              value={form.description}
              onChange={(e) =>
                setForm((s) => ({ ...s, description: e.target.value }))
              }
              disabled={busy}
              placeholder="What is happening? Any specifics?"
            />
          </label>

          {errorMessage ? (
            <p className="sm:col-span-2 rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-inset ring-rose-500/30">
              {errorMessage}
            </p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
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
              disabled={busy || (touched && !isValid)}
              className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
