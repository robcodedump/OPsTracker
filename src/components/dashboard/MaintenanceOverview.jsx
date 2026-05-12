import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, AlertCircle } from "lucide-react";

export default function MaintenanceOverview({ machines, maintenanceRecords }) {
  const currentYear = new Date().getFullYear();
  const currentTrimester = `T${Math.ceil((new Date().getMonth() + 1) / 4)}`;
  
  const getTrimesterStatus = () => {
    const status = { T1: 0, T2: 0, T3: 0 };
    
    maintenanceRecords
      .filter(record => record.year === currentYear)
      .forEach(record => {
        if (record.trimester in status) {
          status[record.trimester]++;
        }
      });
    
    return status;
  };

  const getOverdueCount = () => {
    const trimesters = ['T1', 'T2', 'T3'];
    const currentTrimesterIndex = trimesters.indexOf(currentTrimester);
    let overdue = 0;
    
    machines.forEach(machine => {
      for (let i = 0; i <= currentTrimesterIndex; i++) {
        const hasRecord = maintenanceRecords.some(
          record => record.machine_id === machine.machine_id && 
                   record.year === currentYear && 
                   record.trimester === trimesters[i]
        );
        if (!hasRecord) {
          overdue++;
        }
      }
    });
    
    return overdue;
  };

  const trimesterStatus = getTrimesterStatus();
  const overdueCount = getOverdueCount();

  return (
    <Card className="shadow-lg border border-slate-700 bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="flex items-center gap-2 text-white">
          <Calendar className="w-5 h-5" />
          {currentYear} PM Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {Object.entries(trimesterStatus).map(([trimester, count]) => (
            <div key={trimester} className="text-center p-4 rounded-lg bg-slate-700 border border-slate-600">
              <div className="text-2xl font-bold text-blue-400">
                {count}
              </div>
              <div className="text-sm font-medium text-slate-300">
                {trimester} Complete
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300 font-medium">
            384 machines need PMs this trimester.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}