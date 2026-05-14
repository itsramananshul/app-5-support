import type { TicketStatus } from "@/lib/types";

const styles: Record<TicketStatus, string> = {
  OPEN: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  CLOSED: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

const labels: Record<TicketStatus, string> = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN PROGRESS",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}
