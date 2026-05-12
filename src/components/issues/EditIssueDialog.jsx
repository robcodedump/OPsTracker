import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

export default function EditIssueDialog({ issue, open, onOpenChange, onIssueUpdated }) {
  const [editedIssue, setEditedIssue] = useState({
    issue_description: '',
    service_status: 'in_service'
  });

  useEffect(() => {
    if (issue) {
      setEditedIssue({
        issue_description: issue.issue_description || '',
        service_status: issue.service_status || 'in_service'
      });
    }
  }, [issue]);

  const handleSubmit = async () => {
    await onIssueUpdated(issue.id, editedIssue);
    onOpenChange(false);
  };

  if (!issue) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-white flex items-center gap-2">
            <Pencil className="w-5 h-5 text-blue-400" />
            Edit Issue - {issue.machine_id}
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!editedIssue.issue_description}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white disabled:opacity-50"
          >
            Save Changes
          </Button>
        </div>
        
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4">
            <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
              <div className="text-sm text-slate-400 mb-1">Machine Location</div>
              <div className="font-semibold text-white">
                {issue.area}-{issue.section}-{issue.location}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Issue Description</Label>
              <Textarea
                value={editedIssue.issue_description}
                onChange={(e) => setEditedIssue({...editedIssue, issue_description: e.target.value})}
                placeholder="Describe the issue..."
                className="h-32 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Service Status</Label>
              <Select
                value={editedIssue.service_status}
                onValueChange={(value) => setEditedIssue({...editedIssue, service_status: value})}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  <SelectItem value="in_service">In Service</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}