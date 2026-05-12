import React from "react";
import { format } from "date-fns";

const OPTIONS = [
  { key: "last30", label: "Last 30 Days" },
  { key: "trimester", label: "Current Trimester" },
  { key: "fiscal", label: "Fiscal Year" },
  { key: "custom", label: "Date Range" },
];

export default function MyWorkPeriodSelector({ period, setPeriod, customRange, setCustomRange, dateRange }) {
  return (
    <div className="mb-6">
      {/* Period toggle buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => setPeriod(opt.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all min-h-[44px] border ${
              period === opt.key
                ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(30,144,255,0.4)]"
                : "bg-slate-800 border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Custom range inputs */}
      {period === "custom" && (
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">From</label>
            <input
              type="date"
              value={customRange.start}
              onChange={e => setCustomRange(r => ({ ...r, start: e.target.value }))}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">To</label>
            <input
              type="date"
              value={customRange.end}
              onChange={e => setCustomRange(r => ({ ...r, end: e.target.value }))}
              className="bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm min-h-[44px] focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Active period label */}
      {dateRange.start && dateRange.end && period !== "custom" && (
        <p className="text-xs text-slate-500 mt-2">
          {format(dateRange.start, "MMM d, yyyy")} – {format(dateRange.end, "MMM d, yyyy")}
        </p>
      )}
    </div>
  );
}