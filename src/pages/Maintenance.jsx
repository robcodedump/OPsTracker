const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { SlotMachine, MaintenanceRecord } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Clock, Wrench, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SyncIndicator from "../components/dashboard/SyncIndicator";
import { useToast } from "@/components/ui/use-toast";

export default function Maintenance() {
  const [machines, setMachines] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { toast } = useToast();

  const getTrimesterDates = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-indexed month

    let trimester, startMonthIndex, endMonthIndex, startYear, endYear;

    // Trimester definitions:
    // T1: April - July (months 3-6)
    if (currentMonth >= 3 && currentMonth <= 6) {
      trimester = 'T1';
      startMonthIndex = 3; // April
      endMonthIndex = 6; // July
      startYear = currentYear;
      endYear = currentYear;
    }
    // T2: August - November (months 7-10)
    else if (currentMonth >= 7 && currentMonth <= 10) {
      trimester = 'T2';
      startMonthIndex = 7; // August
      endMonthIndex = 10; // November
      startYear = currentYear;
      endYear = currentYear;
    }
    // T3: December - March (months 11, 0, 1, 2)
    else {
      trimester = 'T3';
      if (currentMonth >= 11) { // Current month is December
        startMonthIndex = 11; // December
        endMonthIndex = 2; // March of next year
        startYear = currentYear;
        endYear = currentYear + 1;
      } else { // Current month is January, February, or March
        startMonthIndex = 11; // December of previous year
        endMonthIndex = 2; // March of current year
        startYear = currentYear - 1;
        endYear = currentYear;
      }
    }

    const startDate = new Date(startYear, startMonthIndex, 1);
    const endDate = new Date(endYear, endMonthIndex + 1, 0); // Last day of the endMonthIndex

    return { trimester, startDate, endDate, year: startDate.getFullYear() };
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Dynamically determine the current trimester and year based on the new logic
  const { trimester: currentTrimester, startDate, endDate, year: currentYear } = getTrimesterDates();
  
  const [newRecord, setNewRecord] = useState({
    bank: '',
    year: currentYear,
    trimester: currentTrimester,
    maintenance_date: new Date().toISOString().split('T')[0],
    technician: '',
    notes: '',
    issues_found: [],
    completed: true
  });

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // New useEffect to pre-populate technician name when dialog opens
  useEffect(() => {
    const populateTechnicianName = async () => {
      if (showAddDialog) {
        try {
          const user = await db.auth.me();
          if (user?.full_name) {
            setNewRecord(prev => ({
              ...prev,
              technician: user.full_name
            }));
          }
        } catch (error) {
          console.error('Error fetching user data for technician field:', error);
          // If user fetch fails, leave technician field empty for manual entry
        }
      } else {
        // When dialog closes, reset technician to empty for a fresh populate next time
        setNewRecord(prev => ({
          ...prev,
          technician: ''
        }));
      }
    };

    populateTechnicianName();
  }, [showAddDialog]);

  const loadData = async () => {
    try {
      // Use localStorage for persistent casino selection
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        console.error('No casino selected.');
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        console.error('Invalid casino data: casino object or ID is missing.');
        setLoading(false);
        return;
      }
      
      const [machinesData, recordsData] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        MaintenanceRecord.filter({ casino_id: casino.id })
      ]);
      
      const sortedMachines = machinesData.sort((a, b) => {
        if (a.area !== b.area) return a.area.localeCompare(b.area);
        if (a.section !== b.section) return a.section.localeCompare(b.section);
        return a.location.localeCompare(b.location);
      });
      
      setMachines(sortedMachines);
      setMaintenanceRecords(recordsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getUniqueBanks = () => {
    const banks = new Set();
    machines.forEach(machine => {
      const bank = `${machine.area}-${machine.section}`;
      banks.add(bank);
    });
    return Array.from(banks).sort((a, b) => {
      const [aArea, aSection] = a.split('-');
      const [bArea, bSection] = b.split('-');
      if (aArea !== bArea) return aArea.localeCompare(bArea, undefined, { numeric: true });
      return aSection.localeCompare(bSection, undefined, { numeric: true });
    });
  };

  const getMachinesByBank = (bank) => {
    const [area, section] = bank.split('-');
    return machines.filter(m => m.area === area && m.section === section);
  };

  const getMachineMaintenanceStatus = () => {
    const trimesters = ['T1', 'T2', 'T3'];
    // Map the current trimester to its index for comparison, using the new definitions
    const trimesterIndexMap = { 'T1': 0, 'T2': 1, 'T3': 2 };
    const currentTrimesterIndex = trimesterIndexMap[currentTrimester];
    
    return machines.map(machine => {
      const trimesterStatus = {};
      trimesters.forEach((trimester, index) => {
        const hasRecord = maintenanceRecords.some(
          record => record.machine_id === machine.machine_id && 
                   record.year === currentYear && 
                   record.trimester === trimester
        );
        trimesterStatus[trimester] = {
          completed: hasRecord,
          // A trimester is overdue if it's the current trimester or a past one in the current year, and has no record
          overdue: index <= currentTrimesterIndex && !hasRecord
        };
      });
      
      return {
        ...machine,
        trimesterStatus
      };
    });
  };

  const handleAddRecord = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        toast({
          title: "Casino Not Selected",
          description: "No casino selected. Please select a casino first.",
          variant: "destructive",
        });
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        toast({
          title: "Invalid Casino Data",
          description: "Invalid casino data. Please select a casino again.",
          variant: "destructive",
        });
        return;
      }

      // Get all machines in the selected bank
      const bankMachines = getMachinesByBank(newRecord.bank);
      
      if (bankMachines.length === 0) {
        toast({
          title: "No Machines Found",
          description: "No machines found in the selected bank.",
          variant: "destructive",
        });
        return;
      }

      // Create maintenance records for all machines in the bank
      const recordPromises = bankMachines.map(machine => 
        MaintenanceRecord.create({
          casino_id: casino.id,
          machine_id: machine.machine_id,
          year: newRecord.year,
          trimester: newRecord.trimester,
          maintenance_date: newRecord.maintenance_date,
          technician: newRecord.technician,
          notes: newRecord.notes,
          issues_found: newRecord.issues_found,
          completed: newRecord.completed
        })
      );

      await Promise.all(recordPromises);
      
      toast({
        title: "PM Logged",
        description: `PM successfully logged for all ${bankMachines.length} machines in Bank ${newRecord.bank}.`,
      });
      
      setShowAddDialog(false);
      setNewRecord({
        bank: '',
        year: currentYear,
        trimester: currentTrimester,
        maintenance_date: new Date().toISOString().split('T')[0],
        technician: '', // Reset to empty, will be re-populated when dialog opens again
        notes: '',
        issues_found: [],
        completed: true
      });
      loadData();
    } catch (error) {
      console.error('Error adding maintenance records:', error);
      toast({
        title: "Error Logging PM",
        description: `Error logging PM. Please try again. ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const quickMarkComplete = async (machineId) => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        toast({
          title: "Casino Not Selected",
          description: "No casino selected. Please select a casino first.",
          variant: "destructive",
        });
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        toast({
          title: "Invalid Casino Data",
          description: "Invalid casino data. Please select a casino again.",
          variant: "destructive",
        });
        return;
      }

      // Get the current authenticated user's name
      const user = await db.auth.me();
      const technicianName = user?.full_name || 'Unknown User';

      await MaintenanceRecord.create({
        casino_id: casino.id,
        machine_id: machineId,
        year: currentYear,
        trimester: currentTrimester,
        maintenance_date: new Date().toISOString().split('T')[0],
        technician: technicianName,
        notes: 'PM completed - quick mark',
        issues_found: [],
        completed: true
      });
      loadData();
      toast({
        title: "PM Quick Completed",
        description: `PM for machine ${machineId} has been marked as complete.`,
      });
    } catch (error) {
      console.error('Error marking maintenance complete:', error);
      toast({
        title: "Error Quick Completing PM",
        description: `Error quick completing PM for machine ${machineId}. ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const machinesWithStatus = getMachineMaintenanceStatus();
  const pendingMachines = machinesWithStatus.filter(
    machine => machine.trimesterStatus[currentTrimester].overdue
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                PM Tracking
              </h1>
              <SyncIndicator />
            </div>
            <p className="mt-2 text-slate-400">
              Track trimester PMs for all slot machines
            </p>
            <p className="mt-1 text-sm text-blue-400">
              Current Period: {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                <Plus className="w-4 h-4 mr-2" />
                Log PM
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Log PM Record for Bank</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Bank (Area-Section)</Label>
                    <Select
                      value={newRecord.bank}
                      onValueChange={(value) => setNewRecord({...newRecord, bank: value})}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select bank" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        {getUniqueBanks().map(bank => {
                          const machineCount = getMachinesByBank(bank).length;
                          return (
                            <SelectItem key={bank} value={bank}>
                              {bank} ({machineCount} machine{machineCount !== 1 ? 's' : ''})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {newRecord.bank && (
                      <p className="text-xs text-slate-400">
                        This will log maintenance for {getMachinesByBank(newRecord.bank).length} machine(s) in this bank.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Trimester</Label>
                    <Select
                      value={newRecord.trimester}
                      onValueChange={(value) => setNewRecord({...newRecord, trimester: value})}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        <SelectItem value="T1">T1 (Apr-Jul)</SelectItem>
                        <SelectItem value="T2">T2 (Aug-Nov)</SelectItem>
                        <SelectItem value="T3">T3 (Dec-Mar)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">PM Date</Label>
                    <Input
                      type="date"
                      value={newRecord.maintenance_date}
                      onChange={(e) => setNewRecord({...newRecord, maintenance_date: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Technician</Label>
                    <Input
                      value={newRecord.technician}
                      onChange={(e) => setNewRecord({...newRecord, technician: e.target.value})}
                      placeholder="Technician name"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Notes</Label>
                  <Textarea
                    value={newRecord.notes}
                    onChange={(e) => setNewRecord({...newRecord, notes: e.target.value})}
                    placeholder="Maintenance notes and observations..."
                    className="h-24 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddRecord} 
                  disabled={!newRecord.bank}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                >
                  Log PM for Bank
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6 border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Clock className="w-5 h-5" />
              {currentTrimester} {currentYear} - Trimester PM Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingMachines.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-orange-300 bg-orange-900/30 p-3 rounded-lg border border-orange-700">
                  <Wrench className="w-5 h-5" />
                  <span className="font-medium">
                    {pendingMachines.length} machines need PMs this trimester
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingMachines.map(machine => (
                    <Card key={machine.machine_id} className="border border-orange-700 bg-orange-900/20">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-white">{machine.machine_id}</h4>
                            <p className="text-sm text-slate-400">
                              {machine.area}-{machine.section}-{machine.location}
                            </p>
                          </div>
                          <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 border">
                            Pending
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => quickMarkComplete(machine.machine_id)}
                            className="flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Quick Complete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                <h3 className="lg font-semibold mb-2 text-white">
                  All Caught Up!
                </h3>
                <p className="text-slate-400">
                  All machines have completed their {currentTrimester} PMs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">
              {currentYear} PM Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 font-semibold text-white">
                      Machine
                    </th>
                    <th className="text-left py-3 font-semibold text-white">
                      A-S-L
                    </th>
                    <th className="text-center py-3 font-semibold text-white">
                      T1
                    </th>
                    <th className="text-center py-3 font-semibold text-white">
                      T2
                    </th>
                    <th className="text-center py-3 font-semibold text-white">
                      T3
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {machinesWithStatus.map(machine => (
                    <tr key={machine.machine_id} className="border-b border-slate-700/50">
                      <td className="py-4">
                        <div>
                          <div className="font-medium text-white">
                            {machine.machine_id}
                          </div>
                          <div className="text-sm text-slate-400">
                            {machine.manufacturer} {machine.model}
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-sm text-slate-400">
                          {machine.area}-{machine.section}-{machine.location}
                        </span>
                      </td>
                      {['T1', 'T2', 'T3'].map(trimester => (
                        <td key={trimester} className="py-4 text-center">
                          {machine.trimesterStatus[trimester].completed ? (
                            <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
                          ) : machine.trimesterStatus[trimester].overdue ? (
                            <Clock className="w-6 h-6 text-orange-400 mx-auto" />
                          ) : (
                            <div className="w-6 h-6 border-2 border-slate-600 rounded-full mx-auto"></div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}