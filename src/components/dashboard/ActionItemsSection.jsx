const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  AlertTriangle, 
  Wrench, 
  ClipboardCheck, 
  ChevronRight,
  Clock,
  AlertCircle,
  Zap
} from "lucide-react";
import { format, differenceInDays, addDays, addMonths } from "date-fns";

export default function ActionItemsSection({ issues, machines }) {
  const [equipment, setEquipment] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [ramClears, setRamClears] = useState([]);
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    loadData();
    db.auth.me().then(u => setCurrentUserEmail(u?.email || null)).catch(() => {});
  }, []);

  const loadData = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        setEquipmentLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      if (!casino || !casino.id) {
        setEquipmentLoading(false);
        return;
      }
      
      const [equipmentData, maintenanceData, ramClearsData] = await Promise.all([
        db.entities.Equipment.filter({ casino_id: casino.id }),
        db.entities.MaintenanceRecord.filter({ casino_id: casino.id }),
        db.entities.RamClear.filter({ casino_id: casino.id })
      ]);

      setEquipment(equipmentData);
      setMaintenanceRecords(maintenanceData);
      setRamClears(ramClearsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setEquipmentLoading(false);
    }
  };

  // Get unresolved issues, sorted so assigned-to-me appear first
  const unresolvedIssues = [...issues.filter(i => !i.resolved)].sort((a, b) => {
    const aMine = a.assigned_technician_email === currentUserEmail ? -1 : 1;
    const bMine = b.assigned_technician_email === currentUserEmail ? -1 : 1;
    return aMine - bMine;
  });

  // PM Status calculations for equipment
  const getPMCycleDays = (cycle) => {
    switch (cycle) {
      case 'bi-weekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'yearly': return 365;
      default: return 30;
    }
  };

  const calculatePMStatus = (item) => {
    const baseDate = item.last_pm_date 
      ? new Date(item.last_pm_date)
      : (item.install_date ? new Date(item.install_date) : new Date());
    
    const cycleDays = getPMCycleDays(item.pm_cycle);
    
    let nextPMDate;
    if (item.pm_cycle === 'monthly') {
      const lastPMDate = item.last_pm_date ? new Date(item.last_pm_date) : (item.install_date ? new Date(item.install_date) : new Date());
      nextPMDate = addMonths(lastPMDate, 1);
    } else {
      nextPMDate = addDays(baseDate, cycleDays);
    }
    
    const today = new Date();
    const daysUntilDue = differenceInDays(nextPMDate, today);
    
    let status = 'normal';
    if (daysUntilDue < 0) {
      status = 'overdue';
    } else if (daysUntilDue <= 7) {
      status = 'warning';
    }
    
    return {
      status,
      nextPMDate,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      isWarning: daysUntilDue >= 0 && daysUntilDue <= 7
    };
  };

  // Get equipment with PM due soon or overdue
  const pmActionItems = equipment
    .map(item => ({
      ...item,
      pmStatus: calculatePMStatus(item)
    }))
    .filter(item => item.pmStatus.status === 'warning' || item.pmStatus.status === 'overdue')
    .sort((a, b) => a.pmStatus.daysUntilDue - b.pmStatus.daysUntilDue);

  // Get next machine needing PM (from slot machines)
  const getNextPMMachine = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    let currentTrimester;
    if (currentMonth >= 3 && currentMonth <= 6) {
      currentTrimester = 'T1';
    } else if (currentMonth >= 7 && currentMonth <= 10) {
      currentTrimester = 'T2';
    } else {
      currentTrimester = 'T3';
    }

    // Get machine IDs that have completed PM in current cycle
    const completedMachineIds = maintenanceRecords
      .filter(r => r.year === currentYear && r.trimester === currentTrimester && r.completed)
      .map(r => r.machine_id);

    // Get active machines that haven't completed PM in current cycle
    const eligibleMachines = machines
      .filter(m => m.status === 'active' && !completedMachineIds.includes(m.machine_id));

    // Sort by A-S-L (lowest first)
    const sortedMachines = eligibleMachines.sort((a, b) => {
      // Compare area first
      const areaCompare = String(a.area).localeCompare(String(b.area), undefined, { numeric: true });
      if (areaCompare !== 0) return areaCompare;
      
      // Then section
      const sectionCompare = String(a.section).localeCompare(String(b.section), undefined, { numeric: true });
      if (sectionCompare !== 0) return sectionCompare;
      
      // Then location
      return String(a.location).localeCompare(String(b.location), undefined, { numeric: true });
    });

    return sortedMachines.length > 0 ? sortedMachines[0] : null;
  };

  const nextPMMachine = getNextPMMachine();
  
  // Get pending ram clears
  const pendingRamClears = ramClears.filter(rc => !rc.checked);

  const getEquipmentTypeLabel = (type) => {
    const labels = {
      shuffler: 'Shuffler',
      id_scanner: 'ID Scanner',
      sign: 'Sign',
      progressive_server: 'Progressive Server',
      computer: 'Computer',
      printer: 'Printer'
    };
    return labels[type] || type;
  };

  return (
    <Card className="border border-slate-700 bg-slate-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-400" />
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Open Issues Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                Open Issues ({unresolvedIssues.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {unresolvedIssues.length > 0 ? (
                unresolvedIssues.slice(0, 5).map((issue) => {
                  const isAssignedToMe = currentUserEmail && issue.assigned_technician_email === currentUserEmail;
                  return (
                    <Link 
                      key={issue.id} 
                      to={createPageUrl(`Issues?highlight=${issue.id}`)}
                      className="block"
                    >
                      <div className={`p-3 rounded-lg border transition-colors ${
                        isAssignedToMe
                          ? 'bg-blue-900/30 border-blue-500 hover:border-blue-400 shadow-[0_0_8px_rgba(30,144,255,0.25)]'
                          : 'bg-slate-700/50 border-slate-600 hover:border-red-500/50'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {issue.area}-{issue.section}-{issue.location}
                            </div>
                            <div className="text-xs text-slate-400 truncate mt-1">
                              {issue.issue_description}
                            </div>
                            {isAssignedToMe && (
                              <div className="mt-1">
                                <Badge className="text-xs bg-blue-600/80 text-white border-blue-400 border">
                                  Assigned to You
                                </Badge>
                              </div>
                            )}
                          </div>
                          <Badge className={`text-xs flex-shrink-0 ${
                            issue.service_status === 'out_of_service' 
                              ? 'bg-red-900/50 text-red-300 border-red-700' 
                              : 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
                          } border`}>
                            {issue.service_status === 'out_of_service' ? 'OOS' : 'IS'}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No open issues
                </div>
              )}
            </div>
            {unresolvedIssues.length > 5 && (
              <Link to={createPageUrl("Issues")}>
                <Button variant="outline" size="sm" className="w-full border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  View All ({unresolvedIssues.length})
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          {/* PM Due Soon / Overdue Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-yellow-400" />
                PM Due Soon / Overdue ({pmActionItems.length})
              </h3>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {equipmentLoading ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Loading...
                </div>
              ) : pmActionItems.length > 0 ? (
                pmActionItems.slice(0, 5).map((item) => (
                  <Link 
                    key={item.id} 
                    to={createPageUrl("EquipmentMaintenance")}
                    className="block"
                  >
                    <div className={`p-3 rounded-lg border transition-colors ${
                      item.pmStatus.status === 'overdue'
                        ? 'bg-red-900/30 border-red-600 hover:border-red-400'
                        : 'bg-yellow-900/30 border-yellow-600 hover:border-yellow-400'
                    }`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.model_name}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            {getEquipmentTypeLabel(item.equipment_type)} • {item.location}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {item.pmStatus.isOverdue 
                              ? `Overdue by ${Math.abs(item.pmStatus.daysUntilDue)} days`
                              : `Due in ${item.pmStatus.daysUntilDue} days`
                            }
                          </div>
                        </div>
                        <Badge className={`text-xs flex-shrink-0 ${
                          item.pmStatus.status === 'overdue'
                            ? 'bg-red-900/50 text-red-300 border-red-700'
                            : 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
                        } border`}>
                          {item.pmStatus.status === 'overdue' ? '🔴 Overdue' : '⚠️ Due Soon'}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No PM actions needed
                </div>
              )}
            </div>
            {pmActionItems.length > 5 && (
              <Link to={createPageUrl("EquipmentMaintenance")}>
                <Button variant="outline" size="sm" className="w-full border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  View All ({pmActionItems.length})
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
          </div>

          {/* Next PM Machine Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-blue-400" />
                Next PM Machine
              </h3>
            </div>
            <div className="space-y-2">
              {nextPMMachine ? (
                <Link 
                  to={createPageUrl(`MachineDetail?id=${nextPMMachine.machine_id}`)}
                  className="block"
                >
                  <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-600 hover:border-blue-400 transition-colors">
                    <div className="text-lg font-semibold text-white mb-2">
                      {nextPMMachine.area}-{nextPMMachine.section}-{nextPMMachine.location}
                    </div>
                    <div className="space-y-1 text-sm text-slate-300">
                      <div>
                        <span className="text-slate-400">Asset ID:</span> {nextPMMachine.serial_number || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400">Theme:</span> {nextPMMachine.theme || 'N/A'}
                      </div>
                      <div>
                        <span className="text-slate-400">Model:</span> {nextPMMachine.manufacturer} {nextPMMachine.model}
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No machines pending PM
                </div>
              )}
            </div>
            <Link to={createPageUrl("Maintenance")}>
              <Button variant="outline" size="sm" className="w-full border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                Go to Maintenance
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {/* Pending Ram Clears Section */}
          {pendingRamClears.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Pending Ram Clears ({pendingRamClears.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingRamClears.slice(0, 5).map((rc) => (
                  <Link 
                    key={rc.id} 
                    to={createPageUrl("RamClears")}
                    className="block"
                  >
                    <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-600 hover:border-purple-400 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {rc.area}-{rc.section}-{rc.location}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            RTP: {rc.current_rtp}% • Max Bet: {rc.max_bet}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(rc.clear_date + 'T00:00:00'), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <Badge className="text-xs flex-shrink-0 bg-purple-900/50 text-purple-300 border-purple-700 border">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {pendingRamClears.length > 5 && (
                <Link to={createPageUrl("RamClears")}>
                  <Button variant="outline" size="sm" className="w-full border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                    View All ({pendingRamClears.length})
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          )}
          </div>
          </CardContent>
          </Card>
          );
          }