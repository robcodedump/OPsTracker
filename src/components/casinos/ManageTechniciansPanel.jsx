const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserCheck, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function ManageTechniciansPanel({ casino }) {
  const [expanded, setExpanded] = useState(false);
  const [techs, setTechs] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [addMode, setAddMode] = useState('existing'); // 'existing' | 'manual'
  const [selectedUserEmail, setSelectedUserEmail] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded) {
      loadTechs();
      loadAppUsers();
    }
  }, [expanded]);

  const loadTechs = async () => {
    const data = await db.entities.CasinoTechnician.filter({ casino_id: casino.id });
    setTechs(data);
  };

  const loadAppUsers = async () => {
    const users = await db.entities.User.list();
    setAppUsers(users.filter(u => u.role === 'admin' || u.role === 'technician'));
  };

  const handleAddExisting = async () => {
    if (!selectedUserEmail) return;
    const user = appUsers.find(u => u.email === selectedUserEmail);
    if (!user) return;
    setLoading(true);
    await db.entities.CasinoTechnician.create({
      casino_id: casino.id,
      name: user.full_name,
      email: user.email
    });
    setSelectedUserEmail('');
    await loadTechs();
    setLoading(false);
  };

  const handleAddManual = async () => {
    if (!manualName.trim()) return;
    setLoading(true);
    await db.entities.CasinoTechnician.create({
      casino_id: casino.id,
      name: manualName.trim(),
      email: manualEmail.trim() || null
    });
    setManualName('');
    setManualEmail('');
    await loadTechs();
    setLoading(false);
  };

  const handleRemove = async (id) => {
    await db.entities.CasinoTechnician.delete(id);
    await loadTechs();
  };

  return (
    <div className="mt-3 border-t border-slate-600 pt-3">
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
      >
        <UserCheck className="w-4 h-4" />
        Manage Technicians
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          {/* Existing techs list */}
          {techs.length > 0 ? (
            <div className="space-y-2">
              {techs.map(tech => (
                <div key={tech.id} className="flex items-center justify-between px-3 py-2 bg-slate-700/60 rounded-lg border border-slate-600">
                  <div>
                    <span className="text-white text-sm font-medium">{tech.name}</span>
                    {tech.email && <span className="text-slate-400 text-xs ml-2">({tech.email})</span>}
                  </div>
                  <button
                    onClick={() => handleRemove(tech.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No technicians assigned yet.</p>
          )}

          {/* Add mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setAddMode('existing')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${addMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Pick from App Users
            </button>
            <button
              onClick={() => setAddMode('manual')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${addMode === 'manual' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              Add Manually
            </button>
          </div>

          {addMode === 'existing' ? (
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white min-h-[44px]">
                    <SelectValue placeholder="Select an app user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {appUsers.map(u => (
                      <SelectItem key={u.id} value={u.email}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddExisting}
                disabled={!selectedUserEmail || loading}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-slate-400 text-xs mb-1 block">Name *</Label>
                  <Input
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="Full name..."
                    className="bg-slate-700 border-slate-600 text-white min-h-[44px]"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-slate-400 text-xs mb-1 block">Email (optional)</Label>
                  <Input
                    value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="bg-slate-700 border-slate-600 text-white min-h-[44px]"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddManual}
                disabled={!manualName.trim() || loading}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Technician
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}