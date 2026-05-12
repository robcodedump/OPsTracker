import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Clock, TrendingUp, TrendingDown } from "lucide-react";

export default function AverageResolutionCard({ issues }) {
  const calculateAverageResolution = (daysBack) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    
    const resolvedIssues = issues.filter(issue => 
      issue.resolved && 
      issue.resolved_date && 
      new Date(issue.resolved_date) >= cutoffDate
    );
    
    if (resolvedIssues.length === 0) return 0;
    
    const totalDays = resolvedIssues.reduce((sum, issue) => {
      const reported = new Date(issue.reported_date);
      const resolved = new Date(issue.resolved_date);
      const days = (resolved - reported) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);
    
    return totalDays / resolvedIssues.length;
  };

  const currentAvg = calculateAverageResolution(30);
  const previousAvg = calculateAverageResolution(60) - currentAvg;
  
  const percentChange = previousAvg > 0 
    ? (((currentAvg - previousAvg) / previousAvg) * 100).toFixed(1)
    : 0;
  
  const isImproving = currentAvg < previousAvg;

  return (
    <Card className="relative overflow-hidden border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 bg-slate-800">
      <div 
        className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 rounded-full opacity-20"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-400">
              Avg Time to Resolution
            </p>
            <p className="text-3xl font-bold mt-2 text-white">
              {currentAvg.toFixed(1)} days
            </p>
          </div>
          <div 
            className="p-3 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #60a5fa)' }}
          >
            <Clock className="w-6 h-6 text-yellow-400" />
          </div>
        </div>
        {previousAvg > 0 && (
          <div className="flex items-center mt-4 text-sm">
            {isImproving ? (
              <>
                <TrendingDown className="w-4 h-4 mr-1 text-green-400" />
                <span className="text-green-400">
                  {Math.abs(percentChange)}% faster than previous 30 days
                </span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-1 text-red-400" />
                <span className="text-red-400">
                  {Math.abs(percentChange)}% slower than previous 30 days
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}