const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, FileBarChart, Clock, Download } from "lucide-react";
import { format } from "date-fns";
import ReportRamClearDialog from "../components/ram-clears/ReportRamClearDialog";
import CompleteRamClearDialog from "../components/ram-clears/CompleteRamClearDialog";
import SyncIndicator from "../components/dashboard/SyncIndicator";
import RtpTrimesterTracker from "../components/rtp/RtpTrimesterTracker";

export default function RamClears() {
  const [machines, setMachines] = useState([]);
  const [ramClears, setRamClears] = useState([]);
  const [rtpChecks, setRtpChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingRamClear, setCompletingRamClear] = useState(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        setLoading(false);
        return;
      }
      
      const [machinesData, ramClearsData, rtpChecksData] = await Promise.all([
        db.entities.SlotMachine.filter({ casino_id: casino.id }),
        db.entities.RamClear.filter({ casino_id: casino.id }, '-clear_date'),
        db.entities.RtpCheck.filter({ casino_id: casino.id })
      ]);
      
      setMachines(machinesData);
      setRamClears(ramClearsData);
      setRtpChecks(rtpChecksData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRamClearReported = async (ramClearData) => {
    try {
      await db.entities.RamClear.create(ramClearData);
      loadData();
    } catch (error) {
      console.error('Error reporting ram clear:', error);
    }
  };

  const handleMarkChecked = (ramClear) => {
    setCompletingRamClear(ramClear);
    setShowCompleteDialog(true);
  };

  const handleCompleteRamClear = async (ramClear, notes) => {
    try {
      const user = await db.auth.me();
      await db.entities.RamClear.update(ramClear.id, {
        checked: true,
        checked_date: new Date().toISOString(),
        checked_by: user?.email || 'Unknown',
        completion_notes: notes || ''
      });
      loadData();
    } catch (error) {
      console.error('Error marking ram clear as checked:', error);
    }
  };

  const handleDownloadExcel = () => {
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      let stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    let csv = 'Area,Section,Location,Current RTP,Max Bet,Clear Date,Status,Checked Date,Checked By,Completion Notes\n';
    
    ramClears.forEach(rc => {
      csv += `${escapeCsv(rc.area)},${escapeCsv(rc.section)},${escapeCsv(rc.location)},${escapeCsv(rc.current_rtp)},${escapeCsv(rc.max_bet)},${escapeCsv(rc.clear_date)},${escapeCsv(rc.checked ? 'Completed' : 'Pending')},${escapeCsv(rc.checked_date || '')},${escapeCsv(rc.checked_by || '')},${escapeCsv(rc.completion_notes || '')}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `ram-clears-${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const pendingRamClears = ramClears.filter(rc => !rc.checked);
  const completedRamClears = ramClears.filter(rc => rc.checked);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <CompleteRamClearDialog
        ramClear={completingRamClear}
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onComplete={handleCompleteRamClear}
      />
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Ram Clears
              </h1>
              <SyncIndicator />
            </div>
            <p className="mt-2 text-slate-400">
              Track and manage slot machine RAM clear operations
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <ReportRamClearDialog machines={machines} onRamClearReported={handleRamClearReported} />
            <Button
              onClick={handleDownloadExcel}
              variant="outline"
              className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        {/* Pending Ram Clears */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">
              Pending Ram Clears ({pendingRamClears.length})
            </h2>
          </div>
          {pendingRamClears.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRamClears.map((ramClear) => (
                <Card key={ramClear.id} className="border-2 border-orange-700 bg-orange-900/20 hover:border-orange-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {ramClear.area}-{ramClear.section}-{ramClear.location}
                        </h3>
                        <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 border">
                          Pending
                        </Badge>
                      </div>
                      <FileBarChart className="w-6 h-6 text-orange-400" />
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">RTP:</span>
                        <span className="font-semibold text-white">{ramClear.current_rtp}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Max Bet:</span>
                        <span className="font-semibold text-white">{ramClear.max_bet}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Date:</span>
                        <span className="text-white">{format(new Date(ramClear.clear_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Submitted By:</span>
                        <span className="text-slate-300">{ramClear.created_by}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Reported:</span>
                        <span className="text-slate-400">{format(new Date(ramClear.created_date), 'MMM d, h:mm a')}</span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleMarkChecked(ramClear)}
                      className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Ram Clear Checked
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-slate-700 bg-slate-800">
              <CardContent className="p-8 text-center">
                <FileBarChart className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">No pending ram clears</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Completed Ram Clears - collapsed/subtle */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold text-white">
              Completed Ram Clears ({completedRamClears.length})
            </h2>
          </div>
          {completedRamClears.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedRamClears.map((ramClear) => (
                <Card key={ramClear.id} className="border border-green-700 bg-green-900/10">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">
                          {ramClear.area}-{ramClear.section}-{ramClear.location}
                        </h3>
                        <Badge className="bg-green-900/50 text-green-300 border-green-700 border flex items-center gap-1 w-fit">
                          <CheckCircle className="w-3 h-3" />
                          Completed
                        </Badge>
                      </div>
                      <FileBarChart className="w-6 h-6 text-green-400" />
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">RTP:</span>
                        <span className="font-semibold text-white">{ramClear.current_rtp}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Max Bet:</span>
                        <span className="font-semibold text-white">{ramClear.max_bet}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Date:</span>
                        <span className="text-white">{format(new Date(ramClear.clear_date + 'T00:00:00'), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Submitted By:</span>
                        <span className="text-slate-300">{ramClear.created_by}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Checked:</span>
                        <span className="text-green-400">{format(new Date(ramClear.checked_date), 'MMM d, h:mm a')}</span>
                      </div>
                      {ramClear.checked_by && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Checked By:</span>
                          <span className="text-slate-300">{ramClear.checked_by}</span>
                        </div>
                      )}
                      {ramClear.completion_notes && (
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <span className="text-xs text-slate-400 block mb-1">Notes:</span>
                          <p className="text-sm text-slate-300">{ramClear.completion_notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-slate-700 bg-slate-800">
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">No completed ram clears yet</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* RTP Trimester Tracker */}
        <RtpTrimesterTracker
          machines={machines}
          rtpChecks={rtpChecks}
          onRefresh={loadData}
        />
      </div>
    </div>
  );
}