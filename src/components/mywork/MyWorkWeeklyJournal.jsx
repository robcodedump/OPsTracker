import React, { useState } from "react";
import { format } from "date-fns";
import { CheckCircle, Zap, ChevronDown, ChevronUp, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function EventRow({ event }) {
  if (event.type === "resolved") {
    const isOos = event.serviceStatus === "out_of_service";
    return (
      <div className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
        <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${isOos ? "bg-red-900/50" : "bg-yellow-900/50"}`}>
          {isOos ? <XCircle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-yellow-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white text-sm">{event.label}</span>
            <Badge className="bg-green-900/50 text-green-300 border-green-700 border text-xs flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Resolved
            </Badge>
            {event.fixDays >= 0 && (
              <span className="text-xs text-slate-500">{event.fixDays === 0 ? "Same day" : `${event.fixDays}d to fix`}</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{event.description}</p>
          <p className="text-xs text-slate-600 mt-0.5">{format(event.date, "EEE MMM d, h:mm a")}</p>
        </div>
      </div>
    );
  }

  if (event.type === "ramclear") {
    return (
      <div className="flex items-start gap-3 py-3 border-b border-slate-700/50 last:border-0">
        <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-purple-900/50">
          <Zap className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white text-sm">{event.label}</span>
            <Badge className="bg-purple-900/50 text-purple-300 border-purple-700 border text-xs">
              RAM Clear ✓
            </Badge>
            {event.rtp && <span className="text-xs text-slate-500">RTP: {event.rtp}%</span>}
          </div>
          {event.description && event.description !== "RAM clear verified" && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{event.description}</p>
          )}
          <p className="text-xs text-slate-600 mt-0.5">{format(event.date, "EEE MMM d, h:mm a")}</p>
        </div>
      </div>
    );
  }

  return null;
}

function WeekGroup({ group }) {
  const [open, setOpen] = useState(true);
  const resolvedCount = group.events.filter(e => e.type === "resolved").length;
  const ramCount = group.events.filter(e => e.type === "ramclear").length;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl mb-4 overflow-hidden">
      {/* Week header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-700/40 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-left">
          <span className="font-semibold text-white text-sm">
            Week of {format(group.weekStart, "MMM d")} – {format(group.weekEnd, "MMM d, yyyy")}
          </span>
          <div className="flex gap-2 flex-wrap">
            {resolvedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 border border-green-700">
                {resolvedCount} resolved
              </span>
            )}
            {ramCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/50 text-purple-300 border border-purple-700">
                {ramCount} RAM clears
              </span>
            )}
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="px-5 pb-2">
          {group.events.map((ev, idx) => (
            <EventRow key={idx} event={ev} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function MyWorkWeeklyJournal({ weeklyGroups }) {
  if (weeklyGroups.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">No activity found</p>
        <p className="text-sm mt-1">Try selecting a different time period.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
        Weekly Journal
      </h2>
      {weeklyGroups.map((group, idx) => (
        <WeekGroup key={idx} group={group} />
      ))}
    </div>
  );
}