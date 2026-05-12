import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wrench, Eye, Trash2, Activity, MapPin, AlertTriangle } from "lucide-react";
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

export default function MachineCard({ machine, maintenanceRecords, issues, onDelete, onMove }) {
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
    if (percentage >= 99) return 'text-green-400 bg-green-900/30 border-green-700';
    if (percentage >= 95) return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
    return 'text-red-400 bg-red-900/30 border-red-700';
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
    <Card className="hover:shadow-lg transition-all duration-300 border border-slate-700 shadow-md bg-slate-800">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="font-bold text-xl text-white mb-1">
              {machine.area}-{machine.section}-{machine.location}
            </h3>
            <p className="text-slate-400 text-base mb-2">
              {machine.machine_id}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge className={`${getStatusColor(machine.status)} border`}>
              {machine.status}
            </Badge>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${getUptimeColor(uptime)}`}>
              <Activity className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {uptime.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Manufacturer:</span>
            <span className="font-medium text-slate-200">
              {machine.manufacturer}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Model:</span>
            <span className="font-medium text-slate-200">
              {machine.model}
            </span>
          </div>
          {machine.theme && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Theme:</span>
              <span className="font-medium text-slate-200">
                {machine.theme}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Issues:</span>
            <span className="font-medium text-slate-200 flex items-center gap-1">
              {issueCount > 0 && <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />}
              {issueCount}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">
              {currentTrimester} Maintenance:
            </span>
            <Badge 
              className={hasCurrentTrimesterMaintenance 
                ? 'bg-green-900/50 text-green-300 border-green-700 border' 
                : 'bg-red-900/50 text-red-300 border-red-700 border'
              }
            >
              {hasCurrentTrimesterMaintenance ? 'Complete' : 'Pending'}
            </Badge>
          </div>
        </div>

        <div className="flex gap-2">
          <Link to={createPageUrl(`MachineDetail?id=${machine.machine_id}`)} className="flex-1">
            <Button variant="outline" size="sm" className="w-full border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
          </Link>
          
          <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
              >
                <MapPin className="w-4 h-4" />
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
                variant="outline" 
                size="sm" 
                className="border-red-700 bg-red-900/30 text-red-300 hover:bg-red-900/50"
              >
                <Trash2 className="w-4 h-4" />
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
      </CardContent>
    </Card>
  );
}