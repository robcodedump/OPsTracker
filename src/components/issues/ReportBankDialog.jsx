const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Building2 } from "lucide-react";

export default function ReportBankDialog({ machines, onIssuesAdded }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [issueData, setIssueData] = useState({
    issue_description: '',
    service_status: 'in_service',
    reported_date: new Date().toISOString()
  });
  const [reporterName, setReporterName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const getUniqueAreas = () => {
    return [...new Set(machines.map(m => m.area))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getSectionsForArea = (area) => {
    if (!area) return [];
    return [...new Set(machines.filter(m => m.area === area).map(m => m.section))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getMachinesInBank = () => {
    if (!selectedArea || !selectedSection) return [];
    return machines.filter(m => m.area === selectedArea && m.section === selectedSection);
  };

  const handleSubmit = async () => {
    const bankMachines = getMachinesInBank();
    if (bankMachines.length === 0) {
      alert('No machines found in selected bank');
      return;
    }

    setSubmitting(true);
    try {
      const user = await db.auth.me().catch(() => null);
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino') ||
                        sessionStorage.getItem('anonymous_casino');
      
      if (!casinoData) {
        alert('No casino selected. Please refresh the page and select a casino.');
        setSubmitting(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        alert('Invalid casino data. Please refresh the page and select a casino again.');
        setSubmitting(false);
        return;
      }

      const author = reporterName.trim() || user?.email || 'Anonymous';
      
      // Generate timestamp at submission time, not when dialog opened
      const currentTimestamp = new Date().toISOString();

      // Create an issue for each machine in the bank
      const issuePromises = bankMachines.map(machine => {
        const initialNotesEntry = issueData.issue_description.trim() ? [{
          text: issueData.issue_description.trim(),
          timestamp: currentTimestamp,
          author: author
        }] : [];

        return onIssuesAdded({
          casino_id: casino.id,
          machine_id: machine.machine_id,
          area: machine.area,
          section: machine.section,
          location: machine.location,
          issue_description: issueData.issue_description,
          service_status: issueData.service_status,
          reported_date: currentTimestamp, // Use current timestamp
          resolved: false,
          notes: initialNotesEntry
        });
      });

      await Promise.all(issuePromises);

      setShowDialog(false);
      resetForm();
      alert(`Successfully reported issues for ${bankMachines.length} machines in Bank ${selectedArea}-${selectedSection}`);
    } catch (error) {
      console.error('Error reporting bank issues:', error);
      alert('Error reporting issues. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedArea('');
    setSelectedSection('');
    setReporterName('');
    setIssueData({
      issue_description: '',
      service_status: 'in_service',
      reported_date: new Date().toISOString()
    });
  };

  const bankMachines = getMachinesInBank();

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      setShowDialog(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-white border-red-600 bg-red-900/30 hover:bg-red-900/50">
          <Building2 className="w-4 h-4 mr-2" />
          Report Bank
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-red-400" />
            Report Issues for Entire Bank
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
            className="flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedArea || !selectedSection || !issueData.issue_description || submitting}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white disabled:opacity-50"
          >
            {submitting ? 'Reporting...' : `Report Issues (${bankMachines.length} machines)`}
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Area (A)</Label>
                <Select
                  value={selectedArea}
                  onValueChange={(value) => {
                    setSelectedArea(value);
                    setSelectedSection('');
                  }}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select area..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {getUniqueAreas().map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Section (S)</Label>
                <Select
                  value={selectedSection}
                  onValueChange={setSelectedSection}
                  disabled={!selectedArea}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white disabled:opacity-50">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {getSectionsForArea(selectedArea).map(section => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {bankMachines.length > 0 && (
              <div className="p-3 bg-blue-900/30 border border-blue-600 rounded-lg">
                <div className="text-sm font-medium text-blue-300 mb-1">
                  Bank {selectedArea}-{selectedSection}
                </div>
                <div className="text-sm text-blue-200">
                  {bankMachines.length} machine{bankMachines.length !== 1 ? 's' : ''} will have issues reported
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-300">Issue Description</Label>
              <Textarea
                value={issueData.issue_description}
                onChange={(e) => setIssueData({...issueData, issue_description: e.target.value})}
                placeholder="Describe the issue affecting all machines in this bank..."
                className="h-24 bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Service Status</Label>
              <Select
                value={issueData.service_status}
                onValueChange={(value) => setIssueData({...issueData, service_status: value})}
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

            <div className="space-y-2">
              <Label className="text-slate-300">Reporter Name</Label>
              <Input
                type="text"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Enter your name..."
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}