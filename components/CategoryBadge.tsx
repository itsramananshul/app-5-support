import type { TicketCategory } from "@/lib/types";

const styles: Record<TicketCategory, string> = {
  EQUIPMENT: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  IT: "bg-purple-500/15 text-purple-300 ring-purple-500/30",
  SAFETY: "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  QUALITY: "bg-teal-500/15 text-teal-300 ring-teal-500/30",
  GENERAL: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

export function CategoryBadge({ category }: { category: TicketCategory }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${styles[category]}`}
    >
      {category}
    </span>
  );
}
