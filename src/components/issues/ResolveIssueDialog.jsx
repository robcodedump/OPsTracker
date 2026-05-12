import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle } from "lucide-react";

export default function ResolveIssueDialog({ issue, open, onOpenChange, onResolve }) {
  const [resolutionNote, setResolutionNote] = useState('');

  const handleConfirm = () => {
    onResolve(issue.id, resolutionNote);
    setResolutionNote('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setResolutionNote('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            Resolve Issue
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Please provide a resolution note explaining how this issue was resolved
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Resolution Note</Label>
            <Textarea
              value={resolutionNote}
              onChange={(e) => setResolutionNote(e.target.value)}
              placeholder="Describe what was done to resolve this issue..."
              className="h-32 bg-slate-700 border-slate-600 text-white"
              autoFocus
            />
          </div>

          {issue && (
            <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Issue being resolved:</div>
              <div className="font-medium text-white mb-1">
                {issue.area}-{issue.section}-{issue.location}
              </div>
              <div className="text-sm text-slate-300">
                {issue.issue_description}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Resolution
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}