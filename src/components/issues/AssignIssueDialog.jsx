const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck } from "lucide-react";

export default function AssignIssueDialog({ open, onOpenChange, onAssign, currentAssignee }) {
  const [users, setUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
      setSelectedEmail(currentAssignee || '');
    }
  }, [open, currentAssignee]);

  const loadUsers = async () => {
    setLoading(true);
    // Load casino-specific technicians first
    const casinoData = localStorage.getItem('selected_casino') || localStorage.getItem('anonymous_casino');
    let techList = [];
    if (casinoData) {
      const casino = JSON.parse(casinoData);
      const casinoTechs = await db.entities.CasinoTechnician.filter({ casino_id: casino.id });
      techList = casinoTechs.map(t => ({ id: t.id, full_name: t.name, email: t.email || '' }));
    }
    // Fallback: also include app users with admin/technician role not already in the list
    if (techList.length === 0) {
      const allUsers = await db.entities.User.list();
      techList = allUsers.filter(u => u.role === 'admin' || u.role === 'technician');
    }
    setUsers(techList);
    setLoading(false);
  };

  const handleConfirm = () => {
    onAssign(selectedEmail || null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            Assign Issue
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <Select value={selectedEmail} onValueChange={setSelectedEmail}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white min-h-[44px]">
                <SelectValue placeholder="Select a technician..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                <SelectItem value="unassigned">— Unassigned —</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.email}>
                    {u.full_name} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white min-h-[44px]"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}