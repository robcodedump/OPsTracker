import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ProblemMachinesWidget({ issues, title, limit, daysBack }) {
  const getProblemMachines = () => {
    let filteredIssues = issues;
    
    if (daysBack) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      filteredIssues = issues.filter(issue => 
        new Date(issue.reported_date) >= cutoffDate
      );
    }
    
    const machineCounts = {};
    filteredIssues.forEach(issue => {
      const key = `${issue.area}-${issue.section}-${issue.location}`;
      const machineId = issue.machine_id;
      
      if (!machineCounts[key]) {
        machineCounts[key] = {
          asl: key,
          machineId: machineId,
          count: 0
        };
      }
      machineCounts[key].count++;
    });
    
    return Object.values(machineCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  };

  const problemMachines = getProblemMachines();

  return (
    <Card className="shadow-lg border border-slate-700 bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="flex items-center gap-2 text-white">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {problemMachines.length > 0 ? (
          <div className="space-y-3">
            {problemMachines.map((machine, index) => (
              <Link 
                key={machine.asl}
                to={createPageUrl(`Issues?machine=${machine.machineId}`)}
                className="flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg border border-slate-600 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-900/30 border border-red-700 flex items-center justify-center text-red-300 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{machine.asl}</div>
                    <div className="text-sm text-slate-400">{machine.machineId}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className="bg-red-900/50 text-red-300 border-red-700 border">
                    {machine.count} issue{machine.count !== 1 ? 's' : ''}
                  </Badge>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No issues reported</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}