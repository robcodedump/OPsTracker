
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function StatsCard({ 
  title, 
  subtitle,
  value, 
  icon: Icon, 
  trend, 
  trendDirection,
  color = "primary",
  customLayout = false
}) {
  const colorStyles = {
    primary: {
      bg: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
      text: '#fbbf24',
      cardBg: 'bg-slate-800'
    },
    success: {
      bg: 'linear-gradient(135deg, #10b981, #059669)',
      text: '#ffffff',
      cardBg: 'bg-slate-800'
    },
    warning: {
      bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
      text: '#ffffff',
      cardBg: 'bg-slate-800'
    },
    danger: {
      bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
      text: '#ffffff',
      cardBg: 'bg-slate-800'
    }
  };

  return (
    <Card className={`relative overflow-hidden border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300 ${colorStyles[color].cardBg}`}>
      <div 
        className="absolute top-0 right-0 w-24 h-24 transform translate-x-6 -translate-y-6 rounded-full opacity-20"
        style={{ background: colorStyles[color].bg }}
      />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-400">
              {customLayout ? '' : title}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-500 mt-1">
                {subtitle}
              </p>
            )}
            {customLayout ? (
              <p className="text-lg font-bold mt-2 text-white">
                {title}
              </p>
            ) : (
              value && (
                <p className="text-3xl font-bold mt-2 text-white">
                  {value}
                </p>
              )
            )}
          </div>
          <div 
            className="p-3 rounded-xl"
            style={{ background: colorStyles[color].bg }}
          >
            <Icon className="w-6 h-6" style={{ color: colorStyles[color].text }} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center mt-4 text-sm">
            {trendDirection === 'up' ? (
              <TrendingUp className="w-4 h-4 mr-1 text-green-400" />
            ) : trendDirection === 'down' ? (
              <TrendingDown className="w-4 h-4 mr-1 text-red-400" />
            ) : null}
            <span className={trendDirection === 'up' ? 'text-green-400' : trendDirection === 'down' ? 'text-red-400' : 'text-slate-400'}>
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
