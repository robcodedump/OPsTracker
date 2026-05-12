import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wifi } from "lucide-react";

export default function SyncIndicator() {
  const [lastSync, setLastSync] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(new Date());
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const getTimeAgo = () => {
    const seconds = Math.floor((new Date() - lastSync) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };
  
  return (
    <Badge variant="outline" className="flex items-center gap-2 bg-green-900/30 text-green-300 border-green-700">
      <Wifi className="w-3 h-3" />
      <span className="text-xs">Live Synced</span>
      <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
    </Badge>
  );
}