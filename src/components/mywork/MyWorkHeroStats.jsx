import React from "react";
import { CheckCircle, Clock, Zap, Activity } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, unit, color, glow }) => (
  <div className={`bg-slate-800 border rounded-xl p-4 md:p-6 flex flex-col gap-2 ${color} ${glow}`}>
    <div className="flex items-center gap-2 text-sm text-slate-400">
      <Icon className="w-4 h-4" />
      {label}
    </div>
    <div className="text-3xl md:text-4xl font-bold text-white">
      {value !== null && value !== undefined ? value : <span className="text-slate-600 text-xl">No data</span>}
      {value !== null && value !== undefined && unit && (
        <span className="text-base font-normal text-slate-400 ml-1">{unit}</span>
      )}
    </div>
  </div>
);

export default function MyWorkHeroStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={CheckCircle}
        label="Issues Resolved"
        value={stats.resolved}
        color="border-green-700"
        glow={stats.resolved > 0 ? "shadow-[0_0_15px_rgba(34,197,94,0.15)]" : ""}
      />
      <StatCard
        icon={Clock}
        label="Avg Fix Time"
        value={stats.avgFixDays}
        unit="days"
        color="border-blue-700"
        glow={stats.avgFixDays !== null ? "shadow-[0_0_15px_rgba(30,144,255,0.15)]" : ""}
      />
      <StatCard
        icon={Zap}
        label="RAM Clears Verified"
        value={stats.ramClears}
        color="border-purple-700"
        glow={stats.ramClears > 0 ? "shadow-[0_0_15px_rgba(139,92,246,0.15)]" : ""}
      />
      <StatCard
        icon={Activity}
        label="MTBF"
        value={stats.mtbf}
        unit="days/issue"
        color="border-yellow-700"
        glow={stats.mtbf !== null ? "shadow-[0_0_15px_rgba(234,179,8,0.15)]" : ""}
      />
    </div>
  );
}