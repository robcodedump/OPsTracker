import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Percent } from "lucide-react";
import VerifyRtpDialog from "./VerifyRtpDialog";

function getTrimesterInfo() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  let trimester, startYear;
  if (currentMonth >= 3 && currentMonth <= 6) {
    trimester = "T1"; startYear = currentYear;
  } else if (currentMonth >= 7 && currentMonth <= 10) {
    trimester = "T2"; startYear = currentYear;
  } else {
    trimester = "T3";
    startYear = currentMonth >= 11 ? currentYear : currentYear - 1;
  }
  return { trimester, year: startYear };
}

export default function RtpTrimesterTracker({ machines, rtpChecks, onRefresh }) {
  const [verifyMachine, setVerifyMachine] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { trimester: currentTrimester, year: currentYear } = getTrimesterInfo();
  const allTrimesters = ["T1", "T2", "T3"];

  const getRtpForMachineTrimester = (machineId, trimester) => {
    return rtpChecks.find(
      (r) => r.machine_id === machineId && r.trimester === trimester && r.year === currentYear
    );
  };

  const trimesterIndexMap = { T1: 0, T2: 1, T3: 2 };
  const currentTrimesterIndex = trimesterIndexMap[currentTrimester];

  const machinesWithStatus = machines.map((machine) => {
    const trimesterStatus = {};
    allTrimesters.forEach((t, index) => {
      const record = getRtpForMachineTrimester(machine.machine_id, t);
      trimesterStatus[t] = {
        completed: !!record,
        rtp: record?.rtp_percentage,
        overdue: index <= currentTrimesterIndex && !record,
      };
    });
    return { ...machine, trimesterStatus };
  });

  const pendingThisTrimester = machinesWithStatus.filter(
    (m) => m.trimesterStatus[currentTrimester].overdue
  );

  const handleVerify = (machine) => {
    setVerifyMachine(machine);
    setDialogOpen(true);
  };

  return (
    <>
      <VerifyRtpDialog
        machine={verifyMachine}
        trimester={currentTrimester}
        year={currentYear}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onVerified={onRefresh}
      />

      <div className="mt-10">
        <div className="flex items-center gap-3 mb-4">
          <Percent className="w-6 h-6 text-blue-400" />
          <h2 className="text-2xl font-bold text-white">RTP Trimester Tracker</h2>
          <Badge className="bg-blue-900/50 text-blue-300 border border-blue-700">
            {currentTrimester} {currentYear}
          </Badge>
        </div>
        <p className="text-slate-400 mb-6 text-sm">
          Verify the RTP percentage for each machine once per trimester.
        </p>

        {/* Pending this trimester */}
        {pendingThisTrimester.length > 0 && (
          <Card className="mb-6 border border-orange-700 bg-orange-900/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-orange-300 mb-3">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{pendingThisTrimester.length} machines need RTP verification this trimester</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {pendingThisTrimester.map((machine) => (
                  <div
                    key={machine.machine_id}
                    className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-white">{machine.machine_id}</p>
                      <p className="text-xs text-slate-400">{machine.area}-{machine.section}-{machine.location}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleVerify(machine)}
                      className="bg-blue-600 hover:bg-blue-700 text-white min-h-[36px]"
                    >
                      Verify RTP
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full overview table */}
        <Card className="border border-slate-700 bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">{currentYear} RTP Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 font-semibold text-white">Machine</th>
                    <th className="text-left py-3 font-semibold text-white">A-S-L</th>
                    {allTrimesters.map((t) => (
                      <th key={t} className="text-center py-3 font-semibold text-white">{t}</th>
                    ))}
                    <th className="text-center py-3 font-semibold text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {machinesWithStatus.map((machine) => (
                    <tr key={machine.machine_id} className="border-b border-slate-700/50">
                      <td className="py-4">
                        <div className="font-medium text-white">{machine.machine_id}</div>
                        <div className="text-xs text-slate-400">{machine.manufacturer} {machine.model}</div>
                      </td>
                      <td className="py-4 text-sm text-slate-400">
                        {machine.area}-{machine.section}-{machine.location}
                      </td>
                      {allTrimesters.map((t) => {
                        const status = machine.trimesterStatus[t];
                        return (
                          <td key={t} className="py-4 text-center">
                            {status.completed ? (
                              <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="w-5 h-5 text-green-400 mx-auto" />
                                <span className="text-xs text-green-400">{status.rtp}%</span>
                              </div>
                            ) : status.overdue ? (
                              <Clock className="w-5 h-5 text-orange-400 mx-auto" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-slate-600 rounded-full mx-auto" />
                            )}
                          </td>
                        );
                      })}
                      <td className="py-4 text-center">
                        {!machine.trimesterStatus[currentTrimester].completed && (
                          <Button
                            size="sm"
                            onClick={() => handleVerify(machine)}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-h-[36px]"
                          >
                            Verify
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}