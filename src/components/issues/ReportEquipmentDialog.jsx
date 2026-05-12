const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wrench, Upload, X } from "lucide-react";

export default function ReportEquipmentDialog({ onSubmitted }) {
  const [showDialog, setShowDialog] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showDialog) {
      loadEquipment();
    }
  }, [showDialog]);

  const loadEquipment = async () => {
    const casinoData = localStorage.getItem('selected_casino') || localStorage.getItem('anonymous_casino');
    if (!casinoData) return;
    const casino = JSON.parse(casinoData);
    const data = await db.entities.Equipment.filter({ casino_id: casino.id });
    setEquipment(data);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const results = await Promise.all(files.map(file => db.integrations.Core.UploadFile({ file })));
    setUploadedImages(prev => [...prev, ...results.map(r => r.file_url)]);
    setUploading(false);
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedEquipmentId || !description) return;
    setSubmitting(true);

    const casinoData = localStorage.getItem('selected_casino') || localStorage.getItem('anonymous_casino');
    const casino = JSON.parse(casinoData);
    const selectedEquipment = equipment.find(e => e.id === selectedEquipmentId);

    // Create EquipmentLog entry
    await db.entities.EquipmentLog.create({
      casino_id: casino.id,
      equipment_id: selectedEquipmentId,
      entry_type: 'issue',
      title: `${selectedEquipment.model_name} - ${selectedEquipment.location}`,
      description: description,
      technician: reporterName || 'Anonymous',
      log_date: new Date().toISOString(),
      status: 'open',
      image_urls: uploadedImages,
    });

    // Set equipment status to inactive
    await db.entities.Equipment.update(selectedEquipmentId, { status: 'inactive' });

    setSubmitting(false);
    setShowDialog(false);
    resetForm();
    if (onSubmitted) onSubmitted();
  };

  const resetForm = () => {
    setSelectedEquipmentId('');
    setDescription('');
    setReporterName('');
    setUploadedImages([]);
  };

  return (
    <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white min-h-[44px]">
          <Wrench className="w-4 h-4 mr-2" />
          Report Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-slate-800 border-slate-700 text-white max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-400" />
            Report Equipment Issue
          </DialogTitle>
        </DialogHeader>

        {/* Action buttons at top */}
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDialog(false)}
            className="flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600 min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEquipmentId || !description || submitting}
            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 text-white disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {/* Equipment Selector */}
          <div className="space-y-2">
            <Label className="text-slate-300">Equipment *</Label>
            <Select value={selectedEquipmentId} onValueChange={setSelectedEquipmentId}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white min-h-[44px]">
                <SelectValue placeholder="Select equipment..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600 text-white">
                {equipment.map(eq => (
                  <SelectItem key={eq.id} value={eq.id}>
                    {eq.model_name} — {eq.location} ({eq.equipment_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue Description */}
          <div className="space-y-2">
            <Label className="text-slate-300">Issue Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue..."
              className="h-24 bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Reporter Name */}
          <div className="space-y-2">
            <Label className="text-slate-300">Your Name</Label>
            <Input
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Enter your name..."
              className="bg-slate-700 border-slate-600 text-white min-h-[44px]"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-slate-300">Images (Optional)</Label>
            <label className="cursor-pointer block">
              <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg hover:border-orange-500 hover:bg-slate-600 transition-colors">
                <Upload className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 text-sm">
                  {uploading ? 'Uploading...' : 'Upload Images'}
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt={`Upload ${index + 1}`} className="w-full h-20 object-cover rounded-lg border border-slate-600" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}