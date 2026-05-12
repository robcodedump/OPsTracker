
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TrendingModelCard({ issues, machines }) {
  const getTrendingModels = () => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const recentIssues = issues.filter(issue => 
      new Date(issue.reported_date) >= cutoffDate
    );
    
    if (recentIssues.length === 0) {
      return { models: [], noIssues: true };
    }
    
    // Count issues by manufacturer-model combination
    const modelCounts = {};
    
    recentIssues.forEach(issue => {
      const machine = machines.find(m => m.machine_id === issue.machine_id);
      if (machine) {
        const key = `${machine.manufacturer}|${machine.model}`;
        if (!modelCounts[key]) {
          modelCounts[key] = {
            manufacturer: machine.manufacturer,
            model: machine.model,
            count: 0
          };
        }
        modelCounts[key].count++;
      }
    });
    
    if (Object.keys(modelCounts).length === 0) {
      return { models: [], noIssues: true };
    }
    
    // Find the maximum count
    const maxCount = Math.max(...Object.values(modelCounts).map(m => m.count));
    
    // Get all models with the maximum count (handles ties)
    const trendingModels = Object.values(modelCounts)
      .filter(m => m.count === maxCount)
      .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer));
    
    return { models: trendingModels, noIssues: false };
  };

  const { models, noIssues } = getTrendingModels();

  const colorStyles = {
    bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">
              Trending Model with Issues
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Last 90 days
            </p>
            {noIssues ? (
              <p className="text-xl font-bold mt-2 text-white">
                None, break something!
              </p>
            ) : (
              <div className="mt-2">
                {models.map((model, index) => (
                  <Link
                    key={`${model.manufacturer}-${model.model}`}
                    to={createPageUrl(`Machines?manufacturer=${encodeURIComponent(model.manufacturer)}&model=${encodeURIComponent(model.model)}`)}
                    className="block text-sm font-bold text-white hover:text-blue-400 transition-colors"
                  >
                    {model.manufacturer} - {model.model}
                    {index < models.length - 1 && <span className="text-sm">, </span>}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div 
            className="p-3 rounded-xl"
            style={{ background: colorStyles.bg }}
          >
            <TrendingUp className="w-6 h-6" style={{ color: colorStyles.text }} />
          </div>
        </div>
        {!noIssues && models.length > 0 && (
          <div className="flex items-center mt-4 text-sm">
            <span className="text-slate-400">
              {models[0].count} issue{models[0].count !== 1 ? 's' : ''} in past 90 days
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
