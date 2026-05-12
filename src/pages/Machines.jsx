
import React, { useState, useEffect } from "react";
import { SlotMachine, MaintenanceRecord, Issue } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import MachineCard from "../components/machines/MachineCard";
import MachineListItem from "../components/machines/MachineListItem";
import SyncIndicator from "../components/dashboard/SyncIndicator";
import BulkUploadDialog from "../components/machines/BulkUploadDialog";

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [issues, setIssues] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [manufacturerFilter, setManufacturerFilter] = useState('all');
  const [sortBy, setSortBy] = useState('asl');
  const [viewMode, setViewMode] = useState('list'); // Changed default to 'list'
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialFiltersApplied, setInitialFiltersApplied] = useState(false);

  const [newMachine, setNewMachine] = useState({
    machine_id: '',
    area: '',
    section: '',
    location: '',
    manufacturer: '',
    model: '',
    theme: '',
    serial_number: '',
    install_date: '',
    status: 'active'
  });

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAndSortMachines();
    
    // Check URL parameters for pre-filtering
    if (!initialFiltersApplied) {
      const params = new URLSearchParams(window.location.search);
      const manufacturerParam = params.get('manufacturer');
      const modelParam = params.get('model');
      
      let applied = false;
      if (manufacturerParam && manufacturerFilter === 'all') { // Only apply if not already set by user or another logic
        setManufacturerFilter(manufacturerParam);
        applied = true;
      }
      if (modelParam && searchTerm === '') { // Only apply if search term is empty
        setSearchTerm(modelParam);
        applied = true;
      }
      if (applied) {
        setInitialFiltersApplied(true); // Mark that initial filters have been processed
      }
    }
  }, [machines, searchTerm, statusFilter, areaFilter, sectionFilter, locationFilter, manufacturerFilter, sortBy, issues, initialFiltersApplied]); // Add initialFiltersApplied to dependencies

  const loadData = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        console.error('No casino selected');
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        console.error('Invalid casino data');
        setLoading(false);
        return;
      }
      
      const [machinesData, recordsData, issuesData] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        MaintenanceRecord.filter({ casino_id: casino.id }),
        Issue.filter({ casino_id: casino.id })
      ]);
      
      setMachines(machinesData);
      setMaintenanceRecords(recordsData);
      setIssues(issuesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUptime = (machine) => {
    const machineIssues = issues.filter(issue => issue.machine_id === machine.machine_id);
    const machineStartDate = machine.install_date ? new Date(machine.install_date) : new Date(machine.created_date);
    const currentDate = new Date();
    const lifetimeHours = (currentDate - machineStartDate) / (1000 * 60 * 60);
    
    if (lifetimeHours <= 0) return 100;
    
    let totalDowntimeHours = 0;
    
    machineIssues.forEach(issue => {
      if (issue.service_status === 'out_of_service') {
        const startDate = new Date(issue.reported_date);
        const endDate = issue.resolved && issue.resolved_date 
          ? new Date(issue.resolved_date) 
          : currentDate;
        
        const downtimeHours = (endDate - startDate) / (1000 * 60 * 60);
        totalDowntimeHours += downtimeHours;
      }
    });
    
    const uptimeHours = lifetimeHours - totalDowntimeHours;
    const uptimePercentage = (uptimeHours / lifetimeHours) * 100;
    
    return Math.max(0, Math.min(100, uptimePercentage));
  };

  const getIssueCount = (machine) => {
    return issues.filter(issue => issue.machine_id === machine.machine_id).length;
  };

  const filterAndSortMachines = () => {
    let filtered = machines;

    if (searchTerm) {
      filtered = filtered.filter(machine =>
        machine.machine_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (machine.theme && machine.theme.toLowerCase().includes(searchTerm.toLowerCase())) ||
        `${machine.area}-${machine.section}-${machine.location}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(machine => machine.status === statusFilter);
    }

    if (areaFilter !== 'all') {
      filtered = filtered.filter(machine => machine.area === areaFilter);
    }

    if (sectionFilter !== 'all') {
      filtered = filtered.filter(machine => machine.section === sectionFilter);
    }

    if (locationFilter !== 'all') {
      filtered = filtered.filter(machine => machine.location === locationFilter);
    }

    if (manufacturerFilter !== 'all') {
      filtered = filtered.filter(machine => machine.manufacturer === manufacturerFilter);
    }

    // Sort machines
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'asl':
          if (a.area !== b.area) return a.area.localeCompare(b.area, undefined, { numeric: true });
          if (a.section !== b.section) return a.section.localeCompare(b.section, undefined, { numeric: true });
          return a.location.localeCompare(b.location, undefined, { numeric: true });
        
        case 'issues':
          return getIssueCount(b) - getIssueCount(a);
        
        case 'asset':
          return a.machine_id.localeCompare(b.machine_id, undefined, { numeric: true });
        
        case 'uptime':
          return calculateUptime(a) - calculateUptime(b);
        
        default:
          return 0;
      }
    });

    setFilteredMachines(sorted);
  };

  const handleAddMachine = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        alert('No casino selected. Please select a casino first.');
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        alert('Invalid casino data. Please select a casino again.');
        return;
      }
      
      const machineToCreate = {
        ...newMachine,
        casino_id: casino.id,
        status: 'active' 
      };
      
      await SlotMachine.create(machineToCreate);
      setShowAddDialog(false);
      setNewMachine({
        machine_id: '',
        area: '',
        section: '',
        location: '',
        manufacturer: '',
        model: '',
        theme: '',
        serial_number: '',
        install_date: '',
        status: 'active'
      });
      loadData();
    } catch (error) {
      console.error('Error adding machine:', error);
    }
  };

  const getUniqueAreas = () => {
    return [...new Set(machines.map(m => m.area))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getUniqueSections = () => {
    return [...new Set(machines.map(m => m.section))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getUniqueLocations = () => {
    return [...new Set(machines.map(m => m.location))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  };

  const getUniqueManufacturers = () => {
    return [...new Set(machines.map(m => m.manufacturer))].sort();
  };

  const handleDeleteMachine = async (machineId) => {
    try {
      await SlotMachine.delete(machineId);
      loadData();
    } catch (error) {
      console.error('Error deleting machine:', error);
    }
  };

  const handleMoveMachine = async (machineId, newLocation) => {
    try {
      await SlotMachine.update(machineId, newLocation);
      loadData();
    } catch (error) {
      console.error('Error moving machine:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Machine Management
              </h1>
              <SyncIndicator />
            </div>
            <p className="mt-2 text-slate-400">
              Manage your slot machine inventory with A-S-L tracking
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <BulkUploadDialog onUploadComplete={loadData} />
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Machine
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Slot Machine</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Machine ID</Label>
                    <Input
                      value={newMachine.machine_id}
                      onChange={(e) => setNewMachine({...newMachine, machine_id: e.target.value})}
                      placeholder="e.g., SLOT001"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Status</Label>
                    <Select
                      value={newMachine.status}
                      onValueChange={(value) => setNewMachine({...newMachine, status: value})}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600 text-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Area (A)</Label>
                    <Input
                      value={newMachine.area}
                      onChange={(e) => setNewMachine({...newMachine, area: e.target.value})}
                      placeholder="e.g., A1"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Section (S)</Label>
                    <Input
                      value={newMachine.section}
                      onChange={(e) => setNewMachine({...newMachine, section: e.target.value})}
                      placeholder="e.g., S2"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Location (L)</Label>
                    <Input
                      value={newMachine.location}
                      onChange={(e) => setNewMachine({...newMachine, location: e.target.value})}
                      placeholder="e.g., L5"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Manufacturer</Label>
                    <Input
                      value={newMachine.manufacturer}
                      onChange={(e) => setNewMachine({...newMachine, manufacturer: e.target.value})}
                      placeholder="e.g., IGT"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Model</Label>
                    <Input
                      value={newMachine.model}
                      onChange={(e) => setNewMachine({...newMachine, model: e.target.value})}
                      placeholder="e.g., S3000"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Theme</Label>
                    <Input
                      value={newMachine.theme}
                      onChange={(e) => setNewMachine({...newMachine, theme: e.target.value})}
                      placeholder="e.g., Dragon Link"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Serial Number</Label>
                    <Input
                      value={newMachine.serial_number}
                      onChange={(e) => setNewMachine({...newMachine, serial_number: e.target.value})}
                      placeholder="Serial number"
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300">Install Date</Label>
                    <Input
                      type="date"
                      value={newMachine.install_date}
                      onChange={(e) => setNewMachine({...newMachine, install_date: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                    Cancel
                  </Button>
                  <Button onClick={handleAddMachine} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
                    Add Machine
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="mb-6 border border-slate-700 shadow-md bg-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="w-5 h-5" />
              Filters & View Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Search machines..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Area</Label>
                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Areas</SelectItem>
                      {getUniqueAreas().map(area => (
                        <SelectItem key={area} value={area}>{area}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Section</Label>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Sections</SelectItem>
                      {getUniqueSections().map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Location</Label>
                  <Select value={locationFilter} onValueChange={setLocationFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Locations</SelectItem>
                      {getUniqueLocations().map(location => (
                        <SelectItem key={location} value={location}>{location}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Vendor</Label>
                  <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="all">All Vendors</SelectItem>
                      {getUniqueManufacturers().map(manufacturer => (
                        <SelectItem key={manufacturer} value={manufacturer}>{manufacturer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Sort By</Label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="asl">A-S-L</SelectItem>
                      <SelectItem value="issues">Number of Issues (High to Low)</SelectItem>
                      <SelectItem value="asset">Asset Number (Slot ID)</SelectItem>
                      <SelectItem value="uptime">Uptime (Low to High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Display</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setViewMode('card')}
                      variant={viewMode === 'card' ? 'default' : 'outline'}
                      className={viewMode === 'card' 
                        ? 'flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white' 
                        : 'flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }
                    >
                      <LayoutGrid className="w-4 h-4 mr-2" />
                      Card
                    </Button>
                    <Button
                      onClick={() => setViewMode('list')}
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      className={viewMode === 'list' 
                        ? 'flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white' 
                        : 'flex-1 border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }
                    >
                      <List className="w-4 h-4 mr-2" />
                      List
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {filteredMachines.length > 0 ? (
          viewMode === 'card' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMachines.map((machine) => (
                <MachineCard
                  key={machine.id}
                  machine={machine}
                  maintenanceRecords={maintenanceRecords}
                  issues={issues}
                  onDelete={handleDeleteMachine}
                  onMove={handleMoveMachine}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMachines.map((machine, index) => (
                <MachineListItem
                  key={machine.id}
                  machine={machine}
                  maintenanceRecords={maintenanceRecords}
                  issues={issues}
                  onDelete={handleDeleteMachine}
                  onMove={handleMoveMachine}
                  index={index}
                />
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎰</div>
            <h3 className="text-xl font-semibold mb-2 text-white">
              {machines.length === 0 ? 'No machines found' : 'No machines match your filters'}
            </h3>
            <p className="text-slate-400">
              {machines.length === 0 
                ? 'Add your first slot machine to get started.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
