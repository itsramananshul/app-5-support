"use client";

import type { TicketCategory } from "@/lib/types";

const labels: Record<TicketCategory, string> = {
  EQUIPMENT: "Equipment",
  IT: "IT",
  SAFETY: "Safety",
  QUALITY: "Quality",
  GENERAL: "General",
};

interface CategoryBadgeProps {
  category: TicketCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700">
      {labels[category]}
    </span>
  );
}
