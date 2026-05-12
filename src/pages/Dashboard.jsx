const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { SlotMachine, MaintenanceRecord, Issue } from "@/entities/all";

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Plus, 
  Cog, 
  ClipboardCheck, 
  AlertTriangle,
  TrendingUp
} from "lucide-react";

import StatsCard from "../components/dashboard/StatsCard";
import MaintenanceOverview from "../components/dashboard/MaintenanceOverview";
import SyncIndicator from "../components/dashboard/SyncIndicator";
import ActionItemsSection from "../components/dashboard/ActionItemsSection";
import IssuesStatsCard from "../components/dashboard/IssuesStatsCard";
import AddIssueDialog from "../components/issues/AddIssueDialog";
import ProblemMachinesWidget from "../components/dashboard/ProblemMachinesWidget";
import MaintenanceByUserWidget from "../components/dashboard/MaintenanceByUserWidget";
import TrendingModelCard from "../components/dashboard/TrendingModelCard";
import LowestUptimeModelsCard from "../components/dashboard/LowestUptimeModelsCard";
import JokeOfTheDayCard from "../components/dashboard/JokeOfTheDayCard";
import ReportBankDialog from "../components/issues/ReportBankDialog";
import ReportRamClearDialog from "../components/ram-clears/ReportRamClearDialog";

export default function Dashboard() {
  const [machines, setMachines] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Effect to check if user is anonymous
  useEffect(() => {
    const anonCasino = localStorage.getItem('anonymous_casino') || sessionStorage.getItem('anonymous_casino');
    setIsAnonymous(!!anonCasino);
  }, []);

  const loadData = async () => {
    try {
      // Use localStorage for persistent casino selection (fallback to sessionStorage for compatibility)
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino') || 
                        sessionStorage.getItem('anonymous_casino');
      
      if (!casinoData) {
        console.error('No casino selected or found in storage.');
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        console.error('Invalid casino data: casino object or ID is missing.');
        setLoading(false);
        return;
      }
      
      const [machinesData, recordsData, issuesData] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        MaintenanceRecord.filter({ casino_id: casino.id }),
        Issue.filter({ casino_id: casino.id }, '-reported_date')
      ]);
      
      setMachines(machinesData);
      setMaintenanceRecords(recordsData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAdded = async (issueData) => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                         localStorage.getItem('anonymous_casino') ||
                         sessionStorage.getItem('selected_casino') || 
                         sessionStorage.getItem('anonymous_casino');
      
      if (!casinoData) {
        console.error('No casino selected for adding issue.');
        return;
      }

      const casino = JSON.parse(casinoData);

      if (!casino || !casino.id) {
        console.error('Invalid casino data for adding issue.');
        return;
      }

      await Issue.create({ ...issueData, casino_id: casino.id });
      loadData();
    } catch (error) {
      console.error('Error adding issue:', error);
    }
  };

  const handleRamClearReported = async (ramClearData) => {
    try {
      await db.entities.RamClear.create(ramClearData);
      // No need to reload dashboard data for ram clears
    } catch (error) {
      console.error('Error reporting ram clear:', error);
    }
  };

  const getTrimesterDates = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    let trimester, startMonth, endMonth, startYear, endYear;
    if (currentMonth >= 3 && currentMonth <= 6) { // April (3) to July (6) -> T1 cycle: Apr-Jul
      trimester = 'T1';
      startMonth = 3; // April
      endMonth = 6; // July
      startYear = currentYear;
      endYear = currentYear;
    } else if (currentMonth >= 7 && currentMonth <= 10) { // Aug (7) to Nov (10) -> T2 cycle: Aug-Nov
      trimester = 'T2';
      startMonth = 7; // August
      endMonth = 10; // November
      startYear = currentYear;
      endYear = currentYear;
    } else { // Dec (11), Jan (0), Feb (1), Mar (2) -> T3 cycle: Dec-Mar
      trimester = 'T3';
      startMonth = 11; // December
      endMonth = 2; // March (of next year)
      if (currentMonth >= 11) { // If it's Dec, cycle starts this year, ends next year
        startYear = currentYear;
        endYear = currentYear + 1;
      } else { // If it's Jan, Feb, Mar, cycle started last year, ends this year
        startYear = currentYear - 1;
        endYear = currentYear;
      }
    }
    
    const startDate = new Date(startYear, startMonth, 1);
    const endDate = new Date(endYear, endMonth + 1, 0); // Correctly gets last day of endMonth
    const currentDateObj = new Date(); // Use a fresh object for current date for clarity
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((currentDateObj - startDate) / (1000 * 60 * 60 * 24));
    const percentDaysPassed = Math.min(100, Math.max(0, (daysPassed / totalDays) * 100)); // Ensure it's between 0 and 100
    
    return { trimester, startDate, endDate, totalDays, daysPassed, percentDaysPassed };
  };

  const formatDateRange = () => {
    const { startDate, endDate } = getTrimesterDates();
    const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startFormatted} - ${endFormatted}`;
  };

  const getStats = () => {
    const currentYear = new Date().getFullYear();
    const { trimester: currentTrimester } = getTrimesterDates();
    
    // Dynamic count of active machines
    const activeMachines = machines.filter(m => m.status === 'active').length;
    const totalMachines = machines.length;
    const maintenanceMachines = machines.filter(m => m.status === 'maintenance').length;
    
    const currentTrimesterRecords = maintenanceRecords.filter(
      r => r.year === currentYear && r.trimester === currentTrimester
    ).length;
    
    const completionRate = machines.length > 0 
      ? ((currentTrimesterRecords / machines.length) * 100).toFixed(0)
      : 0;

    const unresolvedIssues = issues.filter(i => !i.resolved).length;

    return {
      totalMachines,
      activeMachines,
      maintenanceMachines,
      completionRate,
      unresolvedIssues
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const stats = getStats();
  const { percentDaysPassed } = getTrimesterDates();

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Maintenance Dashboard
              </h1>
              <SyncIndicator />
            </div>
            <p className="mt-2 text-slate-400">
              Monitor and manage your slot machine maintenance operations
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto flex-wrap">
            <AddIssueDialog machines={machines} onIssueAdded={handleIssueAdded} />
            {!isAnonymous && (
              <>
                <ReportBankDialog machines={machines} onIssuesAdded={handleIssueAdded} />
                <ReportRamClearDialog machines={machines} onRamClearReported={handleRamClearReported} />
              </>
            )}
            <Link to={createPageUrl("Maintenance")} className="flex-1 md:flex-none">
              <Button 
                className="w-full text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              >
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Track PMs
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-1 gap-6 mb-8">
          <ActionItemsSection issues={issues} machines={machines} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatsCard
            title={`${stats.activeMachines} active / ${stats.totalMachines} total`}
            value=""
            icon={TrendingUp}
            color="success"
            trend="Currently operational"
            customLayout={true}
          />
          <StatsCard
            title="Unresolved Issues"
            value={stats.unresolvedIssues}
            icon={AlertTriangle}
            color="danger"
            trend="Needs attention"
          />
          <StatsCard
            title="Current PM Cycle"
            subtitle={formatDateRange()}
            value={`${stats.completionRate}%`}
            icon={ClipboardCheck}
            color="primary"
            trend={`${percentDaysPassed.toFixed(0)}% of days passed`}
          />
          <TrendingModelCard issues={issues} machines={machines} />
          <LowestUptimeModelsCard issues={issues} machines={machines} />
        </div>

        <div className="grid lg:grid-cols-1 gap-6 mb-6">
          <IssuesStatsCard issues={issues} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <MaintenanceOverview 
            machines={machines}
            maintenanceRecords={maintenanceRecords}
          />
          <MaintenanceByUserWidget maintenanceRecords={maintenanceRecords} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <ProblemMachinesWidget 
            issues={issues}
            title="Top 5 Problem Machines (Last 90 Days)"
            limit={5}
            daysBack={90}
          />
          <ProblemMachinesWidget 
            issues={issues}
            title="Top 10 Problem Machines (All Time)"
            limit={10}
            daysBack={null}
          />
        </div>

        <div className="grid lg:grid-cols-1 gap-6 mb-6">
          <JokeOfTheDayCard />
        </div>

        {machines.length === 0 && (
          <div className="text-center py-12">
            <Cog className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2 text-white">
              No machines registered
            </h3>
            <p className="mb-6 text-slate-400">
              Start by adding your first slot machine to begin tracking maintenance.
            </p>
            <Link to={createPageUrl("Machines")}>
              <Button className="text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Add First Machine
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}