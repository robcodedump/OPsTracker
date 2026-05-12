import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

export default function CompleteRamClearDialog({ ramClear, open, onOpenChange, onComplete }) {
  const [notes, setNotes] = useState('');

  const handleComplete = () => {
    onComplete(ramClear, notes);
    setNotes('');
    onOpenChange(false);
  };

  if (!ramClear) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Complete Ram Clear</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-400">Location:</span>
                <span className="ml-2 font-semibold text-white">
                  {ramClear.area}-{ramClear.section}-{ramClear.location}
                </span>
              </div>
              <div>
                <span className="text-slate-400">RTP:</span>
                <span className="ml-2 font-semibold text-white">{ramClear.current_rtp}%</span>
              </div>
              <div>
                <span className="text-slate-400">Max Bet:</span>
                <span className="ml-2 font-semibold text-white">{ramClear.max_bet}</span>
              </div>
              <div>
                <span className="text-slate-400">Date:</span>
                <span className="ml-2 text-white">{ramClear.clear_date}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document any issues found or resolutions..."
              className="h-32 bg-slate-700 border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500">
              Add any notes about issues found during the check or resolutions applied.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Checked
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}