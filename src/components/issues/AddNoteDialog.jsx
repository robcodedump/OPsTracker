const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquarePlus, Upload, X } from "lucide-react";

export default function AddNoteDialog({ onNoteAdded }) {
  const [showDialog, setShowDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => db.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setUploadedImages(prev => [...prev, ...urls]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (noteText.trim()) {
      onNoteAdded(noteText, uploadedImages);
      setNoteText('');
      setUploadedImages([]);
      setShowDialog(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button 
          size="sm"
          variant="outline" 
          className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
        >
          <MessageSquarePlus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Add Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your note here..."
            className="h-32 bg-slate-700 border-slate-600 text-white"
            autoFocus
          />
          
          <div className="space-y-2">
            <Label className="text-slate-300">Images (Optional)</Label>
            <div className="flex flex-col gap-3">
              <label className="cursor-pointer">
                <div className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 border-2 border-dashed border-slate-600 rounded-lg hover:border-blue-500 hover:bg-slate-600 transition-colors">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Upload ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowDialog(false);
              setNoteText('');
              setUploadedImages([]);
            }}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!noteText.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
          >
            Add Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}