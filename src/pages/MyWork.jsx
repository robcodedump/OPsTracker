const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useMemo } from "react";

import { format, startOfWeek, endOfWeek, differenceInDays, isWithinInterval, startOfDay, endOfDay, subDays } from "date-fns";
import MyWorkHeroStats from "../components/mywork/MyWorkHeroStats";
import MyWorkWeeklyJournal from "../components/mywork/MyWorkWeeklyJournal";
import MyWorkPeriodSelector from "../components/mywork/MyWorkPeriodSelector";
import { User } from "@/entities/User";

export default function MyWork() {
  const [currentUser, setCurrentUser] = useState(null);
  const [issues, setIssues] = useState([]);
  const [ramClears, setRamClears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("last30");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const casinoData =
        localStorage.getItem("selected_casino") ||
        localStorage.getItem("anonymous_casino") ||
        sessionStorage.getItem("selected_casino");

      const casino = casinoData ? JSON.parse(casinoData) : null;
      const user = await db.auth.me();
      setCurrentUser(user);

      const filters = casino?.id ? { casino_id: casino.id } : {};

      const [allIssues, allRamClears] = await Promise.all([
        db.entities.Issue.filter(filters, "-resolved_date"),
        db.entities.RamClear.filter(filters, "-checked_date"),
      ]);

      setIssues(allIssues);
      setRamClears(allRamClears);
    } catch (err) {
      console.error("Error loading My Work data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Compute date range for the selected period
  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "last30") {
      return { start: subDays(now, 30), end: now };
    }
    if (period === "trimester") {
      const m = now.getMonth();
      let start, end;
      if (m >= 3 && m <= 6) { start = new Date(now.getFullYear(), 3, 1); end = new Date(now.getFullYear(), 6, 31); }
      else if (m >= 7 && m <= 10) { start = new Date(now.getFullYear(), 7, 1); end = new Date(now.getFullYear(), 10, 30); }
      else {
        if (m >= 11) { start = new Date(now.getFullYear(), 11, 1); end = new Date(now.getFullYear() + 1, 2, 31); }
        else { start = new Date(now.getFullYear() - 1, 11, 1); end = new Date(now.getFullYear(), 2, 31); }
      }
      return { start, end };
    }
    if (period === "fiscal") {
      const fiscalStart = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1)
        : new Date(now.getFullYear() - 1, 3, 1);
      return { start: fiscalStart, end: new Date(fiscalStart.getFullYear() + 1, 2, 31) };
    }
    if (period === "custom" && customRange.start && customRange.end) {
      return { start: new Date(customRange.start), end: new Date(customRange.end) };
    }
    return { start: subDays(now, 30), end: now };
  }, [period, customRange]);

  // Filter data to current user and period
  const myResolvedIssues = useMemo(() => {
    if (!currentUser) return [];
    return issues.filter(issue => {
      if (!issue.resolved || !issue.resolved_date) return false;
      const resolvedDate = new Date(issue.resolved_date);
      const assignedToMe =
        issue.assigned_technician_email === currentUser.email ||
        issue.created_by === currentUser.email;
      const inRange = isWithinInterval(resolvedDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
      return assignedToMe && inRange;
    });
  }, [issues, currentUser, dateRange]);

  const myRamClears = useMemo(() => {
    if (!currentUser) return [];
    return ramClears.filter(rc => {
      if (!rc.checked || !rc.checked_date) return false;
      const checkedDate = new Date(rc.checked_date);
      const byMe = rc.checked_by === currentUser.email || rc.checked_by === currentUser.full_name;
      const inRange = isWithinInterval(checkedDate, {
        start: startOfDay(dateRange.start),
        end: endOfDay(dateRange.end),
      });
      return byMe && inRange;
    });
  }, [ramClears, currentUser, dateRange]);

  // Stats calculations
  const stats = useMemo(() => {
    const resolved = myResolvedIssues.length;

    const avgFixDays = myResolvedIssues.length > 0
      ? myResolvedIssues.reduce((sum, i) => {
          const days = differenceInDays(new Date(i.resolved_date), new Date(i.reported_date));
          return sum + Math.max(0, days);
        }, 0) / myResolvedIssues.length
      : null;

    // MTBF: look at all machines I touched — total days in range / issues resolved
    const rangeDays = differenceInDays(dateRange.end, dateRange.start) || 1;
    const mtbf = resolved > 0 ? (rangeDays / resolved) : null;

    return {
      resolved,
      avgFixDays: avgFixDays !== null ? parseFloat(avgFixDays.toFixed(1)) : null,
      ramClears: myRamClears.length,
      mtbf: mtbf !== null ? parseFloat(mtbf.toFixed(1)) : null,
    };
  }, [myResolvedIssues, myRamClears, dateRange]);

  // Build weekly journal entries
  const weeklyGroups = useMemo(() => {
    // Combine all events
    const events = [
      ...myResolvedIssues.map(i => ({
        type: "resolved",
        date: new Date(i.resolved_date),
        label: `${i.area}-${i.section}-${i.location}`,
        description: i.issue_description,
        fixDays: differenceInDays(new Date(i.resolved_date), new Date(i.reported_date)),
        serviceStatus: i.service_status,
      })),
      ...myRamClears.map(rc => ({
        type: "ramclear",
        date: new Date(rc.checked_date),
        label: `${rc.area}-${rc.section}-${rc.location}`,
        description: rc.completion_notes || "RAM clear verified",
        rtp: rc.current_rtp,
        maxBet: rc.max_bet,
      })),
    ].sort((a, b) => b.date - a.date);

    // Group by week
    const groups = {};
    events.forEach(ev => {
      const weekKey = format(startOfWeek(ev.date, { weekStartsOn: 1 }), "yyyy-MM-dd");
      if (!groups[weekKey]) {
        groups[weekKey] = {
          weekStart: startOfWeek(ev.date, { weekStartsOn: 1 }),
          weekEnd: endOfWeek(ev.date, { weekStartsOn: 1 }),
          events: [],
        };
      }
      groups[weekKey].events.push(ev);
    });

    return Object.values(groups).sort((a, b) => b.weekStart - a.weekStart);
  }, [myResolvedIssues, myRamClears]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">My Work</h1>
          <p className="text-slate-400 mt-1">
            {currentUser?.full_name
              ? `${currentUser.full_name}'s performance summary`
              : "Your performance summary"}
          </p>
        </div>

        {/* Period Selector */}
        <MyWorkPeriodSelector
          period={period}
          setPeriod={setPeriod}
          customRange={customRange}
          setCustomRange={setCustomRange}
          dateRange={dateRange}
        />

        {/* Hero Stats */}
        <MyWorkHeroStats stats={stats} />

        {/* Weekly Journal */}
        <MyWorkWeeklyJournal weeklyGroups={weeklyGroups} />
      </div>
    </div>
  );
}