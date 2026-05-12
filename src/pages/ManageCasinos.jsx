import React, { useState, useEffect } from "react";
import { Casino, SlotMachine, MaintenanceRecord, Issue } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Plus, Trash2, Download, Upload, Database } from "lucide-react";
import ManageTechniciansPanel from "../components/casinos/ManageTechniciansPanel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ManageCasinos() {
  const [casinos, setCasinos] = useState([]);
  const [newCasinoName, setNewCasinoName] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [casinoToDelete, setCasinoToDelete] = useState(null);
  const [showFirstConfirm, setShowFirstConfirm] = useState(false);
  const [showSecondConfirm, setShowSecondConfirm] = useState(false);
  const [uploadingCasino, setUploadingCasino] = useState(null);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [uploadedData, setUploadedData] = useState(null);
  const [showFullRestoreConfirm, setShowFullRestoreConfirm] = useState(false);
  const [fullBackupData, setFullBackupData] = useState(null);

  useEffect(() => {
    loadCasinos();
  }, []);

  const loadCasinos = async () => {
    try {
      const casinosData = await Casino.list();
      setCasinos(casinosData);
    } catch (error) {
      console.error('Error loading casinos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCasino = async () => {
    if (!newCasinoName.trim()) return;

    try {
      await Casino.create({ name: newCasinoName });
      setNewCasinoName('');
      loadCasinos();
    } catch (error) {
      console.error('Error adding casino:', error);
    }
  };

  const handleDownloadFullBackup = async () => {
    try {
      // Fetch all data
      const [casinos, machines, maintenance, issues] = await Promise.all([
        Casino.list(),
        SlotMachine.list(),
        MaintenanceRecord.list(),
        Issue.list()
      ]);

      // Generate comprehensive CSV
      const csvContent = generateFullBackupCSV({
        casinos,
        machines,
        maintenance,
        issues
      });

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = `full-backup-${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Update last backup date
      localStorage.setItem('last_backup_date', new Date().toISOString());
    } catch (error) {
      console.error('Error creating full backup:', error);
      alert('Error creating backup. Please try again.');
    }
  };

  const generateFullBackupCSV = (data) => {
    let csv = '';
    
    // Helper to escape CSV values
    const escapeCsv = (value) => {
      if (value === null || value === undefined) return '';
      let stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Backup Metadata
    csv += 'FULL SYSTEM BACKUP\n';
    csv += 'Export Date,Total Casinos,Total Machines,Total Maintenance Records,Total Issues\n';
    csv += `${escapeCsv(new Date().toISOString())},${escapeCsv(data.casinos.length)},${escapeCsv(data.machines.length)},${escapeCsv(data.maintenance.length)},${escapeCsv(data.issues.length)}\n\n`;
    
    // Casinos Section
    csv += 'CASINOS\n';
    csv += 'Casino ID,Name,Created Date\n';
    data.casinos.forEach(c => {
      csv += `${escapeCsv(c.id)},${escapeCsv(c.name)},${escapeCsv(c.created_date)}\n`;
    });
    csv += '\n';
    
    // Machines Section
    csv += 'MACHINES\n';
    csv += 'Casino ID,Machine ID,Area,Section,Location,Manufacturer,Model,Serial Number,Install Date,Status\n';
    data.machines.forEach(m => {
      csv += `${escapeCsv(m.casino_id)},${escapeCsv(m.machine_id)},${escapeCsv(m.area)},${escapeCsv(m.section)},${escapeCsv(m.location)},${escapeCsv(m.manufacturer)},${escapeCsv(m.model)},${escapeCsv(m.serial_number || '')},${escapeCsv(m.install_date || '')},${escapeCsv(m.status)}\n`;
    });
    csv += '\n';
    
    // Maintenance Section
    csv += 'MAINTENANCE RECORDS\n';
    csv += 'Casino ID,Machine ID,Year,Trimester,Date,Technician,Notes,Completed\n';
    data.maintenance.forEach(m => {
      csv += `${escapeCsv(m.casino_id)},${escapeCsv(m.machine_id)},${escapeCsv(m.year)},${escapeCsv(m.trimester)},${escapeCsv(m.maintenance_date)},${escapeCsv(m.technician)},${escapeCsv(m.notes)},${escapeCsv(m.completed)}\n`;
    });
    csv += '\n';
    
    // Issues Section
    csv += 'ISSUES\n';
    csv += 'Casino ID,Machine ID,Area,Section,Location,Description,Service Status,Reported Date,Resolved,Resolved Date\n';
    data.issues.forEach(i => {
      csv += `${escapeCsv(i.casino_id)},${escapeCsv(i.machine_id)},${escapeCsv(i.area)},${escapeCsv(i.section)},${escapeCsv(i.location)},${escapeCsv(i.issue_description)},${escapeCsv(i.service_status)},${escapeCsv(i.reported_date)},${escapeCsv(i.resolved)},${escapeCsv(i.resolved_date || '')}\n`;
    });
    
    return csv;
  };

  const handleFullBackupUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parsed = parseFullBackupCSV(text);
        
        setFullBackupData(parsed);
        setShowFullRestoreConfirm(true);
      } catch (error) {
        console.error('Error parsing full backup CSV:', error);
        alert('Error reading backup file. Please ensure it is a valid full backup CSV.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const parseFullBackupCSV = (text) => {
    const lines = text.split('\n');
    const data = { casinos: [], machines: [], maintenance: [], issues: [] };
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'CASINOS') {
        currentSection = 'casinos';
        i++; // Skip header line
        continue;
      } else if (line === 'MACHINES') {
        currentSection = 'machines';
        i++; // Skip header line
        continue;
      } else if (line === 'MAINTENANCE RECORDS') {
        currentSection = 'maintenance';
        i++; // Skip header line
        continue;
      } else if (line === 'ISSUES') {
        currentSection = 'issues';
        i++; // Skip header line
        continue;
      } else if (line === '' || line.startsWith('FULL SYSTEM')) {
        currentSection = null;
        continue;
      }
      
      if (currentSection && line) {
        const values = parseCSVLine(line);
        
        if (currentSection === 'casinos' && values.length >= 2) {
          // Skip casino ID, just use name
          data.casinos.push({
            name: values[1]
          });
        } else if (currentSection === 'machines' && values.length >= 9) {
          // Skip casino_id for now, will map after casinos are created
          data.machines.push({
            casino_name: values[0], // Store casino ID temporarily
            machine_id: values[1],
            area: values[2],
            section: values[3],
            location: values[4],
            manufacturer: values[5],
            model: values[6],
            serial_number: values[7],
            install_date: values[8],
            status: values[9] || 'active'
          });
        } else if (currentSection === 'maintenance' && values.length >= 7) {
          data.maintenance.push({
            casino_id_ref: values[0],
            machine_id: values[1],
            year: parseInt(values[2]),
            trimester: values[3],
            maintenance_date: values[4],
            technician: values[5],
            notes: values[6],
            completed: values[7] === 'true'
          });
        } else if (currentSection === 'issues' && values.length >= 9) {
          data.issues.push({
            casino_id_ref: values[0],
            machine_id: values[1],
            area: values[2],
            section: values[3],
            location: values[4],
            issue_description: values[5],
            service_status: values[6],
            reported_date: values[7],
            resolved: values[8] === 'true',
            resolved_date: values[9] || null
          });
        }
      }
    }
    
    return data;
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current);
    
    return values;
  };

  const handleRestoreFullBackup = async () => {
    if (!fullBackupData) return;

    try {
      // Create a mapping of old casino IDs to new casino IDs
      const casinoIdMap = {};
      
      // First, create all casinos
      for (const casino of fullBackupData.casinos) {
        const existingCasino = casinos.find(c => c.name === casino.name);
        if (existingCasino) {
          // Casino already exists, use its ID
          casinoIdMap[casino.name] = existingCasino.id;
        } else {
          // Create new casino
          const newCasino = await Casino.create({ name: casino.name });
          casinoIdMap[casino.name] = newCasino.id;
        }
      }

      // Create machines with mapped casino IDs
      for (const machine of fullBackupData.machines) {
        const casinoId = casinoIdMap[machine.casino_name] || casinos[0]?.id;
        if (casinoId) {
          await SlotMachine.create({
            ...machine,
            casino_id: casinoId,
            casino_name: undefined // Remove temporary field
          });
        }
      }

      // Create maintenance records
      for (const record of fullBackupData.maintenance) {
        const casinoId = Object.values(casinoIdMap)[0] || casinos[0]?.id;
        if (casinoId) {
          await MaintenanceRecord.create({
            ...record,
            casino_id: casinoId,
            casino_id_ref: undefined
          });
        }
      }

      // Create issues
      for (const issue of fullBackupData.issues) {
        const casinoId = Object.values(casinoIdMap)[0] || casinos[0]?.id;
        if (casinoId) {
          await Issue.create({
            ...issue,
            casino_id: casinoId,
            casino_id_ref: undefined,
            notes: []
          });
        }
      }

      alert(`Successfully restored:\n- ${fullBackupData.casinos.length} casinos\n- ${fullBackupData.machines.length} machines\n- ${fullBackupData.maintenance.length} maintenance records\n- ${fullBackupData.issues.length} issues`);
      
      setShowFullRestoreConfirm(false);
      setFullBackupData(null);
      loadCasinos();
    } catch (error) {
      console.error('Error restoring full backup:', error);
      alert('Error restoring backup. Some data may have been imported. Please check and try again if needed.');
    }
  };

  const handleDownloadBackup = async (casino) => {
    try {
      const [machines, maintenance, issues] = await Promise.all([
        SlotMachine.filter({ casino_id: casino.id }),
        MaintenanceRecord.filter({ casino_id: casino.id }),
        Issue.filter({ casino_id: casino.id })
      ]);

      // Create comprehensive backup data
      const backupData = {
        casino: casino,
        machines: machines,
        maintenance: maintenance,
        issues: issues,
        exportDate: new Date().toISOString()
      };

      // Convert to CSV format
      const csvContent = generateCSV(backupData);
      
      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${casino.name.replace(/\s+/g, '-')}-backup-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading backup:', error);
      alert('Error creating backup. Please try again.');
    }
  };

  const generateCSV = (data) => {
    let csv = '';
    
    // Casino Info Section
    csv += 'CASINO INFORMATION\n';
    csv += 'Name,ID,Export Date\n';
    csv += `"${data.casino.name}","${data.casino.id}","${data.exportDate}"\n\n`;
    
    // Machines Section
    csv += 'MACHINES\n';
    csv += 'Machine ID,Area,Section,Location,Manufacturer,Model,Serial Number,Install Date,Status\n';
    data.machines.forEach(m => {
      csv += `"${m.machine_id}","${m.area}","${m.section}","${m.location}","${m.manufacturer}","${m.model}","${m.serial_number || ''}","${m.install_date || ''}","${m.status}"\n`;
    });
    csv += '\n';
    
    // Maintenance Section
    csv += 'MAINTENANCE RECORDS\n';
    csv += 'Machine ID,Year,Trimester,Date,Technician,Notes,Completed\n';
    data.maintenance.forEach(m => {
      const notes = (m.notes || '').replace(/"/g, '""');
      csv += `"${m.machine_id}","${m.year}","${m.trimester}","${m.maintenance_date}","${m.technician}","${notes}","${m.completed}"\n`;
    });
    csv += '\n';
    
    // Issues Section
    csv += 'ISSUES\n';
    csv += 'Machine ID,Area,Section,Location,Description,Service Status,Reported Date,Resolved,Resolved Date\n';
    data.issues.forEach(i => {
      const desc = (i.issue_description || '').replace(/"/g, '""');
      csv += `"${i.machine_id}","${i.area}","${i.section}","${i.location}","${desc}","${i.service_status}","${i.reported_date}","${i.resolved}","${i.resolved_date || ''}"\n`;
    });
    
    return csv;
  };

  const handleFileUpload = async (event, casino) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parsed = parseCSV(text);
        
        setUploadedData(parsed);
        setUploadingCasino(casino);
        setShowUploadConfirm(true);
      } catch (error) {
        console.error('Error parsing CSV:', error);
        alert('Error reading backup file. Please ensure it is a valid backup CSV.');
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const parseCSV = (text) => {
    const lines = text.split('\n');
    const data = { machines: [], maintenance: [], issues: [] };
    let currentSection = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === 'MACHINES') {
        currentSection = 'machines';
        i++; // Skip header line
        continue;
      } else if (line === 'MAINTENANCE RECORDS') {
        currentSection = 'maintenance';
        i++; // Skip header line
        continue;
      } else if (line === 'ISSUES') {
        currentSection = 'issues';
        i++; // Skip header line
        continue;
      } else if (line === '' || line.startsWith('CASINO')) {
        currentSection = null;
        continue;
      }
      
      if (currentSection && line) {
        const values = parseCSVLine(line);
        
        if (currentSection === 'machines' && values.length >= 8) {
          data.machines.push({
            machine_id: values[0],
            area: values[1],
            section: values[2],
            location: values[3],
            manufacturer: values[4],
            model: values[5],
            serial_number: values[6],
            install_date: values[7],
            status: values[8] || 'active'
          });
        } else if (currentSection === 'maintenance' && values.length >= 6) {
          data.maintenance.push({
            machine_id: values[0],
            year: parseInt(values[1]),
            trimester: values[2],
            maintenance_date: values[3],
            technician: values[4],
            notes: values[5],
            completed: values[6] === 'true'
          });
        } else if (currentSection === 'issues' && values.length >= 8) {
          data.issues.push({
            machine_id: values[0],
            area: values[1],
            section: values[2],
            location: values[3],
            issue_description: values[4],
            service_status: values[5],
            reported_date: values[6],
            resolved: values[7] === 'true',
            resolved_date: values[8] || null
          });
        }
      }
    }
    
    return data;
  };

  const handleRestoreBackup = async () => {
    if (!uploadedData || !uploadingCasino) return;

    try {
      // Create machines
      for (const machine of uploadedData.machines) {
        await SlotMachine.create({
          ...machine,
          casino_id: uploadingCasino.id
        });
      }

      // Create maintenance records
      for (const record of uploadedData.maintenance) {
        await MaintenanceRecord.create({
          ...record,
          casino_id: uploadingCasino.id
        });
      }

      // Create issues
      for (const issue of uploadedData.issues) {
        await Issue.create({
          ...issue,
          casino_id: uploadingCasino.id,
          notes: []
        });
      }

      alert(`Successfully restored ${uploadedData.machines.length} machines, ${uploadedData.maintenance.length} maintenance records, and ${uploadedData.issues.length} issues.`);
      setShowUploadConfirm(false);
      setUploadedData(null);
      setUploadingCasino(null);
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Error restoring backup. Some data may have been imported. Please check and try again if needed.');
    }
  };

  const handleFirstConfirm = (casino) => {
    setCasinoToDelete(casino);
    setShowFirstConfirm(true);
  };

  const handleSecondConfirm = () => {
    setShowFirstConfirm(false);
    setShowSecondConfirm(true);
    setDeleteConfirmText('');
  };

  const handleFinalDelete = async () => {
    if (deleteConfirmText === 'DELETE' && casinoToDelete) {
      try {
        await Casino.delete(casinoToDelete.id);
        setShowSecondConfirm(false);
        setCasinoToDelete(null);
        setDeleteConfirmText('');
        loadCasinos();
      } catch (error) {
        console.error('Error deleting casino:', error);
      }
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-8 h-8" />
            Manage Casinos
          </h1>
          <p className="mt-2 text-slate-400">
            Add or remove casinos from the system, backup and restore data
          </p>
        </div>

        <Card className="mb-6 border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Database className="w-5 h-5" />
              Full System Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={handleDownloadFullBackup}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Full Backup
              </Button>
              <label>
                <Button
                  variant="outline"
                  className="border-green-700 bg-green-900/30 text-green-300 hover:bg-green-900/50"
                  asChild
                >
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Full Backup
                  </span>
                </Button>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFullBackupUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            <p className="text-sm text-slate-400 mt-3">
              Download or restore all data including all casinos, machines, maintenance records, and issues.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6 border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Add New Casino</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-slate-300 mb-2 block">Casino Name</Label>
                <Input
                  value={newCasinoName}
                  onChange={(e) => setNewCasinoName(e.target.value)}
                  placeholder="Enter casino name..."
                  className="bg-slate-700 border-slate-600 text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCasino()}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleAddCasino}
                  disabled={!newCasinoName.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Casino
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-700 shadow-lg bg-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Existing Casinos</CardTitle>
          </CardHeader>
          <CardContent>
            {casinos.length > 0 ? (
              <div className="space-y-3">
                {casinos.map((casino) => (
                  <div 
                    key={casino.id}
                    className="p-4 bg-slate-700/50 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-blue-400" />
                        <span className="text-lg font-medium text-white">{casino.name}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadBackup(casino)}
                          className="border-blue-700 bg-blue-900/30 text-blue-300 hover:bg-blue-900/50"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Backup
                        </Button>
                        <label>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-green-700 bg-green-900/30 text-green-300 hover:bg-green-900/50"
                            asChild
                          >
                            <span>
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Backup
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFileUpload(e, casino)}
                            style={{ display: 'none' }}
                          />
                        </label>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => handleFirstConfirm(casino)}
                          className="border-red-700 bg-red-900/30 text-red-300 hover:bg-red-900/50"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                    <ManageTechniciansPanel casino={casino} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-500" />
                <p className="text-slate-400">No casinos yet. Add your first casino above.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Restore Confirmation Dialog */}
        <AlertDialog open={showFullRestoreConfirm} onOpenChange={setShowFullRestoreConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Restore Full System Backup</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                You are about to restore a full system backup.
                <br /><br />
                This will import:
                <ul className="list-disc list-inside mt-2">
                  <li>{fullBackupData?.casinos.length || 0} casinos</li>
                  <li>{fullBackupData?.machines.length || 0} machines</li>
                  <li>{fullBackupData?.maintenance.length || 0} maintenance records</li>
                  <li>{fullBackupData?.issues.length || 0} issues</li>
                </ul>
                <br />
                <strong className="text-white">Warning:</strong> This action will add all these records to your existing data. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                onClick={() => {
                  setShowFullRestoreConfirm(false);
                  setFullBackupData(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestoreFullBackup}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600"
              >
                Restore Full Backup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Upload Confirmation Dialog */}
        <AlertDialog open={showUploadConfirm} onOpenChange={setShowUploadConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Restore Backup Data</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                You are about to restore backup data for <span className="font-semibold text-white">{uploadingCasino?.name}</span>.
                <br /><br />
                This will import:
                <ul className="list-disc list-inside mt-2">
                  <li>{uploadedData?.machines.length || 0} machines</li>
                  <li>{uploadedData?.maintenance.length || 0} maintenance records</li>
                  <li>{uploadedData?.issues.length || 0} issues</li>
                </ul>
                <br />
                This action will add these records to the existing data. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                onClick={() => {
                  setShowUploadConfirm(false);
                  setUploadedData(null);
                  setUploadingCasino(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRestoreBackup}
                className="bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600"
              >
                Restore Backup
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialogs */}
        <AlertDialog open={showFirstConfirm} onOpenChange={setShowFirstConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Casino?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                Are you sure you want to delete <span className="font-semibold text-white">{casinoToDelete?.name}</span>? 
                This action will also delete all associated machines, issues, and data. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleSecondConfirm}
                className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600"
              >
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showSecondConfirm} onOpenChange={setShowSecondConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">⚠️ Final Warning</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-300">
                This is your final warning. Deleting <span className="font-semibold text-white">{casinoToDelete?.name}</span> is permanent. 
                Type <span className="font-mono font-bold text-white">DELETE</span> to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="bg-slate-700 border-slate-600 text-white font-mono"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel 
                className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
                onClick={() => {
                  setShowSecondConfirm(false);
                  setDeleteConfirmText('');
                  setCasinoToDelete(null);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinalDelete}
                disabled={deleteConfirmText !== 'DELETE'}
                className="bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-700 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}