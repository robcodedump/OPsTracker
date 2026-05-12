import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { format, subDays, subYears, differenceInDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Returns the start/end of the last fiscal year (Apr 1 – Mar 31)
function getLastFiscalYear() {
  const today = new Date();
  const currentMonth = today.getMonth(); // April = 3
  const currentFYStart = currentMonth >= 3
    ? new Date(today.getFullYear(), 3, 1)
    : new Date(today.getFullYear() - 1, 3, 1);
  const lastFYStart = new Date(currentFYStart.getFullYear() - 1, 3, 1);
  const lastFYEnd = new Date(currentFYStart.getFullYear(), 2, 31, 23, 59, 59);
  return { start: lastFYStart, end: lastFYEnd };
}

export default function IssuesStatsCard({ issues }) {
  const [dateRange, setDateRange] = useState("year");

  const dateRanges = {
    fiscalYear: {
      label: "Last Fiscal Year",
      getValue: () => getLastFiscalYear().start,
      getEnd: () => getLastFiscalYear().end
    },
    year: {
      label: "Last Year",
      getValue: () => subYears(new Date(), 1),
      getEnd: () => null
    },
    month: {
      label: "Last 30 Days",
      getValue: () => subDays(new Date(), 30),
      getEnd: () => null
    },
    week: {
      label: "Last 7 Days",
      getValue: () => subDays(new Date(), 7),
      getEnd: () => null
    }
  };

  const filteredIssues = useMemo(() => {
    const rangeStart = dateRanges[dateRange].getValue();
    const rangeEnd = dateRanges[dateRange].getEnd ? dateRanges[dateRange].getEnd() : null;
    if (!rangeStart) return issues;

    return issues.filter(issue => {
      const issueDate = new Date(issue.reported_date);
      if (rangeEnd) return issueDate >= rangeStart && issueDate <= rangeEnd;
      return issueDate >= rangeStart;
    });
  }, [issues, dateRange]);

  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const inService = filteredIssues.filter(i => i.service_status === "in_service").length;
    const outOfService = filteredIssues.filter(i => i.service_status === "out_of_service").length;
    const resolved = filteredIssues.filter(i => i.resolved).length;
    const unresolved = total - resolved;

    const rangeStart = dateRanges[dateRange].getValue();
    const rangeEnd = dateRanges[dateRange].getEnd ? dateRanges[dateRange].getEnd() : null;
    const endDate = rangeEnd || new Date();

    const oldestIssue = filteredIssues.length > 0
      ? filteredIssues.reduce((oldest, issue) => {
          const issueDate = new Date(issue.reported_date);
          return issueDate < oldest ? issueDate : oldest;
        }, new Date(filteredIssues[0].reported_date))
      : new Date();

    const startDate = rangeStart || oldestIssue;
    const daysSinceStart = Math.max(1, differenceInDays(endDate, startDate));
    const weeksSinceStart = Math.max(1, daysSinceStart / 7);
    const monthsSinceStart = Math.max(1, daysSinceStart / 30);
    const yearsSinceStart = Math.max(1, daysSinceStart / 365);

    return {
      total,
      inService,
      outOfService,
      resolved,
      unresolved,
      avgPerDay: (total / daysSinceStart).toFixed(2),
      avgPerWeek: (total / weeksSinceStart).toFixed(2),
      avgPerMonth: (total / monthsSinceStart).toFixed(2),
      avgPerYear: (total / yearsSinceStart).toFixed(1)
    };
  }, [filteredIssues, dateRange]);

  const serviceStatusData = [
    { name: "In Service", value: stats.inService, color: "#00FF9D" },
    { name: "Out of Service", value: stats.outOfService, color: "#FF4444" }
  ].filter(item => item.value > 0);

  const resolutionData = [
    { name: "Resolved", value: stats.resolved, color: "#00FF9D" },
    { name: "Unresolved", value: stats.unresolved, color: "#FFA500" }
  ].filter(item => item.value > 0);

  const trendData = useMemo(() => {
    if (filteredIssues.length === 0) return [];

    const rangeStart = dateRanges[dateRange].getValue();
    const rangeEnd = dateRanges[dateRange].getEnd ? dateRanges[dateRange].getEnd() : null;
    const startDate = rangeStart || new Date(filteredIssues[0].reported_date);
    const endDate = rangeEnd || new Date();
    const daysDiff = differenceInDays(endDate, startDate);

    let groupBy = "day";
    let intervals = [];

    if (daysDiff <= 7) {
      groupBy = "day";
      for (let i = 0; i <= daysDiff; i++) {
        intervals.push(subDays(endDate, daysDiff - i));
      }
    } else if (daysDiff <= 60) {
      groupBy = "week";
      const weeks = Math.ceil(daysDiff / 7);
      for (let i = 0; i < weeks; i++) {
        intervals.push(subDays(endDate, (weeks - i - 1) * 7));
      }
    } else {
      groupBy = "month";
      const months = Math.ceil(daysDiff / 30);
      for (let i = 0; i < months; i++) {
        intervals.push(subDays(endDate, (months - i - 1) * 30));
      }
    }

    return intervals.map((intervalStart, index) => {
      const intervalEnd = intervals[index + 1] || endDate;
      const issuesInInterval = filteredIssues.filter(issue => {
        const issueDate = new Date(issue.reported_date);
        return issueDate >= intervalStart && issueDate < intervalEnd;
      });

      let label;
      if (groupBy === "day") {
        label = format(intervalStart, "MMM d");
      } else if (groupBy === "week") {
        label = `Week ${format(intervalStart, "MMM d")}`;
      } else {
        label = format(intervalStart, "MMM yyyy");
      }

      return {
        date: label,
        issues: issuesInInterval.length,
        inService: issuesInInterval.filter(i => i.service_status === "in_service").length,
        outOfService: issuesInInterval.filter(i => i.service_status === "out_of_service").length
      };
    });
  }, [filteredIssues, dateRange]);

  const statusBarData = [
    { name: "In Service", count: stats.inService, fill: "#00FF9D" },
    { name: "Out of Service", count: stats.outOfService, fill: "#FF4444" },
    { name: "Resolved", count: stats.resolved, fill: "#1E90FF" },
    { name: "Unresolved", count: stats.unresolved, fill: "#FFA500" }
  ].filter(item => item.count > 0);

  return (
    <Card className="border border-slate-700 bg-slate-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
            Issues Statistics
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(dateRanges).map(([key, { label }]) => (
              <Button
                key={key}
                size="sm"
                variant={dateRange === key ? "default" : "outline"}
                onClick={() => setDateRange(key)}
                className={
                  dateRange === key
                    ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white border-0"
                    : "border-slate-600 bg-slate-700 text-slate-300 hover:bg-slate-600"
                }
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
            <div className="text-sm text-slate-400">Total Issues</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-green-900/50">
            <div className="text-2xl font-bold text-green-400 mb-1">{stats.inService}</div>
            <div className="text-xs text-slate-400">In Service</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-red-900/50">
            <div className="text-2xl font-bold text-red-400 mb-1">{stats.outOfService}</div>
            <div className="text-xs text-slate-400">Out of Service</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-blue-900/50">
            <div className="text-2xl font-bold text-blue-400 mb-1">{stats.resolved}</div>
            <div className="text-xs text-slate-400">Resolved</div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-orange-900/50">
            <div className="text-2xl font-bold text-orange-400 mb-1">{stats.unresolved}</div>
            <div className="text-xs text-slate-400">Unresolved</div>
          </div>
        </div>

        {/* Averages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="text-lg font-semibold text-blue-400">{stats.avgPerDay}</div>
            <div className="text-xs text-slate-400">Avg per Day</div>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="text-lg font-semibold text-blue-400">{stats.avgPerWeek}</div>
            <div className="text-xs text-slate-400">Avg per Week</div>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="text-lg font-semibold text-blue-400">{stats.avgPerMonth}</div>
            <div className="text-xs text-slate-400">Avg per Month</div>
          </div>
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="text-lg font-semibold text-blue-400">{stats.avgPerYear}</div>
            <div className="text-xs text-slate-400">Avg per Year</div>
          </div>
        </div>

        {/* Charts */}
        {stats.total > 0 ? (
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Issues Trend Over Time
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#e2e8f0'
                    }}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8' }} />
                  <Line type="monotone" dataKey="issues" stroke="#1E90FF" strokeWidth={3} dot={{ fill: '#1E90FF', r: 4 }} activeDot={{ r: 6 }} name="Total Issues" />
                  <Line type="monotone" dataKey="inService" stroke="#00FF9D" strokeWidth={2} dot={{ fill: '#00FF9D', r: 3 }} name="In Service" />
                  <Line type="monotone" dataKey="outOfService" stroke="#FF4444" strokeWidth={2} dot={{ fill: '#FF4444', r: 3 }} name="Out of Service" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-white mb-4">Service Status Breakdown</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={serviceStatusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                      {serviceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-sm font-semibold text-white mb-4">Resolution Status</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={resolutionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                      {resolutionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                Issues by Status
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statusBarData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px', color: '#e2e8f0' }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {statusBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p>No issues found in the selected date range</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}