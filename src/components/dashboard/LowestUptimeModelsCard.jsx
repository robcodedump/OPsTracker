import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LowestUptimeModelsCard({ issues, machines }) {
  const getLowestUptimeModels = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    // Calculate uptime by model for the past 90 days
    const modelStats = {};
    
    machines.forEach(machine => {
      const key = `${machine.manufacturer}|${machine.model}`;
      
      if (!modelStats[key]) {
        modelStats[key] = {
          manufacturer: machine.manufacturer,
          model: machine.model,
          totalDowntimeHours: 0,
          totalLifetimeHours: 0,
          machineCount: 0
        };
      }
      
      // Calculate lifetime hours for this machine (limited to past 90 days)
      const machineStartDate = machine.install_date ? new Date(machine.install_date) : new Date(machine.created_date);
      const effectiveStartDate = machineStartDate > cutoffDate ? machineStartDate : cutoffDate;
      const currentDate = new Date();
      const lifetimeHours = (currentDate - effectiveStartDate) / (1000 * 60 * 60);
      
      if (lifetimeHours > 0) {
        modelStats[key].totalLifetimeHours += lifetimeHours;
        modelStats[key].machineCount += 1;
        
        // Calculate downtime for this machine in the past 90 days
        const machineIssues = issues.filter(issue => 
          issue.machine_id === machine.machine_id && 
          new Date(issue.reported_date) >= cutoffDate
        );
        
        machineIssues.forEach(issue => {
          if (issue.service_status === 'out_of_service') {
            const startDate = new Date(issue.reported_date);
            const endDate = issue.resolved && issue.resolved_date 
              ? new Date(issue.resolved_date) 
              : currentDate;
            
            const downtimeHours = (endDate - startDate) / (1000 * 60 * 60);
            modelStats[key].totalDowntimeHours += downtimeHours;
          }
        });
      }
    });
    
    // Calculate uptime percentage for each model
    const modelsWithUptime = Object.values(modelStats)
      .filter(model => model.totalLifetimeHours > 0)
      .map(model => {
        const uptimeHours = model.totalLifetimeHours - model.totalDowntimeHours;
        const uptimePercentage = (uptimeHours / model.totalLifetimeHours) * 100;
        return {
          ...model,
          uptime: Math.max(0, Math.min(100, uptimePercentage))
        };
      });
    
    if (modelsWithUptime.length === 0) {
      return [];
    }
    
    // Sort by uptime (lowest first) and take top 3
    return modelsWithUptime
      .sort((a, b) => a.uptime - b.uptime)
      .slice(0, 3);
  };

  const lowestUptimeModels = getLowestUptimeModels();

  const colorStyles = {
    bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
    text: '#ffffff',
    cardBg: 'bg-slate-800'
  };

  return (
    <Card className={`relative overflow-hidden border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 ${colorStyles.cardBg}`}>
      <div 
        className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 rounded-full opacity-20"
        style={{ background: colorStyles.bg }}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">
              Models with Lowest Uptime
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Last 90 days
            </p>
          </div>
          <div 
            className="p-3 rounded-xl"
            style={{ background: colorStyles.bg }}
          >
            <TrendingDown className="w-6 h-6" style={{ color: colorStyles.text }} />
          </div>
        </div>
        
        {lowestUptimeModels.length > 0 ? (
          <div className="space-y-3 mt-4">
            {lowestUptimeModels.map((model, index) => (
              <Link
                key={`${model.manufacturer}-${model.model}`}
                to={createPageUrl(`Machines?manufacturer=${encodeURIComponent(model.manufacturer)}&model=${encodeURIComponent(model.model)}`)}
                className="block group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-4 h-4 rounded-full ${
                      index === 0 ? 'bg-red-600' : index === 1 ? 'bg-red-500' : 'bg-red-400'
                    } flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors break-words">
                      {model.model}
                    </span>
                  </div>
                  <span className={`text-sm font-bold flex-shrink-0 ml-2 ${
                    model.uptime < 95 ? 'text-red-400' : model.uptime < 99 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {model.uptime.toFixed(1)}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-slate-400">No uptime data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}