import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu, ChevronUp, ChevronDown } from "lucide-react";

const TOOLTIP_STYLE = { backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' };

function getRatingColor(value, thresholds, higherIsBetter = true) {
  const [good, bad] = thresholds;
  if (higherIsBetter) {
    if (value >= good) return 'text-green-400';
    if (value >= bad) return 'text-yellow-400';
    return 'text-red-400';
  } else {
    if (value <= good) return 'text-green-400';
    if (value <= bad) return 'text-yellow-400';
    return 'text-red-400';
  }
}

function getRatingBg(value, thresholds, higherIsBetter = true) {
  const [good, bad] = thresholds;
  if (higherIsBetter) {
    if (value >= good) return 'bg-green-900/30 border-green-700 text-green-300';
    if (value >= bad) return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
    return 'bg-red-900/30 border-red-700 text-red-300';
  } else {
    if (value <= good) return 'bg-green-900/30 border-green-700 text-green-300';
    if (value <= bad) return 'bg-yellow-900/30 border-yellow-700 text-yellow-300';
    return 'bg-red-900/30 border-red-700 text-red-300';
  }
}

export default function ModelPerformanceCard({ machines, issues }) {
  const [sortKey, setSortKey] = useState('mtbf');
  const [sortDir, setSortDir] = useState('desc');

  const modelStats = useMemo(() => {
    // Group machines by model
    const modelMap = {};

    machines.forEach(machine => {
      const key = `${machine.manufacturer} ${machine.model}`.trim();
      if (!modelMap[key]) {
        modelMap[key] = { model: key, machines: [], issues: [] };
      }
      modelMap[key].machines.push(machine);
    });

    // Attach issues to models
    issues.forEach(issue => {
      const machine = machines.find(m => m.machine_id === issue.machine_id);
      if (!machine) return;
      const key = `${machine.manufacturer} ${machine.model}`.trim();
      if (modelMap[key]) {
        modelMap[key].issues.push(issue);
      }
    });

    return Object.values(modelMap).map(({ model, machines: mList, issues: iList }) => {
      const fleetSize = mList.length;
      const totalIssues = iList.length;

      // Calculate total machine-days in service for MTBF and normalized issue rate
      const now = new Date();
      let totalMachineDays = 0;
      mList.forEach(machine => {
        const installDate = machine.install_date ? new Date(machine.install_date) : null;
        if (installDate && !isNaN(installDate)) {
          totalMachineDays += Math.max(1, (now - installDate) / (1000 * 60 * 60 * 24));
        } else {
          // Fallback: assume 1 year of service
          totalMachineDays += 365;
        }
      });

      // MTBF: total machine-days / total issues (days between failures per machine)
      const mtbf = totalIssues > 0 ? totalMachineDays / totalIssues : totalMachineDays;

      // Issue Rate: issues per machine per year (normalized for fleet size AND time in service)
      const avgMachineDays = totalMachineDays / fleetSize;
      const issueRatePerMachinePerYear = avgMachineDays > 0
        ? (totalIssues / fleetSize) / (avgMachineDays / 365)
        : 0;

      // MTBF OOS: total machine-days / out-of-service issues only
      const outOfServiceIssues = iList.filter(i => i.service_status === 'out_of_service').length;
      const mtbfOos = outOfServiceIssues > 0 ? totalMachineDays / outOfServiceIssues : null;
      const outOfServiceRate = totalIssues > 0 ? (outOfServiceIssues / totalIssues) * 100 : 0;

      // Avg Resolution Time (days) for resolved issues
      const resolvedIssues = iList.filter(i => i.resolved && i.resolved_date);
      const avgResolutionDays = resolvedIssues.length > 0
        ? resolvedIssues.reduce((sum, i) => {
            return sum + (new Date(i.resolved_date) - new Date(i.reported_date)) / (1000 * 60 * 60 * 24);
          }, 0) / resolvedIssues.length
        : null;

      return {
        model,
        fleetSize,
        totalIssues,
        mtbf: parseFloat(mtbf.toFixed(1)),
        mtbfOos: mtbfOos !== null ? parseFloat(mtbfOos.toFixed(1)) : null,
        issueRatePerMachinePerYear: parseFloat(issueRatePerMachinePerYear.toFixed(2)),
        outOfServiceRate: parseFloat(outOfServiceRate.toFixed(1)),
        avgResolutionDays: avgResolutionDays !== null ? parseFloat(avgResolutionDays.toFixed(1)) : null,
      };
    }).filter(s => s.fleetSize > 0);
  }, [machines, issues]);

  const sorted = useMemo(() => {
    return [...modelStats].sort((a, b) => {
      let aVal = a[sortKey] ?? -1;
      let bVal = b[sortKey] ?? -1;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [modelStats, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      // Default: higher MTBF = better (desc), lower issue rate = better (asc), etc.
      setSortDir(key === 'mtbf' || key === 'fleetSize' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-slate-600" />;
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-blue-400" />
      : <ChevronUp className="w-3 h-3 text-blue-400" />;
  };

  const Th = ({ col, children, title }) => (
    <th
      className="py-3 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
      title={title}
    >
      <span className="flex items-center gap-1">
        {children}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <Card className="border border-slate-700 shadow-lg bg-slate-800 mb-6">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          Model Performance Leaderboard
          <span className="text-xs font-normal text-slate-400 ml-2">Click column headers to sort</span>
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Metrics are normalized for fleet size and time in service for fair comparison across all models.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-slate-700 bg-slate-800/80">
              <tr>
                <Th col="model" title="Model name">Model</Th>
                <Th col="fleetSize" title="Total machines across all casinos">Fleet</Th>
                <Th col="mtbf" title="Mean Time Between Failures: avg days between issues per machine. Higher = more reliable.">MTBF (days) ↑</Th>
                <Th col="mtbfOos" title="Mean Time Between Failures counting only Out of Service issues. Higher = more reliable.">MTBF OOS (days) ↑</Th>
                <Th col="issueRatePerMachinePerYear" title="Issues per machine per year, normalized for fleet size and install age. Lower = better.">Issues/Machine/Yr ↓</Th>
                <Th col="outOfServiceRate" title="Percentage of issues where machine was taken out of service. Lower = less severe failures.">Out-of-Svc Rate ↓</Th>
                <Th col="avgResolutionDays" title="Average days to resolve an issue. Lower = faster to fix.">Avg Fix Time ↓</Th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Health</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                // Composite health score: weighted blend
                const mtbfScore = Math.min(100, (row.mtbf / 180) * 100); // 180+ days MTBF = perfect
                const issueRateScore = Math.max(0, 100 - (row.issueRatePerMachinePerYear * 20)); // 0 issues/yr = 100
                const oosScore = Math.max(0, 100 - row.outOfServiceRate); // 0% OOS = 100
                const fixScore = row.avgResolutionDays !== null
                  ? Math.max(0, 100 - (row.avgResolutionDays * 10)) // 0 days = 100
                  : 70; // neutral if no data
                const health = Math.round((mtbfScore * 0.35 + issueRateScore * 0.30 + oosScore * 0.20 + fixScore * 0.15));

                const healthBadge = health >= 70
                  ? 'bg-green-900/30 border-green-700 text-green-300'
                  : health >= 40
                  ? 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
                  : 'bg-red-900/30 border-red-700 text-red-300';

                const healthLabel = health >= 70 ? 'Good' : health >= 40 ? 'Fair' : 'Poor';

                return (
                  <tr key={row.model} className={`border-b border-slate-700/50 ${i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'} hover:bg-slate-700/50 transition-colors`}>
                    <td className="py-3 px-3">
                      <div className="font-medium text-white text-sm">{row.model}</div>
                      <div className="text-xs text-slate-500">{row.totalIssues} total issues</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-slate-300 font-semibold">{row.fleetSize}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${getRatingColor(row.mtbf, [90, 30], true)}`}>
                        {row.mtbf.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {row.mtbfOos !== null ? (
                        <span className={`font-semibold ${getRatingColor(row.mtbfOos, [90, 30], true)}`}>
                          {row.mtbfOos.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">No OOS</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${getRatingColor(row.issueRatePerMachinePerYear, [1, 3], false)}`}>
                        {row.issueRatePerMachinePerYear}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`font-semibold ${getRatingColor(row.outOfServiceRate, [20, 50], false)}`}>
                        {row.outOfServiceRate}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {row.avgResolutionDays !== null ? (
                        <span className={`font-semibold ${getRatingColor(row.avgResolutionDays, [3, 7], false)}`}>
                          {row.avgResolutionDays}d
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">No data</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <Badge className={`border text-xs font-semibold ${healthBadge}`}>
                        {healthLabel} ({health})
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No model data available yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 py-3 border-t border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500">
          <span><span className="text-green-400 font-semibold">Green</span> = Good performance</span>
          <span><span className="text-yellow-400 font-semibold">Yellow</span> = Fair performance</span>
          <span><span className="text-red-400 font-semibold">Red</span> = Needs attention</span>
          <span className="ml-auto">MTBF ↑ = Higher is better &nbsp;|&nbsp; Issues/Yr ↓ = Lower is better</span>
        </div>
      </CardContent>
    </Card>
  );
}