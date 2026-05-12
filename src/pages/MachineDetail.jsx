const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { SlotMachine, MaintenanceRecord, Issue } from "@/entities/all";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Wrench, AlertTriangle, Activity, Clock, TrendingUp, Calendar, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import AddIssueDialog from "../components/issues/AddIssueDialog";
import IssueNotesTimeline from "../components/machine-detail/IssueNotesTimeline";

export default function MachineDetail() {
  const [machine, setMachine] = useState(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [issues, setIssues] = useState([]);
  const [ramClears, setRamClears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allMachines, setAllMachines] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is Site Staff (anonymous)
    const anonCasino = localStorage.getItem('anonymous_casino') || sessionStorage.getItem('anonymous_casino');
    setIsAnonymous(!!anonCasino);
    
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const machineId = urlParams.get('id');
      
      if (!machineId) {
        console.error('No machine ID provided');
        setLoading(false);
        return;
      }

      // Use localStorage for persistent casino selection
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        console.error('No casino selected');
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        console.error('Invalid casino data');
        setLoading(false);
        return;
      }
      
      const [allMachinesData, recordsData, issuesData] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        MaintenanceRecord.filter({ casino_id: casino.id, machine_id: machineId }),
        Issue.filter({ casino_id: casino.id, machine_id: machineId }, '-reported_date')
      ]);
      
      setAllMachines(allMachinesData);
      
      const foundMachine = allMachinesData.find(m => m.machine_id === machineId);
      if (foundMachine) {
        setMachine(foundMachine);
        setMaintenanceRecords(recordsData);
        setIssues(issuesData);
        
        // Fetch Ram Clears for this machine's A-S-L
        const ramClearsData = await db.entities.RamClear.filter({ 
          casino_id: casino.id,
          area: foundMachine.area,
          section: foundMachine.section,
          location: foundMachine.location
        });
        setRamClears(ramClearsData);
      } else {
        setMachine(null);
      }
    } catch (error) {
      console.error('Error loading machine data:', error);
      setMachine(null);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueAdded = async (issueData) => {
    try {
      await Issue.create(issueData);
      // If the user is anonymous (Site Staff), auto-navigate to the Issues page after submission
      if (isAnonymous) {
        navigate(createPageUrl("Issues"));
      } else {
        // For non-anonymous users, just reload the data on the current page
        loadData();
      }
    } catch (error) {
      console.error('Error adding issue:', error);
      // Optionally, show a toast or alert to the user about the error
    }
  };

  const calculateUptime = () => {
    if (!machine) return 100;
    
    const machineStartDate = machine.install_date ? new Date(machine.install_date) : new Date(machine.created_date);
    const currentDate = new Date();
    const lifetimeHours = (currentDate - machineStartDate) / (1000 * 60 * 60);
    
    if (lifetimeHours <= 0) return 100;
    
    let totalDowntimeHours = 0;
    
    issues.forEach(issue => {
      if (issue.service_status === 'out_of_service') {
        const startDate = new Date(issue.reported_date);
        const endDate = issue.resolved && issue.resolved_date 
          ? new Date(issue.resolved_date) 
          : currentDate;
        
        const downtimeHours = (endDate - startDate) / (1000 * 60 * 60);
        totalDowntimeHours += downtimeHours;
      }
    });
    
    const uptimeHours = lifetimeHours - totalDowntimeHours;
    const uptimePercentage = (uptimeHours / lifetimeHours) * 100;
    
    return Math.max(0, Math.min(100, uptimePercentage));
  };

  const calculateMTBF = () => {
    if (issues.length === 0 || !machine) return 'N/A';
    
    const machineStartDate = machine.install_date ? new Date(machine.install_date) : new Date(machine.created_date);
    const currentDate = new Date();
    const lifetimeHours = (currentDate - machineStartDate) / (1000 * 60 * 60);
    
    // MTBF is typically total operating time / number of failures.
    // For simplicity here, assuming each issue is a failure, and operating time is total lifetime - downtime.
    // However, if all issues count as failures, then just lifetime / num_issues is a common simplification.
    // Let's use the simplified version for now.
    const mtbfHours = lifetimeHours / issues.length;
    
    if (mtbfHours >= 24) {
      return `${(mtbfHours / 24).toFixed(1)} days`;
    }
    return `${mtbfHours.toFixed(1)} hours`;
  };

  const getIssuesInPeriod = (days) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return issues.filter(issue => new Date(issue.reported_date) >= cutoffDate).length;
  };

  const calculateAverageResolutionTime = () => {
    const resolvedIssues = issues.filter(issue => issue.resolved && issue.resolved_date);
    
    if (resolvedIssues.length === 0) return 'N/A';
    
    const totalDays = resolvedIssues.reduce((sum, issue) => {
      const reported = new Date(issue.reported_date);
      const resolved = new Date(issue.resolved_date);
      const days = (resolved - reported) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    
    return `${(totalDays / resolvedIssues.length).toFixed(1)} days`;
  };

  const getConsolidatedHistory = () => {
    const history = [];
    
    maintenanceRecords.forEach(record => {
      history.push({
        type: 'maintenance',
        date: new Date(record.maintenance_date),
        data: record
      });
    });
    
    issues.forEach(issue => {
      history.push({
        type: 'issue',
        date: new Date(issue.reported_date),
        data: issue
      });
    });
    
    ramClears.forEach(clear => {
      history.push({
        type: 'ramclear',
        date: new Date(clear.clear_date),
        data: clear
      });
    });
    
    return history.sort((a, b) => b.date - a.date);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'maintenance': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'inactive': return 'bg-red-900/50 text-red-300 border-red-700';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getUptimeColor = (percentage) => {
    if (percentage >= 99) return 'text-green-400';
    if (percentage >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen p-6 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-white mb-4">Machine Not Found</h2>
            <Link to={createPageUrl(isAnonymous ? "Issues" : "Machines")}>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isAnonymous ? 'Back to Issues' : 'Back to Machines'}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const uptime = calculateUptime();
  const mtbf = calculateMTBF();
  const issues30Days = getIssuesInPeriod(30);
  const issues90Days = getIssuesInPeriod(90);
  const avgResolutionTime = calculateAverageResolutionTime();
  const consolidatedHistory = getConsolidatedHistory();

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <Link to={createPageUrl(isAnonymous ? "Issues" : "Machines")}>
              <Button variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isAnonymous ? 'Back to Issues' : 'Back to Machines'}
              </Button>
            </Link>
            {machine && isAnonymous && (
              <AddIssueDialog 
                machines={allMachines} 
                onIssueAdded={handleIssueAdded} 
                initialSelectedMachineId={machine.machine_id} 
              />
            )}
          </div>
          {/* Updated header to prioritize A-S-L location */}
          <h1 className="text-4xl font-bold text-white mb-2">
            {machine ? `${machine.area}-${machine.section}-${machine.location}` : 'Machine Details'}
          </h1>
          {machine && (
            <p className="text-sm text-slate-500">
              {machine.machine_id}
            </p>
          )}
        </div>

        <Card className="mb-6 border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-white mb-2">
                  {machine.manufacturer} {machine.model}
                </CardTitle>
                {machine.theme && (
                  <p className="text-slate-500 text-sm mt-1">
                    Theme: {machine.theme}
                  </p>
                )}
              </div>
              <Badge className={`${getStatusColor(machine.status)} border`}>
                {machine.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-slate-400">Serial Number</p>
                <p className="text-lg font-semibold text-white">
                  {machine.serial_number || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Install Date</p>
                <p className="text-lg font-semibold text-white">
                  {machine.install_date ? format(new Date(machine.install_date), 'MMM d, yyyy') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Age</p>
                <p className="text-lg font-semibold text-white">
                  {machine.install_date 
                    ? `${Math.floor((new Date() - new Date(machine.install_date)) / (1000 * 60 * 60 * 24 * 365))} years`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Uptime</p>
                  <p className={`text-3xl font-bold ${getUptimeColor(uptime)}`}>
                    {uptime.toFixed(1)}%
                  </p>
                </div>
                <Activity className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">MTBF</p>
                  <p className="text-3xl font-bold text-white">
                    {mtbf}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Issues (30d)</p>
                  <p className="text-3xl font-bold text-white">
                    {issues30Days}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Issues (90d)</p>
                  <p className="text-3xl font-bold text-white">
                    {issues90Days}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-700 shadow-lg bg-slate-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 mb-1">Avg Resolution</p>
                  <p className="text-2xl font-bold text-white">
                    {avgResolutionTime}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {issues.length > 0 && (
          <div className="mb-6">
            <IssueNotesTimeline issues={issues} />
          </div>
        )}

        <Card className="border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              History Log
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {consolidatedHistory.length > 0 ? (
              <div className="space-y-4">
                {consolidatedHistory.map((entry, index) => (
                  <div 
                    key={index}
                    className="flex gap-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600"
                  >
                    <div className="flex-shrink-0">
                      {entry.type === 'maintenance' ? (
                        <div className="w-10 h-10 rounded-full bg-blue-900/30 border border-blue-700 flex items-center justify-center">
                          <Wrench className="w-5 h-5 text-blue-400" />
                        </div>
                      ) : entry.type === 'ramclear' ? (
                        <div className="w-10 h-10 rounded-full bg-purple-900/30 border border-purple-700 flex items-center justify-center">
                          <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-white">
                            {entry.type === 'maintenance' ? 'Maintenance Record' : entry.type === 'ramclear' ? 'Ram Clear' : 'Issue Reported'}
                          </h4>
                          <p className="text-sm text-slate-400">
                            {format(entry.date, 'MMM d, yyyy')}
                          </p>
                        </div>
                        {entry.type === 'maintenance' ? (
                          <Badge className="bg-blue-900/50 text-blue-300 border-blue-700 border">
                            {entry.data.trimester} {entry.data.year}
                          </Badge>
                        ) : entry.type === 'ramclear' ? (
                          <Badge className={
                            entry.data.checked 
                              ? 'bg-green-900/50 text-green-300 border-green-700 border'
                              : 'bg-purple-900/50 text-purple-300 border-purple-700 border'
                          }>
                            {entry.data.checked ? 'Checked' : 'Pending'}
                          </Badge>
                        ) : (
                          <Badge className={
                            entry.data.resolved 
                              ? 'bg-green-900/50 text-green-300 border-green-700 border'
                              : 'bg-orange-900/50 text-orange-300 border-orange-700 border'
                          }>
                            {entry.data.resolved ? 'Resolved' : 'Open'}
                          </Badge>
                        )}
                      </div>
                      {entry.type === 'maintenance' ? (
                        <div className="space-y-1">
                          <p className="text-slate-300">
                            Technician: {entry.data.technician}
                          </p>
                          {entry.data.notes && (
                            <p className="text-sm text-slate-400">
                              {entry.data.notes}
                            </p>
                          )}
                        </div>
                      ) : entry.type === 'ramclear' ? (
                        <div className="space-y-1">
                          <p className="text-slate-300">
                            RTP: {entry.data.current_rtp}% • Max Bet: {entry.data.max_bet}
                          </p>
                          {entry.data.checked && entry.data.checked_by && (
                            <p className="text-sm text-slate-400">
                              Checked by: {entry.data.checked_by}
                            </p>
                          )}
                          {entry.data.completion_notes && (
                            <p className="text-sm text-slate-400">
                              {entry.data.completion_notes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-slate-300">
                            {entry.data.issue_description}
                          </p>
                          <p className="text-sm text-slate-400">
                            Status: {entry.data.service_status === 'in_service' ? 'In Service' : 'Out of Service'}
                          </p>
                          {entry.data.resolved && entry.data.resolved_date && (
                            <p className="text-sm text-green-400">
                              Resolved: {format(new Date(entry.data.resolved_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-slate-400">No history records found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}