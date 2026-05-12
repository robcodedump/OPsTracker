import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, TrendingUp, TrendingDown } from "lucide-react";

export default function MaintenanceByUserWidget({ maintenanceRecords }) {
  const getUserStats = () => {
    const currentDate = new Date();
    const last30Days = new Date();
    last30Days.setDate(currentDate.getDate() - 30);
    const previous30Days = new Date();
    previous30Days.setDate(currentDate.getDate() - 60);
    
    const userCounts = {};
    const userPreviousCounts = {};
    
    maintenanceRecords.forEach(record => {
      const recordDate = new Date(record.maintenance_date);
      const tech = record.technician || 'Unknown';
      
      if (recordDate >= last30Days) {
        userCounts[tech] = (userCounts[tech] || 0) + 1;
      }
      
      if (recordDate >= previous30Days && recordDate < last30Days) {
        userPreviousCounts[tech] = (userPreviousCounts[tech] || 0) + 1;
      }
    });
    
    return Object.entries(userCounts)
      .map(([user, count]) => ({
        user,
        count,
        previousCount: userPreviousCounts[user] || 0,
        change: count - (userPreviousCounts[user] || 0)
      }))
      .sort((a, b) => b.count - a.count);
  };

  const userStats = getUserStats();

  return (
    <Card className="shadow-lg border border-slate-700 bg-slate-800">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="flex items-center gap-2 text-white">
          <User className="w-5 h-5 text-blue-400" />
          PMs Completed By (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {userStats.length > 0 ? (
          <div className="space-y-3">
            {userStats.map((stat, index) => (
              <div 
                key={stat.user}
                className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg border border-slate-600"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900/30 border border-blue-700 flex items-center justify-center text-blue-300 font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{stat.user}</div>
                    <div className="text-sm text-slate-400">
                      {stat.count} maintenance{stat.count !== 1 ? 's' : ''} completed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-900/50 text-blue-300 border-blue-700 border">
                    {stat.count}
                  </Badge>
                  {stat.previousCount > 0 && (
                    <div className="flex items-center gap-1">
                      {stat.change > 0 ? (
                        <>
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          <span className="text-xs text-green-400">+{stat.change}</span>
                        </>
                      ) : stat.change < 0 ? (
                        <>
                          <TrendingDown className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-400">{stat.change}</span>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No maintenance records found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}