
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Activity, MapPin, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MachineListItem({ machine, maintenanceRecords, issues, onDelete, onMove, index }) {
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newLocation, setNewLocation] = useState({
    area: machine.area,
    section: machine.section,
    location: machine.location
  });

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
  
  const hasCurrentTrimesterMaintenance = maintenanceRecords.some(
    record => record.machine_id === machine.machine_id && 
             record.year === currentYear && 
             record.trimester === currentTrimester
  );

  const calculateUptime = () => {
    const machineIssues = issues.filter(issue => issue.machine_id === machine.machine_id);
    
    const machineStartDate = machine.install_date ? new Date(machine.install_date) : new Date(machine.created_date);
    const currentDate = new Date();
    const lifetimeHours = (currentDate - machineStartDate) / (1000 * 60 * 60);
    
    if (lifetimeHours <= 0) return 100;
    
    let totalDowntimeHours = 0;
    
    machineIssues.forEach(issue => {
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

  const uptime = calculateUptime();
  const issueCount = issues.filter(issue => issue.machine_id === machine.machine_id).length;
  
  const getUptimeColor = (percentage) => {
    if (percentage >= 99) return 'text-green-400';
    if (percentage >= 95) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'maintenance': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      case 'inactive': return 'bg-red-900/50 text-red-300 border-red-700';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleMove = async () => {
    await onMove(machine.id, newLocation);
    setShowMoveDialog(false);
  };

  return (
    <>
      <div className={`flex items-center gap-3 px-4 py-2 border border-slate-700 hover:bg-slate-800/50 transition-colors ${
        index % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
      }`}>
        {/* A-S-L and Machine ID */}
        <div className="w-48 flex-shrink-0">
          <div className="font-bold text-white text-sm leading-tight truncate">
            {machine.area}-{machine.section}-{machine.location}
          </div>
          <div className="text-slate-400 text-xs leading-tight truncate">
            {machine.machine_id}
          </div>
        </div>

        {/* Manufacturer & Model */}
        <div className="w-44 flex-shrink-0">
          <div className="text-slate-200 text-sm leading-tight truncate">
            {machine.manufacturer}
          </div>
          <div className="text-slate-400 text-xs leading-tight truncate">
            {machine.model}
          </div>
        </div>

        {/* Theme - Now with word wrapping */}
        {machine.theme && (
          <div className="w-36 flex-shrink-0">
            <div className="text-slate-300 text-xs leading-tight break-words">
              {machine.theme}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="w-24 flex-shrink-0">
          <Badge className={`${getStatusColor(machine.status)} border text-xs px-2 py-0.5`}>
            {machine.status}
          </Badge>
        </div>

        {/* Uptime */}
        <div className="w-20 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-400" />
            <span className={`text-xs font-semibold ${getUptimeColor(uptime)}`}>
              {uptime.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Issues */}
        <div className="w-16 flex-shrink-0">
          <div className="flex items-center gap-1">
            {issueCount > 0 && <AlertTriangle className="w-3 h-3 text-orange-400" />}
            <span className="text-slate-200 text-xs">
              {issueCount}
            </span>
          </div>
        </div>

        {/* Maintenance Status */}
        <div className="w-20 flex-shrink-0">
          <Badge 
            className={`${hasCurrentTrimesterMaintenance 
              ? 'bg-green-900/50 text-green-300 border-green-700' 
              : 'bg-red-900/50 text-red-300 border-red-700'
            } border text-[10px] px-1.5 py-0.5`}
          >
            {hasCurrentTrimesterMaintenance ? 'Done' : 'Pending'}
          </Badge>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          <Link to={createPageUrl(`MachineDetail?id=${machine.machine_id}`)}>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
            >
              <Eye className="w-6 h-6 text-[#007BFF]" />
            </Button>
          </Link>
          
          <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
              >
                <MapPin className="w-6 h-6 text-[#007BFF]" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Move Machine</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="move-area" className="text-slate-300">Area (A)</Label>
                  <Input
                    id="move-area"
                    value={newLocation.area}
                    onChange={(e) => setNewLocation({...newLocation, area: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="move-section" className="text-slate-300">Section (S)</Label>
                  <Input
                    id="move-section"
                    value={newLocation.section}
                    onChange={(e) => setNewLocation({...newLocation, section: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="move-location" className="text-slate-300">Location (L)</Label>
                  <Input
                    id="move-location"
                    value={newLocation.location}
                    onChange={(e) => setNewLocation({...newLocation, location: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowMoveDialog(false)} className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  Cancel
                </Button>
                <Button onClick={handleMove} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600">
                  Move Machine
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0 bg-red-50 hover:bg-red-100 rounded-full transition-colors"
              >
                <Trash2 className="w-6 h-6 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete Slot Machine</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete machine <span className="font-semibold text-white">{machine.machine_id}</span>? 
                  This action cannot be undone and will remove all associated maintenance records.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(machine.id)}
                  className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
                >
                  Delete Machine
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}
