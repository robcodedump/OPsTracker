const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";

export default function VerifyRtpDialog({ machine, trimester, year, open, onOpenChange, onVerified }) {
  const [rtpPercentage, setRtpPercentage] = useState("");
  const [notes, setNotes] = useState("");
  const [technician, setTechnician] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRtpPercentage("");
      setNotes("");
      const fetchUser = async () => {
        try {
          const user = await db.auth.me();
          setTechnician(user?.full_name || "");
        } catch {
          setTechnician("");
        }
      };
      fetchUser();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!rtpPercentage) return;
    setSubmitting(true);

    const casinoData = localStorage.getItem("selected_casino") || localStorage.getItem("anonymous_casino");
    const casino = JSON.parse(casinoData);

    await db.entities.RtpCheck.create({
      casino_id: casino.id,
      machine_id: machine.machine_id,
      year,
      trimester,
      rtp_percentage: parseFloat(rtpPercentage),
      check_date: new Date().toISOString().split("T")[0],
      technician,
      notes,
    });

    setSubmitting(false);
    onOpenChange(false);
    onVerified();
  };

  if (!machine) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Verify RTP — {machine.machine_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-slate-400 text-sm">
            {machine.area}-{machine.section}-{machine.location} &nbsp;·&nbsp; {machine.manufacturer} {machine.model}
          </p>
          <p className="text-blue-400 text-sm font-medium">
            {trimester} {year}
          </p>

          <div className="space-y-2">
            <Label className="text-slate-300">RTP Percentage <span className="text-red-400">*</span></Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={rtpPercentage}
                onChange={(e) => setRtpPercentage(e.target.value)}
                placeholder="e.g. 92.5"
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
              <span className="text-slate-300 font-semibold">%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Verified By</Label>
            <Input
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Your name"
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any observations..."
              className="h-20 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rtpPercentage || submitting}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {submitting ? "Saving..." : "Confirm RTP"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}