import React, { useState, useEffect } from "react";
import { Casino, SlotMachine, MaintenanceRecord, Issue } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, Clock, Activity } from "lucide-react";
import AIChatWidget from "../components/analytics/AIChatWidget";
import ModelPerformanceCard from "../components/analytics/ModelPerformanceCard";

export default function CasinoAnalytics() {
  const [casinos, setCasinos] = useState([]);
  const [machines, setMachines] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [casinosData, machinesData, recordsData, issuesData] = await Promise.all([
        Casino.list(),
        SlotMachine.list(),
        MaintenanceRecord.list(),
        Issue.list()
      ]);
      
      setCasinos(casinosData);
      setMachines(machinesData);
      setMaintenanceRecords(recordsData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMaintenanceProgressData = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    let currentTrimester;
    
    if (currentMonth >= 3 && currentMonth <= 6) {
      currentTrimester = 'T1';
    } else if (currentMonth >= 7 && currentMonth <= 10) {
      currentTrimester = 'T2';
    } else {
      currentTrimester = 'T3';
    }

    return casinos.map(casino => {
      const casinoMachines = machines.filter(m => m.casino_id === casino.id);
      const completed = maintenanceRecords.filter(r => 
        r.casino_id === casino.id &&
        r.year === currentYear &&
        r.trimester === currentTrimester
      ).length;
      const total = casinoMachines.length;
      const overdue = total - completed;

      return {
        name: casino.name,
        completed,
        overdue,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
      };
    });
  };

  const getAverageDowntimeData = () => {
    return casinos.map(casino => {
      const casinoMachines = machines.filter(m => m.casino_id === casino.id);
      let totalDowntimeHours = 0;
      let machineCount = 0;

      casinoMachines.forEach(machine => {
        const machineIssues = issues.filter(i => i.machine_id === machine.machine_id && i.service_status === 'out_of_service');
        
        machineIssues.forEach(issue => {
          const startDate = new Date(issue.reported_date);
          const endDate = issue.resolved && issue.resolved_date 
            ? new Date(issue.resolved_date)
            : new Date();
          
          const downtimeHours = (endDate - startDate) / (1000 * 60 * 60);
          totalDowntimeHours += downtimeHours;
        });
        
        machineCount++;
      });

      const avgDowntimeHours = machineCount > 0 ? totalDowntimeHours / machineCount : 0;

      return {
        name: casino.name,
        avgDowntime: parseFloat(avgDowntimeHours.toFixed(2)),
        avgDowntimeDays: parseFloat((avgDowntimeHours / 24).toFixed(2))
      };
    });
  };

  const getIssuesPerMonthData = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthData = { month: monthName };

      casinos.forEach(casino => {
        const casinoIssues = issues.filter(issue => {
          const issueDate = new Date(issue.reported_date);
          return issue.casino_id === casino.id &&
                 issueDate >= monthStart &&
                 issueDate <= monthEnd;
        });
        monthData[casino.name] = casinoIssues.length;
      });

      months.push(monthData);
    }

    return months;
  };

  const getResolutionTimeByStatus = (serviceStatus) => {
    return casinos.map(casino => {
      const casinoIssues = issues.filter(i =>
        i.casino_id === casino.id &&
        i.resolved &&
        i.resolved_date &&
        i.service_status === serviceStatus
      );

      if (casinoIssues.length === 0) {
        return { name: casino.name, avgResolutionDays: 0 };
      }

      const totalDays = casinoIssues.reduce((sum, issue) => {
        const days = (new Date(issue.resolved_date) - new Date(issue.reported_date)) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);

      return {
        name: casino.name,
        avgResolutionDays: parseFloat((totalDays / casinoIssues.length).toFixed(2))
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const maintenanceProgressData = getMaintenanceProgressData();
  const downtimeData = getAverageDowntimeData();
  const issuesPerMonthData = getIssuesPerMonthData();
  const resolutionOutOfServiceData = getResolutionTimeByStatus('out_of_service');
  const resolutionInServiceData = getResolutionTimeByStatus('in_service');

  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Casino Analytics
          </h1>
          <p className="text-slate-400">
            Compare performance metrics across all casino locations
          </p>
        </div>

        <AIChatWidget />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Maintenance Progress (Current Trimester)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceProgressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="completed" fill="#10b981" name="Completed" />
                  <Bar dataKey="overdue" fill="#ef4444" name="Overdue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-400" />
                Average Machine Downtime (Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={downtimeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="avgDowntimeDays" fill="#ef4444" name="Avg Downtime (Days)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Issues Per Month (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={issuesPerMonthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#f1f5f9' }}
                />
                <Legend />
                {casinos.map((casino, index) => (
                  <Line 
                    key={casino.id}
                    type="monotone" 
                    dataKey={casino.name} 
                    stroke={colors[index % colors.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <ModelPerformanceCard machines={machines} issues={issues} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-400" />
                Avg Resolution — Out of Service (Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionOutOfServiceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="avgResolutionDays" fill="#ef4444" name="Avg Resolution (Days)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-400" />
                Avg Resolution — In Service (Days)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={resolutionInServiceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '0.5rem' }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Legend />
                  <Bar dataKey="avgResolutionDays" fill="#10b981" name="Avg Resolution (Days)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}