import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileBarChart, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ReportRamClearDialog({ machines, onRamClearReported }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [currentRtp, setCurrentRtp] = useState('');
  const [maxBet, setMaxBet] = useState('');
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);

  const getUniqueAreas = () => {
    const areas = new Set();
    machines.forEach(machine => areas.add(machine.area));
    return Array.from(areas).sort((a, b) => 
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  };

  const getSectionsForArea = (area) => {
    const sections = new Set();
    machines
      .filter(machine => machine.area === area)
      .forEach(machine => sections.add(machine.section));
    return Array.from(sections).sort((a, b) => 
      String(a).localeCompare(String(b), undefined, { numeric: true })
    );
  };

  const getLocationsForAreaSection = (area, section) => {
    return machines
      .filter(machine => machine.area === area && machine.section === section)
      .map(machine => machine.location)
      .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  };

  const handleSubmit = async (addAnother = false) => {
    if (!selectedArea || !selectedSection || !selectedLocation || !currentRtp || !maxBet) {
      return;
    }

    const casinoData = localStorage.getItem('selected_casino') || 
                      localStorage.getItem('anonymous_casino') ||
                      sessionStorage.getItem('selected_casino');
    
    if (!casinoData) return;
    
    const casino = JSON.parse(casinoData);

    const ramClearData = {
      casino_id: casino.id,
      area: selectedArea,
      section: selectedSection,
      location: selectedLocation,
      current_rtp: parseFloat(currentRtp),
      max_bet: maxBet,
      clear_date: clearDate,
      checked: false
    };

    await onRamClearReported(ramClearData);

    if (addAnother) {
      toast({
        title: "Ram Clear Saved",
        description: `${selectedArea}-${selectedSection}-${selectedLocation} saved successfully.`,
        duration: 2000,
      });
      setSelectedLocation('');
    } else {
      setSelectedArea('');
      setSelectedSection('');
      setSelectedLocation('');
      setCurrentRtp('');
      setMaxBet('');
      setClearDate(new Date().toISOString().split('T')[0]);
      setOpen(false);
    }
  };

  const uniqueAreas = getUniqueAreas();
  const availableSections = selectedArea ? getSectionsForArea(selectedArea) : [];
  const availableLocations = selectedArea && selectedSection ? getLocationsForAreaSection(selectedArea, selectedSection) : [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white">
          <FileBarChart className="w-4 h-4 mr-2" />
          Report Ram Clear
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Report Ram Clear</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Area *</Label>
              <Select
                value={selectedArea}
                onValueChange={(value) => {
                  setSelectedArea(value);
                  setSelectedSection('');
                  setSelectedLocation('');
                }}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select area" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  {uniqueAreas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Section *</Label>
              <Select
                value={selectedSection}
                onValueChange={(value) => {
                  setSelectedSection(value);
                  setSelectedLocation('');
                }}
                disabled={!selectedArea}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  {availableSections.map(section => (
                    <SelectItem key={section} value={section}>{section}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Location *</Label>
              <Select
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                disabled={!selectedSection}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600 text-white">
                  {availableLocations.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Current RTP *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g., 92.5"
                value={currentRtp}
                onChange={(e) => setCurrentRtp(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Max Bet *</Label>
              <Input
                type="text"
                placeholder="e.g., $5.00"
                value={maxBet}
                onChange={(e) => setMaxBet(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Date *</Label>
              <Input
                type="date"
                value={clearDate}
                onChange={(e) => setClearDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={!selectedArea || !selectedSection || !selectedLocation || !currentRtp || !maxBet}
            variant="outline"
            className="border-purple-600 bg-purple-900/30 text-purple-300 hover:bg-purple-900/50"
          >
            <Check className="w-4 h-4 mr-2" />
            Add Another
          </Button>
          <Button
            onClick={() => handleSubmit(false)}
            disabled={!selectedArea || !selectedSection || !selectedLocation || !currentRtp || !maxBet}
            className="bg-gradient-to-r from-purple-600 to-purple-500 text-white"
          >
            Submit Ram Clear
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}