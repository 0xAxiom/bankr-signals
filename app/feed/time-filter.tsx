"use client";

import { useState } from "react";

export type TimeFilter = "all" | "today" | "week" | "month";

interface TimeFilterProps {
  activeFilter: TimeFilter;
  onFilterChange: (filter: TimeFilter) => void;
  signalCounts: Record<TimeFilter, number>;
}

export function TimeFilter({ activeFilter, onFilterChange, signalCounts }: TimeFilterProps) {
  const filters: { key: TimeFilter; label: string; desc: string }[] = [
    { key: "all", label: "All Time", desc: "All signals" },
    { key: "today", label: "Today", desc: "Last 24h" },
    { key: "week", label: "This Week", desc: "Last 7 days" },
    { key: "month", label: "This Month", desc: "Last 30 days" },
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter) => (
        <button
          key={filter.key}
          onClick={() => onFilterChange(filter.key)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeFilter === filter.key
              ? "bg-[#22c55e] text-black"
              : "bg-[#2a2a2a] text-[#a3a3a3] hover:bg-[#333] hover:text-white"
          }`}
        >
          <span className="block">{filter.label}</span>
          <span className="text-[10px] opacity-70">
            {signalCounts[filter.key]} signals
          </span>
        </button>
      ))}
    </div>
  );
}