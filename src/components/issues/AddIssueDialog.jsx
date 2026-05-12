const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Upload, X } from "lucide-react";
import { User } from "@/entities/User";
import { SlotMachine } from "@/entities/all";

export default function AddIssueDialog({ machines, onIssueAdded }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [newIssue, setNewIssue] = useState({
    machine_id: '',
    area: '',
    section: '',
    location: '',
    issue_description: '',
    service_status: 'in_service',
    reported_date: new Date().toISOString(),
    resolved: false,
    notes: []
  });
  const [initialNote, setInitialNote] = useState(''); // This state will now hold the reporter's name
  const [markAsResolved, setMarkAsResolved] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Refs for auto-focus
  const areaRef = useRef(null);
  const sectionRef = useRef(null);
  const locationRef = useRef(null);
  const descriptionRef = useRef(null);

  // Type-ahead state
  const [areaTypeAhead, setAreaTypeAhead] = useState('');
  const [sectionTypeAhead, setSectionTypeAhead] = useState('');
  const [locationTypeAhead, setLocationTypeAhead] = useState('');
  const typeAheadTimerRef = useRef(null);

  // Auto-focus on Area when dialog opens
  useEffect(() => {
    if (showDialog) {
      setTimeout(() => {
        areaRef.current?.focus();
      }, 100);
    }
  }, [showDialog]);

  // Get unique areas
  const getUniqueAreas = () => {
    const areas = [...new Set(machines.map(m => m.area))];
    return areas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  // Get sections for selected area
  const getSectionsForArea = (area) => {
    if (!area) return [];
    const sections = [...new Set(machines.filter(m => m.area === area).map(m => m.section))];
    return sections.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  // Get locations for selected area and section
  const getLocationsForSection = (area, section) => {
    if (!area || !section) return [];
    const locations = [...new Set(machines.filter(m => m.area === area && m.section === section).map(m => m.location))];
    return locations.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const handleAreaSelect = (area) => {
    setSelectedArea(area);
    setSelectedSection('');
    setSelectedLocation('');
    setSelectedMachine(null);
    setNewIssue({
      ...newIssue,
      machine_id: '',
      area: area,
      section: '',
      location: ''
    });

    // Auto-advance to Section
    setTimeout(() => {
      sectionRef.current?.focus();
    }, 100);
  };

  const handleSectionSelect = (section) => {
    setSelectedSection(section);
    setSelectedLocation('');
    setSelectedMachine(null);
    setNewIssue({
      ...newIssue,
      machine_id: '',
      section: section,
      location: ''
    });

    // Auto-advance to Location
    setTimeout(() => {
      locationRef.current?.focus();
    }, 100);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);

    // Find the machine with this A-S-L combination
    const machine = machines.find(m =>
      m.area === selectedArea &&
      m.section === selectedSection &&
      m.location === location
    );

    if (machine) {
      setSelectedMachine(machine);
      setNewIssue({
        ...newIssue,
        machine_id: machine.machine_id,
        location: location
      });

      // Auto-advance to Description
      setTimeout(() => {
        descriptionRef.current?.focus();
      }, 100);
    }
  };

  // Type-ahead handler for Area
  const handleAreaTypeAhead = (char) => {
    if (!/^\d$/.test(char)) return;

    const newTypeAhead = areaTypeAhead + char;
    setAreaTypeAhead(newTypeAhead);

    const areas = getUniqueAreas();
    const match = areas.find(area => area.toString().startsWith(newTypeAhead));

    if (match) {
      clearTimeout(typeAheadTimerRef.current);
      typeAheadTimerRef.current = setTimeout(() => {
        handleAreaSelect(match);
        setAreaTypeAhead('');
      }, 500);
    }
  };

  // Type-ahead handler for Section
  const handleSectionTypeAhead = (char) => {
    if (!/^\d$/.test(char)) return;

    const newTypeAhead = sectionTypeAhead + char;
    setSectionTypeAhead(newTypeAhead);

    const sections = getSectionsForArea(selectedArea);
    const match = sections.find(section => section.toString().startsWith(newTypeAhead));

    if (match) {
      clearTimeout(typeAheadTimerRef.current);
      typeAheadTimerRef.current = setTimeout(() => {
        handleSectionSelect(match);
        setSectionTypeAhead('');
      }, 500);
    }
  };

  // Type-ahead handler for Location
  const handleLocationTypeAhead = (char) => {
    if (!/^\d$/.test(char)) return;

    const newTypeAhead = locationTypeAhead + char;
    setLocationTypeAhead(newTypeAhead);

    const locations = getLocationsForSection(selectedArea, selectedSection);
    const match = locations.find(location => location.toString().startsWith(newTypeAhead));

    if (match) {
      clearTimeout(typeAheadTimerRef.current);
      typeAheadTimerRef.current = setTimeout(() => {
        handleLocationSelect(match);
        setLocationTypeAhead('');
      }, 500);
    }
  };

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

  const handleSubmit = async () => {
    const user = await User.me().catch(() => null);
    // Use localStorage for persistent casino selection
    const casinoData = localStorage.getItem('selected_casino') ||
                      localStorage.getItem('anonymous_casino') ||
                      sessionStorage.getItem('selected_casino') ||
                      sessionStorage.getItem('anonymous_casino');
    
    if (!casinoData) {
      alert('No casino selected. Please refresh the page and select a casino.');
      return;
    }
    
    const casino = JSON.parse(casinoData);
    
    if (!casino || !casino.id) {
      alert('Invalid casino data. Please refresh the page and select a casino again.');
      return;
    }

    const reporterName = initialNote.trim(); // Use initialNote as the reporter's name
    const author = reporterName || user?.email || 'Anonymous'; // Prioritize entered name

    // Generate timestamp at submission time, not when dialog opened
    const currentTimestamp = new Date().toISOString();
    
    const initialNotesEntry = newIssue.issue_description.trim() ? [{
      text: newIssue.issue_description.trim(), // Use issue description as the text for the first note
      timestamp: currentTimestamp,
      author: author
    }] : [];

    // Add resolution notes if marking as resolved
    if (markAsResolved && resolutionNotes.trim()) {
      initialNotesEntry.push({
        text: `Resolution: ${resolutionNotes.trim()}`,
        timestamp: currentTimestamp,
        author: author
      });
    }

    const issueToSubmit = {
      ...newIssue,
      casino_id: casino.id,
      reported_date: currentTimestamp, // Use current timestamp, not the one from state
      notes: initialNotesEntry,
      resolved: markAsResolved,
      resolved_date: markAsResolved ? currentTimestamp : null,
      image_urls: uploadedImages
    };

    await onIssueAdded(issueToSubmit);

    // Automation: Update machine status based on issue status
    if (selectedMachine) {
      try {
        if (newIssue.service_status === 'out_of_service' && !markAsResolved) {
          // Set machine to maintenance when issue is out of service and not immediately resolved
          await SlotMachine.update(selectedMachine.id, { status: 'maintenance' });
        } else if (markAsResolved) {
          // Set machine back to active when issue is resolved immediately
          await SlotMachine.update(selectedMachine.id, { status: 'active' });
        }
      } catch (error) {
        console.error('Error updating machine status:', error);
      }
    }

    // Check if user is Site Staff (anonymous)
    const isAnonymous = !!(localStorage.getItem('anonymous_casino') || sessionStorage.getItem('anonymous_casino'));
    
    setShowDialog(false);
    resetForm();

    // Redirect Site Staff to machine detail page
    if (isAnonymous && selectedMachine) {
      const url = `/MachineDetail?id=${selectedMachine.machine_id}`;
      window.location.href = url;
    }
  };

  const resetForm = () => {
    setSelectedArea('');
    setSelectedSection('');
    setSelectedLocation('');
    setSelectedMachine(null);
    setInitialNote(''); // Clear the name field
    setMarkAsResolved(false);
    setResolutionNotes('');
    setUploadedImages([]);
    setAreaTypeAhead('');
    setSectionTypeAhead('');
    setLocationTypeAhead('');
    clearTimeout(typeAheadTimerRef.current);
    setNewIssue({
      machine_id: '',
      area: '',
      section: '',
      location: '',
      issue_description: '',
      service_status: 'in_service',
      reported_date: new Date().toISOString(),
      resolved: false,
      notes: []
    });
  };

  return (
    <Dialog open={showDialog} onOpenChange={(open) => {
      setShowDialog(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="text-white bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Report Issue
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-700">
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Report Slot Machine Issue
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
            disabled={!selectedMachine || !newIssue.issue_description}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-500 text-white disabled:opacity-50"
          >
            Report Issue
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Area (A)</Label>
                <Select
                  value={selectedArea}
                  onValueChange={handleAreaSelect}
                  onOpenChange={(open) => {
                    if (open) {
                      setAreaTypeAhead('');
                    }
                  }}
                >
                  <SelectTrigger
                    ref={areaRef}
                    className="bg-slate-700 border-slate-600 text-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedArea) {
                        e.preventDefault();
                        clearTimeout(typeAheadTimerRef.current);
                        setTimeout(() => sectionRef.current?.focus(), 100);
                      } else if (/^\d$/.test(e.key)) {
                        handleAreaTypeAhead(e.key);
                      }
                    }}
                  >
                    <SelectValue placeholder="Type area number..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {getUniqueAreas().map(area => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {areaTypeAhead && (
                  <div className="text-xs text-blue-400">Typing: {areaTypeAhead}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Section (S)</Label>
                <Select
                  value={selectedSection}
                  onValueChange={handleSectionSelect}
                  disabled={!selectedArea}
                  onOpenChange={(open) => {
                    if (open) {
                      setSectionTypeAhead('');
                    }
                  }}
                >
                  <SelectTrigger
                    ref={sectionRef}
                    className="bg-slate-700 border-slate-600 text-white disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedSection) {
                        e.preventDefault();
                        clearTimeout(typeAheadTimerRef.current);
                        setTimeout(() => locationRef.current?.focus(), 100);
                      } else if (/^\d$/.test(e.key)) {
                        handleSectionTypeAhead(e.key);
                      }
                    }}
                  >
                    <SelectValue placeholder="Type section number..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {getSectionsForArea(selectedArea).map(section => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {sectionTypeAhead && (
                  <div className="text-xs text-blue-400">Typing: {sectionTypeAhead}</div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Location (L)</Label>
                <Select
                  value={selectedLocation}
                  onValueChange={handleLocationSelect}
                  disabled={!selectedSection}
                  onOpenChange={(open) => {
                    if (open) {
                      setLocationTypeAhead('');
                    }
                  }}
                >
                  <SelectTrigger
                    ref={locationRef}
                    className="bg-slate-700 border-slate-600 text-white disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && selectedLocation) {
                        e.preventDefault();
                        clearTimeout(typeAheadTimerRef.current);
                        setTimeout(() => descriptionRef.current?.focus(), 100);
                      } else if (/^\d$/.test(e.key)) {
                        handleLocationTypeAhead(e.key);
                      }
                    }}
                  >
                    <SelectValue placeholder="Type location number..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    {getLocationsForSection(selectedArea, selectedSection).map(location => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {locationTypeAhead && (
                  <div className="text-xs text-blue-400">Typing: {locationTypeAhead}</div>
                )}
              </div>
            </div>

            {selectedMachine && (
              <>
                <div className="p-3 bg-slate-700/50 border border-slate-600 rounded-lg">
                  <div className="text-sm text-slate-400 mb-1">Selected Machine</div>
                  <div className="font-semibold text-white">
                    {selectedMachine.machine_id}
                  </div>
                  <div className="text-sm text-slate-400">
                    {selectedMachine.manufacturer} {selectedMachine.model}
                    {selectedMachine.theme && ` (${selectedMachine.theme})`}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Issue Description</Label>
                  <Textarea
                    ref={descriptionRef}
                    value={newIssue.issue_description}
                    onChange={(e) => setNewIssue({...newIssue, issue_description: e.target.value})}
                    placeholder="Describe the issue..."
                    className="h-24 bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-300">Service Status</Label>
                  <Select
                    value={newIssue.service_status}
                    onValueChange={(value) => setNewIssue({...newIssue, service_status: value})}
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
                  <Label className="text-slate-300">Name</Label>
                  <Input
                    type="text"
                    value={initialNote}
                    onChange={(e) => setInitialNote(e.target.value)}
                    placeholder="Enter your name..."
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

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

                <div className="space-y-3 pt-2 border-t border-slate-600">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="mark-resolved"
                      checked={markAsResolved}
                      onChange={(e) => setMarkAsResolved(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <Label htmlFor="mark-resolved" className="text-slate-300 cursor-pointer">
                      Mark as resolved immediately
                    </Label>
                  </div>

                  {markAsResolved && (
                    <div className="space-y-2 pl-6">
                      <Label className="text-slate-300">Resolution Notes</Label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Optional notes on how the issue was resolved..."
                        className="h-20 bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}