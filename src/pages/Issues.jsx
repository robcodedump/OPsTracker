const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useEffect, useRef } from "react";
import { SlotMachine, Issue } from "@/entities/all";
import { User } from "@/entities/User";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Clock, Search, Filter, MessageSquare, Trash2, Pencil, Camera, Wrench, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AddIssueDialog from "../components/issues/AddIssueDialog";
import AddNoteDialog from "../components/issues/AddNoteDialog";
import EditIssueDialog from "../components/issues/EditIssueDialog";
import ResolveIssueDialog from "../components/issues/ResolveIssueDialog";
import SyncIndicator from "../components/dashboard/SyncIndicator";
import ReportBankDialog from "../components/issues/ReportBankDialog";
import ImageLightbox from "../components/issues/ImageLightbox";
import ReportEquipmentDialog from "../components/issues/ReportEquipmentDialog";
import AssignIssueDialog from "../components/issues/AssignIssueDialog";
import RelatedIssuesSection from "../components/issues/RelatedIssuesSection";
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

export default function Issues() {
  const [machines, setMachines] = useState([]);
  const [issues, setIssues] = useState([]);
  const [equipmentLogs, setEquipmentLogs] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [filteredEquipmentLogs, setFilteredEquipmentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('unresolved');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [resolvingIssue, setResolvingIssue] = useState(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [assigningItem, setAssigningItem] = useState(null); // { id, type: 'issue'|'equipment' }
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allIssuesGlobal, setAllIssuesGlobal] = useState([]);
  const [allMachinesGlobal, setAllMachinesGlobal] = useState([]);
  const [highlightedIssueId, setHighlightedIssueId] = useState(null);
  const issueRefs = React.useRef({});

  // Effect to set anonymous status once on component mount
  useEffect(() => {
    const anonCasino = localStorage.getItem('anonymous_casino') || sessionStorage.getItem('anonymous_casino');
    setIsAnonymous(!!anonCasino);
    // Load current user for role check
    db.auth.me().then(u => setCurrentUser(u)).catch(() => {});
    // Load all users for assignee name display
    db.entities.User.list().then(users => setAllUsers(users)).catch(() => {});
  }, []);

  // Effect to load data initially and set up interval for refreshing data
  useEffect(() => {
    // Check if casino is selected before loading data
    const casinoData = localStorage.getItem('selected_casino') ||
                      localStorage.getItem('anonymous_casino') ||
                      sessionStorage.getItem('selected_casino') ||
                      sessionStorage.getItem('anonymous_casino');

    if (!casinoData) {
      setLoading(false);
      return;
    }

    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Effect to apply filters whenever issues, search term, or filter criteria change
  useEffect(() => {
    filterIssues();
  }, [issues, equipmentLogs, searchTerm, statusFilter, resolvedFilter]);

  // Read 'machine' query param to set search term
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const machineParam = params.get('machine');
    if (machineParam) {
      setSearchTerm(machineParam);
    }
    const highlightParam = params.get('highlight');
    if (highlightParam) {
      setHighlightedIssueId(highlightParam);
      // Clear filters so the highlighted issue is visible
      setResolvedFilter('all');
    }
  }, []);

  // Scroll to and flash highlighted issue once data is loaded
  useEffect(() => {
    if (highlightedIssueId && !loading) {
      const el = issueRefs.current[highlightedIssueId];
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        // Remove highlight after animation
        setTimeout(() => setHighlightedIssueId(null), 3000);
      }
    }
  }, [highlightedIssueId, loading, filteredIssues]);

  const loadData = async () => {
    try {
      // Use localStorage for persistent casino selection
      const casinoData = localStorage.getItem('selected_casino') ||
                        localStorage.getItem('anonymous_casino') ||
                        sessionStorage.getItem('selected_casino') ||
                        sessionStorage.getItem('anonymous_casino');

      if (!casinoData) {
        setLoading(false);
        return;
      }

      const casino = JSON.parse(casinoData);

      if (!casino || !casino.id) {
        console.error('Invalid casino data: casino object or casino ID is missing.');
        setLoading(false);
        return;
      }

      const [machinesData, issuesData, equipmentLogsData, allMachines, allIssues] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        Issue.filter({ casino_id: casino.id }, '-reported_date'),
        db.entities.EquipmentLog.filter({ casino_id: casino.id, entry_type: 'issue' }, '-log_date'),
        SlotMachine.list(),
        Issue.list('-reported_date')
      ]);
      setMachines(machinesData);
      setIssues(issuesData);
      setEquipmentLogs(equipmentLogsData);
      setAllMachinesGlobal(allMachines);
      setAllIssuesGlobal(allIssues);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIssues = () => {
    let filtered = issues;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(issue => {
        const noteAuthorsMatch = (issue.notes || []).some(n => n.author?.toLowerCase().includes(q) || n.text?.toLowerCase().includes(q));
        return (
          issue.machine_id.toLowerCase().includes(q) ||
          issue.issue_description.toLowerCase().includes(q) ||
          `${issue.area}-${issue.section}-${issue.location}`.toLowerCase().includes(q) ||
          issue.created_by?.toLowerCase().includes(q) ||
          issue.assigned_technician_email?.toLowerCase().includes(q) ||
          noteAuthorsMatch
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.service_status === statusFilter);
    }

    if (resolvedFilter !== 'all') {
      const isResolved = resolvedFilter === 'resolved';
      filtered = filtered.filter(issue => issue.resolved === isResolved);
    }

    setFilteredIssues(filtered);

    // Filter equipment logs — hide when statusFilter is active (not applicable to equipment)
    let filteredEq = statusFilter !== 'all' ? [] : equipmentLogs;

    if (searchTerm) {
      filteredEq = filteredEq.filter(log =>
        log.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (resolvedFilter === 'resolved') {
      filteredEq = filteredEq.filter(log => ['resolved', 'closed', 'completed'].includes(log.status));
    } else if (resolvedFilter === 'unresolved') {
      filteredEq = filteredEq.filter(log => ['open', 'in_progress'].includes(log.status));
    }

    setFilteredEquipmentLogs(filteredEq);
  };

  const handleIssueAdded = async (issueData) => {
    try {
      await Issue.create(issueData);
      loadData();
    } catch (error) {
      console.error('Error adding issue:', error);
    }
  };

  const handleIssueUpdated = async (issueId, updatedData) => {
    try {
      await Issue.update(issueId, updatedData);
      loadData();
    } catch (error) {
      console.error('Error updating issue:', error);
    }
  };

  const handleEditClick = (issue) => {
    setEditingIssue(issue);
    setShowEditDialog(true);
  };

  const handleAddNote = async (issueId, noteText, imageUrls = []) => {
    try {
      const user = await User.me();
      const issue = issues.find(i => i.id === issueId);
      const existingNotes = Array.isArray(issue.notes) ? issue.notes : [];
      const updatedNotes = [
        ...existingNotes,
        {
          text: noteText,
          timestamp: new Date().toISOString(),
          author: user?.email || 'Unknown',
          image_urls: imageUrls
        }
      ];
      await Issue.update(issueId, { notes: updatedNotes });
      loadData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const handleImageClick = (images, index) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setShowLightbox(true);
  };

  const getTotalImageCount = (issue) => {
    const issueImages = issue.image_urls || [];
    const noteImages = (issue.notes || []).reduce((acc, note) => {
      return acc + (note.image_urls || []).length;
    }, 0);
    return issueImages.length + noteImages;
  };

  // New function to handle clicking the "Mark Resolved" button, opening the dialog
  const handleResolveClick = (issue) => {
    setResolvingIssue(issue);
    setShowResolveDialog(true);
  };

  const handleResolveIssue = async (issueId, resolutionNote) => {
    if (isAnonymous) return;

    try {
      const issueToResolve = issues.find(i => i.id === issueId);
      const user = await User.me(); // Fetch current user for resolution note attribution

      // Prepare updated notes array with resolution note
      const existingNotes = Array.isArray(issueToResolve.notes) ? issueToResolve.notes : [];
      const updatedNotes = [...existingNotes];

      // Add resolution note if provided
      if (resolutionNote && resolutionNote.trim()) {
        updatedNotes.push({
          text: `Resolution: ${resolutionNote.trim()}`,
          timestamp: new Date().toISOString(),
          author: user?.email || 'Unknown' // Use optional chaining for user.email
        });
      }

      await Issue.update(issueId, {
        resolved: true,
        resolved_date: new Date().toISOString(),
        notes: updatedNotes // Include the updated notes array
      });

      // Automation: Update machine status to active when issue is resolved
      if (issueToResolve && issueToResolve.machine_id) {
        try {
          const machine = machines.find(m => m.machine_id === issueToResolve.machine_id);
          if (machine) {
            // Check if there are any other unresolved out_of_service issues for this machine
            const otherOpenIssues = issues.filter(i =>
              i.machine_id === issueToResolve.machine_id &&
              i.id !== issueId && // Exclude the current issue being resolved
              !i.resolved &&
              i.service_status === 'out_of_service'
            );

            // Only set to active if no other out_of_service issues exist
            if (otherOpenIssues.length === 0) {
              await SlotMachine.update(machine.id, { status: 'active' });
            }
          }
        } catch (error) {
          console.error('Error updating machine status:', error);
        }
      }

      loadData();
    } catch (error) {
      console.error('Error resolving issue:', error);
    }
  };

  const handleResolveEquipmentLog = async (logId) => {
    await db.entities.EquipmentLog.update(logId, { status: 'resolved' });
    loadData();
  };

  const canAssign = currentUser && (currentUser.role === 'admin' || currentUser.role === 'technician');

  const handleAssignClick = (id, type) => {
    setAssigningItem({ id, type });
    setShowAssignDialog(true);
  };

  const handleAssign = async (email) => {
    if (!assigningItem) return;
    const value = email === 'unassigned' ? null : email;
    if (assigningItem.type === 'issue') {
      await Issue.update(assigningItem.id, { assigned_technician_email: value });
    } else {
      await db.entities.EquipmentLog.update(assigningItem.id, { assigned_technician_email: value });
    }
    loadData();
  };

  const getAssigneeName = (email) => {
    if (!email) return null;
    const u = allUsers.find(u => u.email === email);
    return u ? `${u.full_name} (${u.email})` : email;
  };

  const handleDeleteIssue = async (issueId) => {
    if (isAnonymous) return;

    try {
      await Issue.delete(issueId);
      loadData();
    } catch (error) {
      console.error('Error deleting issue:', error);
    }
  };

  const getStatusColor = (status) => {
    return status === 'in_service'
      ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700'
      : 'bg-red-900/50 text-red-300 border-red-700';
  };

  const getStatusIcon = (status) => {
    return status === 'in_service'
      ? <AlertTriangle className="w-4 h-4" />
      : <XCircle className="w-4 h-4" />;
  };

  const getOutstandingIssuesCount = () => {
    const slotCount = issues.filter(issue => !issue.resolved).length;
    const equipCount = equipmentLogs.filter(log => ['open', 'in_progress'].includes(log.status)).length;
    return slotCount + equipCount;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const outstandingCount = getOutstandingIssuesCount();

  return (
    <div className="min-h-screen p-6 bg-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">
                Issue Tracking ({outstandingCount})
              </h1>
              <SyncIndicator />
            </div>
            <p className="mt-2 text-slate-400">
              Monitor and manage slot machine issues
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <AddIssueDialog machines={machines} onIssueAdded={handleIssueAdded} />
            <ReportEquipmentDialog onSubmitted={loadData} />
            {!isAnonymous && (
              <ReportBankDialog machines={machines} onIssuesAdded={handleIssueAdded} />
            )}
          </div>
        </div>

        <Card className="mb-6 border border-slate-700 shadow-md bg-slate-800">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-white">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search issues, machines, people..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Service Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_service">In Service</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Resolution</Label>
                <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600 text-white">
                    <SelectItem value="all">All Issues</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* New ResolveIssueDialog component */}
        <ResolveIssueDialog
          issue={resolvingIssue}
          open={showResolveDialog}
          onOpenChange={setShowResolveDialog}
          onResolve={handleResolveIssue}
        />

        <EditIssueDialog
          issue={editingIssue}
          machines={machines}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onIssueUpdated={handleIssueUpdated}
        />

        <AssignIssueDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onAssign={handleAssign}
          currentAssignee={assigningItem ? (
            assigningItem.type === 'issue'
              ? issues.find(i => i.id === assigningItem.id)?.assigned_technician_email
              : equipmentLogs.find(l => l.id === assigningItem.id)?.assigned_technician_email
          ) : ''}
        />

        {(filteredIssues.length > 0 || filteredEquipmentLogs.length > 0) ? (
          <div className="space-y-4">
            {/* Equipment Log Issues */}
            {filteredEquipmentLogs.map((log) => (
              <Card key={`eq-${log.id}`} className="border border-orange-800/50 bg-slate-800 hover:border-orange-700/70 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <h3 className="font-bold text-xl text-orange-400">{log.title}</h3>
                        <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 border flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Equipment
                        </Badge>
                        {['resolved', 'closed', 'completed'].includes(log.status) ? (
                          <Badge className="bg-green-900/50 text-green-300 border-green-700 border flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 border">Open</Badge>
                        )}
                        {log.image_urls && log.image_urls.length > 0 && (
                          <Badge
                            className="bg-blue-900/50 text-blue-300 border-blue-700 border cursor-pointer hover:bg-blue-800/50 flex items-center gap-1"
                            onClick={() => handleImageClick(log.image_urls, 0)}
                          >
                            <Camera className="w-3 h-3" />
                            {log.image_urls.length}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                        <span className="text-slate-400">Reported by: {log.technician}</span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(log.log_date), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {log.assigned_technician_email && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <UserCheck className="w-4 h-4" />
                            Assigned: {getAssigneeName(log.assigned_technician_email)}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 mb-3">{log.description}</p>
                      {log.image_urls && log.image_urls.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">Images</h4>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {log.image_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Image ${idx + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-orange-500 transition-colors"
                                onClick={() => handleImageClick(log.image_urls, idx)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3 md:mt-0 md:ml-4 flex-shrink-0 flex-wrap">
                       {canAssign && (
                         <Button
                           onClick={() => handleAssignClick(log.id, 'equipment')}
                           variant="outline"
                           className="border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 min-h-[44px]"
                         >
                           <UserCheck className="w-4 h-4 mr-2" />
                           {log.assigned_technician_email ? 'Reassign' : 'Assign'}
                         </Button>
                       )}
                       {!['resolved', 'closed', 'completed'].includes(log.status) && !isAnonymous && (
                         <Button
                           onClick={() => handleResolveEquipmentLog(log.id)}
                           className="bg-gradient-to-r from-green-600 to-green-500 text-white min-h-[44px]"
                         >
                           <CheckCircle className="w-4 h-4 mr-2" />
                           Mark Resolved
                         </Button>
                       )}
                     </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Slot Machine Issues */}
            {filteredIssues.map((issue) => (
              <Card
                key={issue.id}
                ref={el => issueRefs.current[issue.id] = el}
                className={`border bg-slate-800 hover:border-slate-600 transition-all duration-300 ${
                  highlightedIssueId === issue.id
                    ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)] animate-pulse'
                    : 'border-slate-700'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Link
                          to={createPageUrl(`MachineDetail?id=${issue.machine_id}`)}
                          className="hover:opacity-80 transition-opacity"
                        >
                          <h3 className="font-bold text-xl text-blue-400 hover:text-blue-300 cursor-pointer">
                            {issue.area}-{issue.section}-{issue.location}
                          </h3>
                        </Link>
                        <Badge className={`${getStatusColor(issue.service_status)} border flex items-center gap-1`}>
                          {getStatusIcon(issue.service_status)}
                          {issue.service_status === 'in_service' ? 'In Service' : 'Out of Service'}
                        </Badge>
                        {issue.resolved ? (
                          <Badge className="bg-green-900/50 text-green-300 border-green-700 border flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-900/50 text-orange-300 border-orange-700 border">
                            Open
                          </Badge>
                        )}
                        {getTotalImageCount(issue) > 0 && (
                          <Badge 
                            className="bg-blue-900/50 text-blue-300 border-blue-700 border cursor-pointer hover:bg-blue-800/50 flex items-center gap-1"
                            onClick={() => handleImageClick(issue.image_urls || [], 0)}
                          >
                            <Camera className="w-3 h-3" />
                            {getTotalImageCount(issue)}
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
                        <span className="text-slate-400">{issue.machine_id}</span>
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>{format(new Date(issue.reported_date), 'MMM d, yyyy h:mm a')}</span>
                        </div>
                        {issue.assigned_technician_email && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <UserCheck className="w-4 h-4" />
                            Assigned: {getAssigneeName(issue.assigned_technician_email)}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-300 mb-3">
                        {issue.issue_description}
                      </p>

                      {issue.resolved && issue.resolved_date && (
                        <p className="text-green-400 text-sm mb-3">
                          Resolved on {format(new Date(issue.resolved_date), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}

                      {issue.image_urls && issue.image_urls.length > 0 && (
                        <div className="mt-3">
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">Issue Images</h4>
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {issue.image_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`Issue image ${idx + 1}`}
                                className="w-full h-24 object-cover rounded-lg border border-slate-600 cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => handleImageClick(issue.image_urls, idx)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      {canAssign && (
                        <Button
                          onClick={() => handleAssignClick(issue.id, 'issue')}
                          variant="outline"
                          className="border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 min-h-[44px]"
                        >
                          <UserCheck className="w-4 h-4 mr-2" />
                          {issue.assigned_technician_email ? 'Reassign' : 'Assign'}
                        </Button>
                      )}
                      <AddNoteDialog onNoteAdded={(noteText) => handleAddNote(issue.id, noteText)} />
                      {!isAnonymous && (
                        <Button
                          onClick={() => handleEditClick(issue)}
                          variant="outline"
                          className="border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      )}
                      {!isAnonymous && !issue.resolved && (
                        <Button
                          onClick={() => handleResolveClick(issue)} // Call new handleResolveClick
                          className="bg-gradient-to-r from-green-600 to-green-500 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Resolved
                        </Button>
                      )}
                      {!isAnonymous && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="border-red-700 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete Issue</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Are you sure you want to delete this issue for machine <span className="font-semibold text-white">{issue.machine_id}</span>?
                                This action cannot be undone and will remove all associated notes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteIssue(issue.id)}
                                className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
                              >
                                Delete Issue
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4 mt-2">
                    {/* Notes - left/full on mobile */}
                    {issue.notes && Array.isArray(issue.notes) && issue.notes.length > 0 && (
                      <div className="flex-1 border-t border-slate-700 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <MessageSquare className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-300">
                            Notes ({issue.notes.length})
                          </span>
                        </div>
                        <div className="space-y-3">
                          {issue.notes.map((note, index) => (
                            <div key={index} className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-medium text-blue-400">{note.author}</span>
                                <span className="text-xs text-slate-400">
                                  {format(new Date(note.timestamp), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm text-slate-300">{note.text}</p>
                              {note.image_urls && note.image_urls.length > 0 && (
                                <div className="grid grid-cols-3 gap-2 mt-2">
                                  {note.image_urls.map((url, idx) => (
                                    <img
                                      key={idx}
                                      src={url}
                                      alt={`Note image ${idx + 1}`}
                                      className="w-full h-20 object-cover rounded border border-slate-600 cursor-pointer hover:border-blue-500 transition-colors"
                                      onClick={() => handleImageClick(note.image_urls, idx)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Related Issues - right column on desktop, below on mobile */}
                    {!isAnonymous && (
                      <div className="md:w-64 lg:w-72 flex-shrink-0 border-t border-slate-700 pt-4">
                        <RelatedIssuesSection
                          currentIssue={issue}
                          allIssues={allIssuesGlobal}
                          allMachines={allMachinesGlobal}
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h3 className="text-xl font-semibold mb-2 text-white">
              {issues.length === 0 && equipmentLogs.length === 0 ? 'No issues reported' : 'No issues match your filters'}
            </h3>
            <p className="text-slate-400">
              {issues.length === 0 && equipmentLogs.length === 0
                ? 'All machines and equipment are running smoothly!'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
          )}
          </div>

          {showLightbox && (
          <ImageLightbox
          images={lightboxImages}
          currentIndex={lightboxIndex}
          onClose={() => setShowLightbox(false)}
          onNavigate={setLightboxIndex}
          />
          )}
          </div>
          );
          }