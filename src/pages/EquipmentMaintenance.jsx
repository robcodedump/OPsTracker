const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Wrench, FileText, Server, Monitor, Printer, Signpost, CreditCard, ChevronRight, Pencil, Clock, CheckCircle } from "lucide-react";
import { format, differenceInDays, addDays, addMonths } from "date-fns";

export default function EquipmentMaintenance() {
  const [equipment, setEquipment] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [selectedEquipmentFilter, setSelectedEquipmentFilter] = useState('all');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('log');

  const [newEquipment, setNewEquipment] = useState({
    equipment_type: 'shuffler',
    model_name: '',
    asset_id: '',
    location: '',
    install_date: '',
    status: 'active',
    pm_cycle: 'monthly'
  });

  const [editEquipment, setEditEquipment] = useState({
    equipment_type: 'shuffler',
    model_name: '',
    asset_id: '',
    location: '',
    install_date: '',
    status: 'active',
    pm_cycle: 'monthly'
  });

  const [newLog, setNewLog] = useState({
    equipment_id: '',
    entry_type: 'issue',
    title: '',
    description: '',
    severity: 'medium',
    status: 'open',
    technician: '',
    log_date: new Date().toISOString()
  });

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await db.auth.me();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) {
        setLoading(false);
        return;
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        setLoading(false);
        return;
      }
      
      const [equipmentData, logsData] = await Promise.all([
        db.entities.Equipment.filter({ casino_id: casino.id }),
        db.entities.EquipmentLog.filter({ casino_id: casino.id }, '-log_date')
      ]);
      
      setEquipment(equipmentData);
      setLogs(logsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEquipment = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) return;
      
      const casino = JSON.parse(casinoData);
      
      await db.entities.Equipment.create({
        ...newEquipment,
        casino_id: casino.id
      });
      
      setShowAddDialog(false);
      setNewEquipment({
        equipment_type: 'shuffler',
        model_name: '',
        asset_id: '',
        location: '',
        install_date: '',
        status: 'active',
        pm_cycle: 'monthly'
      });
      loadData();
    } catch (error) {
      console.error('Error adding equipment:', error);
    }
  };

  const handleDeleteEquipment = async (equipmentId) => {
    try {
      const equipmentLogs = logs.filter(log => log.equipment_id === equipmentId);
      await Promise.all(equipmentLogs.map(log => db.entities.EquipmentLog.delete(log.id)));
      
      await db.entities.Equipment.delete(equipmentId);
      loadData();
    } catch (error) {
      console.error('Error deleting equipment:', error);
    }
  };

  const handleQuickPM = async (item, e) => {
    e.stopPropagation();
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) return;
      
      const casino = JSON.parse(casinoData);
      const technicianName = currentUser?.full_name || currentUser?.email || 'Unknown';
      
      const logData = {
        casino_id: casino.id,
        equipment_id: item.id,
        entry_type: 'preventative_maintenance',
        title: 'Quick PM',
        description: '',
        severity: 'routine',
        status: 'completed',
        technician: technicianName,
        log_date: new Date().toISOString()
      };
      
      await db.entities.EquipmentLog.create(logData);
      
      // Update equipment's last_pm_date
      await db.entities.Equipment.update(item.id, {
        last_pm_date: new Date().toISOString().split('T')[0]
      });
      
      loadData();
    } catch (error) {
      console.error('Error recording quick PM:', error);
    }
  };

  const handleAddLog = async () => {
    try {
      const casinoData = localStorage.getItem('selected_casino') || 
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino');
      
      if (!casinoData) return;
      
      const casino = JSON.parse(casinoData);
      
      const technicianName = newLog.technician.trim() || currentUser?.full_name || currentUser?.email || 'Unknown';
      
      const logData = {
        ...newLog,
        casino_id: casino.id,
        technician: technicianName,
        status: newLog.entry_type === 'preventative_maintenance' ? 'completed' : newLog.status
      };
      
      await db.entities.EquipmentLog.create(logData);
      
      // If this is a PM log, update the equipment's last_pm_date
      if (newLog.entry_type === 'preventative_maintenance' && newLog.equipment_id) {
        const equipmentItem = equipment.find(eq => eq.id === newLog.equipment_id);
        if (equipmentItem) {
          await db.entities.Equipment.update(newLog.equipment_id, {
            last_pm_date: new Date().toISOString().split('T')[0]
          });
        }
      }
      
      setNewLog({
        equipment_id: '',
        entry_type: 'issue',
        title: '',
        description: '',
        severity: 'medium',
        status: 'open',
        technician: '',
        log_date: new Date().toISOString()
      });
      loadData();
    } catch (error) {
      console.error('Error adding log:', error);
    }
  };

  const handleEditClick = (item, e) => {
    e.stopPropagation();
    setEditingEquipment(item);
    setEditEquipment({
      equipment_type: item.equipment_type,
      model_name: item.model_name,
      asset_id: item.asset_id || '',
      location: item.location,
      install_date: item.install_date || '',
      status: item.status,
      pm_cycle: item.pm_cycle || 'monthly'
    });
    setShowEditDialog(true);
  };

  const handleUpdateEquipment = async () => {
    try {
      await db.entities.Equipment.update(editingEquipment.id, editEquipment);
      setShowEditDialog(false);
      setEditingEquipment(null);
      loadData();
    } catch (error) {
      console.error('Error updating equipment:', error);
    }
  };

  const getPMCycleDays = (cycle) => {
    switch (cycle) {
      case 'bi-weekly': return 14;
      case 'monthly': return 30;
      case 'quarterly': return 90;
      case 'yearly': return 365;
      default: return 30;
    }
  };

  const calculatePMStatus = (item) => {
    // Determine the base date (last PM or install date)
    const baseDate = item.last_pm_date 
      ? new Date(item.last_pm_date)
      : (item.install_date ? new Date(item.install_date) : new Date());
    
    const cycleDays = getPMCycleDays(item.pm_cycle);
    
    // Calculate next PM due date
    let nextPMDate;
    if (item.pm_cycle === 'monthly') {
      // For monthly, use actual calendar month
      const lastPMDate = item.last_pm_date ? new Date(item.last_pm_date) : (item.install_date ? new Date(item.install_date) : new Date());
      nextPMDate = addMonths(lastPMDate, 1);
    } else {
      // For other cycles, use days
      nextPMDate = addDays(baseDate, cycleDays);
    }
    
    const today = new Date();
    const daysUntilDue = differenceInDays(nextPMDate, today);
    
    // Determine status
    let status = 'normal';
    if (daysUntilDue < 0) {
      status = 'overdue';
    } else if (daysUntilDue <= 7) {
      status = 'warning';
    }
    
    return {
      status,
      nextPMDate,
      daysUntilDue,
      isOverdue: daysUntilDue < 0,
      isWarning: daysUntilDue >= 0 && daysUntilDue <= 7
    };
  };

  const getPMStatusColor = (status) => {
    switch (status) {
      case 'warning':
        return 'bg-yellow-900/40 border-yellow-500';
      case 'overdue':
        return 'bg-red-900/40 border-red-500';
      default:
        return 'bg-slate-800 border-slate-700';
    }
  };

  const getPMStatusBadge = (pmStatus) => {
    if (pmStatus.status === 'overdue') {
      return (
        <Badge className="bg-red-900/50 text-red-300 border-red-700 border">
          🔴 PM Overdue
        </Badge>
      );
    } else if (pmStatus.status === 'warning') {
      return (
        <Badge className="bg-yellow-900/50 text-yellow-300 border-yellow-700 border">
          ⚠️ PM Due Soon
        </Badge>
      );
    }
    return null;
  };

  const formatPMDueDate = (pmStatus) => {
    const daysText = Math.abs(pmStatus.daysUntilDue);
    const daysLabel = daysText === 1 ? 'day' : 'days';
    
    if (pmStatus.isOverdue) {
      return `Next PM: ${format(pmStatus.nextPMDate, 'MMM d')} (${daysText} ${daysLabel} late)`;
    } else if (pmStatus.isWarning) {
      return `Next PM: ${format(pmStatus.nextPMDate, 'MMM d')} (in ${daysText} ${daysLabel})`;
    } else {
      return `Next PM: ${format(pmStatus.nextPMDate, 'MMM d, yyyy')}`;
    }
  };

  const getEquipmentIcon = (type) => {
    const iconProps = { className: "w-5 h-5" };
    switch (type) {
      case 'shuffler': return <CreditCard {...iconProps} />;
      case 'id_scanner': return <CreditCard {...iconProps} />;
      case 'sign': return <Signpost {...iconProps} />;
      case 'progressive_server': return <Server {...iconProps} />;
      case 'computer': return <Monitor {...iconProps} />;
      case 'printer': return <Printer {...iconProps} />;
      default: return <Wrench {...iconProps} />;
    }
  };

  const getEquipmentTypeLabel = (type) => {
    const labels = {
      shuffler: 'Shuffler',
      id_scanner: 'ID Scanner',
      sign: 'Sign',
      progressive_server: 'Progressive Server',
      computer: 'Computer',
      printer: 'Printer',
      floor_switch: 'Floor Switch'
    };
    return labels[type] || type;
  };

  const getEntryTypeColor = (type) => {
    switch (type) {
      case 'issue': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'preventative_maintenance': return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'note': return 'bg-slate-700 text-slate-300 border-slate-600';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'bg-red-900/50 text-red-300 border-red-700';
      case 'resolved': 
      case 'closed':
      case 'completed': return 'bg-green-900/50 text-green-300 border-green-700';
      case 'in_progress': return 'bg-yellow-900/50 text-yellow-300 border-yellow-700';
      default: return 'bg-orange-900/50 text-orange-300 border-orange-700';
    }
  };

  const getFilteredLogs = () => {
    let filtered = logs;
    
    if (selectedEquipmentFilter !== 'all') {
      filtered = filtered.filter(log => log.equipment_id === selectedEquipmentFilter);
    }
    
    if (entryTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.entry_type === entryTypeFilter);
    }
    
    return filtered;
  };

  const getEquipmentById = (id) => {
    return equipment.find(eq => eq.id === id);
  };

  const handleEquipmentClick = (equipmentId) => {
    setSelectedEquipmentFilter(equipmentId);
    setActiveTab('history');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredLogs = getFilteredLogs();

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Equipment Maintenance Hub
          </h1>
          <p className="text-slate-400">
            Track issues and preventative maintenance for critical gaming floor equipment
          </p>
        </div>

        {/* Add Equipment Button */}
        <div className="mb-6">
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add New Equipment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Add New Equipment</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Equipment Type *</Label>
                  <Select
                    value={newEquipment.equipment_type}
                    onValueChange={(value) => setNewEquipment({...newEquipment, equipment_type: value, pm_cycle: value === 'floor_switch' ? 'yearly' : newEquipment.pm_cycle})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                     <SelectItem value="shuffler">Shuffler</SelectItem>
                     <SelectItem value="id_scanner">ID Scanner</SelectItem>
                     <SelectItem value="sign">Sign</SelectItem>
                     <SelectItem value="progressive_server">Progressive Server</SelectItem>
                     <SelectItem value="computer">Computer</SelectItem>
                     <SelectItem value="printer">Printer</SelectItem>
                     <SelectItem value="floor_switch">Floor Switch</SelectItem>
                    </SelectContent>
                    </Select>
                    </div>
                    <div className="space-y-2">
                    <Label className="text-slate-300">Model/Name *</Label>
                    <Input
                    value={newEquipment.model_name}
                    onChange={(e) => setNewEquipment({...newEquipment, model_name: e.target.value})}
                    placeholder="e.g., MD1 Shuffler"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Asset ID / Serial Number</Label>
                  <Input
                    value={newEquipment.asset_id}
                    onChange={(e) => setNewEquipment({...newEquipment, asset_id: e.target.value})}
                    placeholder="e.g., SH-001"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Location *</Label>
                  <Input
                    value={newEquipment.location}
                    onChange={(e) => setNewEquipment({...newEquipment, location: e.target.value})}
                    placeholder="e.g., Table 15"
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Installation Date</Label>
                  <Input
                    type="date"
                    value={newEquipment.install_date}
                    onChange={(e) => setNewEquipment({...newEquipment, install_date: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Status</Label>
                  <Select
                    value={newEquipment.status}
                    onValueChange={(value) => setNewEquipment({...newEquipment, status: value})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-slate-300">PM Cycle *</Label>
                  <Select
                    value={newEquipment.pm_cycle}
                    onValueChange={(value) => setNewEquipment({...newEquipment, pm_cycle: value})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600 text-white">
                      <SelectItem value="bi-weekly">Bi-weekly (14 days)</SelectItem>
                      <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                      <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEquipment}
                  disabled={!newEquipment.model_name || !newEquipment.location}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                >
                  Add Equipment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Equipment Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Equipment</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Equipment Type *</Label>
                <Select
                  value={editEquipment.equipment_type}
                  onValueChange={(value) => setEditEquipment({...editEquipment, equipment_type: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="shuffler">Shuffler</SelectItem>
                    <SelectItem value="id_scanner">ID Scanner</SelectItem>
                    <SelectItem value="sign">Sign</SelectItem>
                    <SelectItem value="progressive_server">Progressive Server</SelectItem>
                    <SelectItem value="computer">Computer</SelectItem>
                    <SelectItem value="printer">Printer</SelectItem>
                    <SelectItem value="floor_switch">Floor Switch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Model/Name *</Label>
                <Input
                  value={editEquipment.model_name}
                  onChange={(e) => setEditEquipment({...editEquipment, model_name: e.target.value})}
                  placeholder="e.g., MD1 Shuffler"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Asset ID / Serial Number</Label>
                <Input
                  value={editEquipment.asset_id}
                  onChange={(e) => setEditEquipment({...editEquipment, asset_id: e.target.value})}
                  placeholder="e.g., SH-001"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Location *</Label>
                <Input
                  value={editEquipment.location}
                  onChange={(e) => setEditEquipment({...editEquipment, location: e.target.value})}
                  placeholder="e.g., Table 15"
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Installation Date</Label>
                <Input
                  type="date"
                  value={editEquipment.install_date}
                  onChange={(e) => setEditEquipment({...editEquipment, install_date: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Status</Label>
                <Select
                  value={editEquipment.status}
                  onValueChange={(value) => setEditEquipment({...editEquipment, status: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-300">PM Cycle *</Label>
                <Select
                  value={editEquipment.pm_cycle}
                  onValueChange={(value) => setEditEquipment({...editEquipment, pm_cycle: value})}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="bi-weekly">Bi-weekly (14 days)</SelectItem>
                    <SelectItem value="monthly">Monthly (30 days)</SelectItem>
                    <SelectItem value="quarterly">Quarterly (90 days)</SelectItem>
                    <SelectItem value="yearly">Yearly (365 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateEquipment}
                disabled={!editEquipment.model_name || !editEquipment.location}
                className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
              >
                Update Equipment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Tabs: Log Entry & View History */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
          <TabsList className="bg-slate-800 border border-slate-700 mb-6">
            <TabsTrigger 
              value="log" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              Log New Entry
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-slate-300"
            >
              View History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="log">
            <Card className="border border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Quick Log Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Select Equipment *</Label>
                      <Select
                        value={newLog.equipment_id}
                        onValueChange={(value) => setNewLog({...newLog, equipment_id: value})}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue placeholder="Choose equipment..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          {equipment.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.model_name} - {item.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Entry Type *</Label>
                      <Select
                        value={newLog.entry_type}
                        onValueChange={(value) => setNewLog({...newLog, entry_type: value})}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="issue">Issue Report</SelectItem>
                          <SelectItem value="preventative_maintenance">Preventative Maintenance</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Title/Summary *</Label>
                    <Input
                      value={newLog.title}
                      onChange={(e) => setNewLog({...newLog, title: e.target.value})}
                      placeholder="Brief summary..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {newLog.entry_type === 'issue' && (
                      <div className="space-y-2">
                        <Label className="text-slate-300">Status</Label>
                        <Select
                          value={newLog.status}
                          onValueChange={(value) => setNewLog({...newLog, status: value})}
                        >
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600 text-white">
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-slate-300">Technician/User</Label>
                      <Input
                        value={newLog.technician}
                        onChange={(e) => setNewLog({...newLog, technician: e.target.value})}
                        placeholder={currentUser?.full_name || "Auto-filled from login"}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                      <p className="text-xs text-slate-500">Leave blank to use your name</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Date/Time</Label>
                      <Input
                        type="datetime-local"
                        value={newLog.log_date.slice(0, 16)}
                        onChange={(e) => setNewLog({...newLog, log_date: new Date(e.target.value).toISOString()})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Description</Label>
                    <Textarea
                      value={newLog.description}
                      onChange={(e) => setNewLog({...newLog, description: e.target.value})}
                      placeholder="Detailed description of the issue or maintenance performed..."
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  
                  {newLog.entry_type === 'issue' && (
                    <div className="space-y-2">
                      <Label className="text-slate-300">Severity</Label>
                      <Select
                        value={newLog.severity}
                        onValueChange={(value) => setNewLog({...newLog, severity: value})}
                      >
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddLog}
                      disabled={!newLog.equipment_id || !newLog.title}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
                    >
                      Submit Entry
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card className="border border-slate-700 bg-slate-800">
              <CardHeader>
                <CardTitle className="text-white">Equipment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Filter by Equipment</Label>
                      <Select value={selectedEquipmentFilter} onValueChange={setSelectedEquipmentFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Equipment</SelectItem>
                          {equipment.map(item => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.model_name} - {item.location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Filter by Type</Label>
                      <Select value={entryTypeFilter} onValueChange={setEntryTypeFilter}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-700 border-slate-600 text-white">
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="issue">Issues</SelectItem>
                          <SelectItem value="preventative_maintenance">Preventative Maintenance</SelectItem>
                          <SelectItem value="note">Notes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {filteredLogs.length > 0 ? (
                    <div className="space-y-3 mt-6">
                      {filteredLogs.map((log) => {
                        const equipmentItem = getEquipmentById(log.equipment_id);
                        return (
                          <Card key={log.id} className="border border-slate-600 bg-slate-700/50">
                            <CardContent className="p-4">
                              <div className="flex flex-col md:flex-row justify-between items-start gap-3 mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold text-white">{log.title}</h3>
                                    <Badge className={`${getEntryTypeColor(log.entry_type)} border`}>
                                      {log.entry_type === 'issue' ? 'Issue' : log.entry_type === 'preventative_maintenance' ? 'PM' : 'Note'}
                                    </Badge>
                                  </div>
                                  {equipmentItem && (
                                    <p className="text-sm text-slate-400 mb-1">
                                      Equipment: {equipmentItem.model_name} ({equipmentItem.location})
                                    </p>
                                  )}
                                  {log.description && (
                                    <p className="text-sm text-slate-300 mb-2">{log.description}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge className={`${getStatusColor(log.severity === 'critical' ? 'critical' : log.status)} border`}>
                                    {log.severity === 'critical' ? 'CRITICAL' : log.status}
                                  </Badge>
                                  <span className="text-xs text-slate-400">
                                    {format(new Date(log.log_date), 'MMM d, yyyy h:mm a')}
                                  </span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                                <span>Technician: {log.technician}</span>
                                {log.severity && <span>Severity: {log.severity}</span>}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                      <p>No log entries found. Start by logging your first entry.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Equipment List - COMPACT DESIGN WITH PM STATUS */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Managed Equipment</h2>
          {equipment.length > 0 ? (
            <div className="space-y-2">
              {equipment.map((item) => {
                const pmStatus = calculatePMStatus(item);
                const statusColorClass = getPMStatusColor(pmStatus.status);
                
                return (
                  <div
                    key={item.id}
                    className={`group rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.01] min-h-[64px] ${statusColorClass}`}
                    onClick={() => handleEquipmentClick(item.id)}
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden p-4">
                      {getPMStatusBadge(pmStatus) && (
                        <div className="mb-2">
                          {getPMStatusBadge(pmStatus)}
                        </div>
                      )}
                      <div className="flex items-start gap-3 mb-2">
                        <div className="text-slate-400 group-hover:text-blue-400 transition-colors mt-0.5">
                          {getEquipmentIcon(item.equipment_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                              {item.model_name}
                            </h3>
                            <ChevronRight className="w-4 h-4 flex-shrink-0 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="text-sm text-slate-400 space-y-0.5">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatPMDueDate(pmStatus)}
                            </div>
                            <div>{getEquipmentTypeLabel(item.equipment_type)} • {item.location}</div>
                            {item.asset_id && <div>Asset: {item.asset_id}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {logs.filter(log => log.equipment_id === item.id).length} entries
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-green-400 hover:text-green-300 hover:bg-green-900/30"
                            onClick={(e) => handleQuickPM(item, e)}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Complete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                            onClick={(e) => handleEditClick(item, e)}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Equipment</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Are you sure you want to delete <span className="font-semibold text-white">{item.model_name}</span>?
                                  This will also delete all associated log entries. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEquipment(item.id)}
                                  className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center gap-4 p-4">
                      <div className="text-slate-400 group-hover:text-blue-400 transition-colors flex-shrink-0">
                        {getEquipmentIcon(item.equipment_type)}
                      </div>
                      <div className="flex-1 min-w-0 grid grid-cols-6 gap-4 items-center">
                        <div className="truncate">
                          <div className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                            {item.model_name}
                          </div>
                          <div className="text-xs text-slate-500">{getEquipmentTypeLabel(item.equipment_type)}</div>
                        </div>
                        <div className="text-sm text-slate-300 truncate">
                          {item.location}
                        </div>
                        <div className="text-sm text-slate-400 truncate">
                          {item.asset_id || 'N/A'}
                        </div>
                        <div className="col-span-2">
                          <div className="flex flex-col gap-1">
                            {getPMStatusBadge(pmStatus)}
                            <div className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatPMDueDate(pmStatus)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end items-center">
                          <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                            {logs.filter(log => log.equipment_id === item.id).length} entries
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-green-400 hover:text-green-300 hover:bg-green-900/30"
                            onClick={(e) => handleQuickPM(item, e)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30"
                            onClick={(e) => handleEditClick(item, e)}
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Delete Equipment</AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  Are you sure you want to delete <span className="font-semibold text-white">{item.model_name}</span>?
                                  This will also delete all associated log entries. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEquipment(item.id)}
                                  className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="border border-slate-700 bg-slate-800 p-8">
              <div className="text-center text-slate-400">
                <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p>No equipment added yet. Click "Add New Equipment" to get started.</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}