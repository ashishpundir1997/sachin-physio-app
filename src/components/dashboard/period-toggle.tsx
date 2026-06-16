"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type Period = "today" | "week" | "month";

const periodLabels: Record<Period, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
};

export function PeriodToggle({ period }: { period: Period }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
      {(["today", "week", "month"] as Period[]).map((p) => (
        <Link key={p} href={`/?period=${p}`} scroll={false}>
          <Button
            size="sm"
            variant={period === p ? "default" : "ghost"}
            className="text-xs px-3"
          >
            {periodLabels[p]}
          </Button>
        </Link>
      ))}
    </div>
  );
}
