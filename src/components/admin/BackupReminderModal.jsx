import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Download } from "lucide-react";

export default function BackupReminderModal({ open, onDownload, onRemindLater }) {
  return (
    <Dialog open={open} onOpenChange={onRemindLater}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            Backup Reminder
          </DialogTitle>
          <DialogDescription className="text-center text-slate-300 pt-4">
            <p className="text-lg mb-4">
              It has been over 30 days since your last data backup. Would you like to download a current backup now?
            </p>
            <p className="text-sm text-slate-400">
              Regular backups help protect your data in case of unexpected issues.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button 
            onClick={onDownload}
            className="w-full h-12 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Backup Now
          </Button>
          <Button 
            onClick={onRemindLater}
            variant="outline"
            className="w-full h-12 text-lg border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Remind Me Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}