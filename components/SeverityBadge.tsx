import type { TicketSeverity } from "@/lib/types";

const styles: Record<TicketSeverity, string> = {
  LOW: "bg-blue-500/15 text-blue-300 ring-blue-500/30",
  MEDIUM: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
  HIGH: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  CRITICAL: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
};

export function SeverityBadge({ severity }: { severity: TicketSeverity }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}
