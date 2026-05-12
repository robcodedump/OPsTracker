const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle } from "lucide-react";

export default function BulkUploadDialog({ onUploadComplete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    try {
      const casinoData = sessionStorage.getItem('selected_casino') || localStorage.getItem('selected_casino');
      
      if (!casinoData) {
        throw new Error('No casino selected. Please select a casino before uploading machines.');
      }
      
      const casino = JSON.parse(casinoData);
      
      if (!casino || !casino.id) {
        throw new Error('Invalid casino data. Please select a casino again and try uploading.');
      }

      // Check file type
      const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
      
      if (fileExtension === 'xlsx') {
        setResult({
          success: false,
          message: 'Excel (.xlsx) files are not directly supported. Please save your file as CSV format and try again.'
        });
        setUploading(false);
        return;
      }

      if (fileExtension !== 'csv') {
        setResult({
          success: false,
          message: 'Only CSV files are supported. Please upload a .csv file.'
        });
        setUploading(false);
        return;
      }

      // Read and parse CSV file manually
      const text = await selectedFile.text();
      const machines = parseCSVWithColumnMapping(text);

      if (machines.length === 0) {
        setResult({
          success: false,
          message: 'No valid machine data found in the CSV file.'
        });
        setUploading(false);
        return;
      }

      // Get existing machines to check for updates
      const allExistingMachines = await db.entities.SlotMachine.filter({ casino_id: casino.id });
      const existingMachineMap = {};
      const csvMachineIds = new Set();

      // Check for duplicate machine_ids in existing database (Option A: Stop upload)
      allExistingMachines.forEach(m => {
        if (existingMachineMap[m.machine_id]) {
          throw new Error(`Duplicate machine ID '${m.machine_id}' found in your existing database. Please resolve this data integrity issue before bulk uploading.`);
        }
        existingMachineMap[m.machine_id] = m;
      });

      // Check for duplicate machine_ids within the uploaded CSV (Option A: Stop upload)
      machines.forEach(machineData => {
        if (csvMachineIds.has(machineData.machine_id)) {
          throw new Error(`Duplicate machine ID '${machineData.machine_id}' found within your CSV file. Please ensure all Machine IDs are unique.`);
        }
        csvMachineIds.add(machineData.machine_id);
      });

      // Separate machines into create and update arrays
      const machinesToCreate = [];
      const machinesToUpdate = [];

      machines.forEach(machineData => {
        const machineWithCasino = {
          ...machineData,
          casino_id: casino.id,
          status: machineData.status || 'active'
        };

        const existingMachine = existingMachineMap[machineData.machine_id];
        
        if (existingMachine) {
          machinesToUpdate.push({ id: existingMachine.id, data: machineWithCasino });
        } else {
          machinesToCreate.push(machineWithCasino);
        }
      });

      let createdCount = 0;
      let updatedCount = 0;
      let archivedCount = 0;

      // Bulk create new machines in one call
      if (machinesToCreate.length > 0) {
        await db.entities.SlotMachine.bulkCreate(machinesToCreate);
        createdCount = machinesToCreate.length;
      }

      // Update existing machines sequentially with delays to avoid rate limits
      for (let i = 0; i < machinesToUpdate.length; i++) {
        const machine = machinesToUpdate[i];
        await db.entities.SlotMachine.update(machine.id, machine.data);
        updatedCount++;
        
        // Add 300ms delay after each update
        if (i + 1 < machinesToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        
        // Add longer delay every 5 updates
        if ((i + 1) % 5 === 0 && i + 1 < machinesToUpdate.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Archive machines not present in the uploaded CSV
      const machinesToArchive = allExistingMachines.filter(existingMachine => 
        !csvMachineIds.has(existingMachine.machine_id)
      );

      for (let i = 0; i < machinesToArchive.length; i++) {
        const machine = machinesToArchive[i];
        if (machine.status !== 'inactive') {
          await db.entities.SlotMachine.update(machine.id, { status: 'inactive' });
          archivedCount++;
          
          // Add 300ms delay after each archive update
          if (i + 1 < machinesToArchive.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          // Add longer delay every 5 archive updates
          if ((i + 1) % 5 === 0 && i + 1 < machinesToArchive.length) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }

      setResult({
        success: true,
        count: machines.length,
        message: `Successfully processed ${machines.length} machines!\n${createdCount} new machines created, ${updatedCount} machines updated, ${archivedCount} machines archived.`
      });

      // Call the callback to refresh the machines list
      setTimeout(() => {
        onUploadComplete();
        setShowDialog(false);
        setSelectedFile(null);
        setResult(null);
      }, 3000);

    } catch (error) {
      setResult({
        success: false,
        message: error.message || 'An error occurred during upload'
      });
    } finally {
      setUploading(false);
    }
  };

  const parseCSVWithColumnMapping = (csvText) => {
    const lines = csvText.split('\n');
    const machines = [];

    // Skip header row (index 0) and start from row 1
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCSVLine(line);
      
      // Column mapping based on specification:
      // Column B (index 1): Location (split by dash)
      // Column C (index 2): Machine ID
      // Column D (index 3): Serial Number
      // Column E (index 4): Manufacturer
      // Column G (index 6): Theme
      // Column H (index 7): Model
      // Column J (index 9): Install Date

      if (columns.length < 3) continue; // Need at least location and machine ID

      const locationString = columns[1] || ''; // Column B
      const locationParts = locationString.split('-').map(p => p.trim());
      
      // Skip if we don't have valid location format
      if (locationParts.length < 3) continue;

      const machineId = columns[2] || ''; // Column C
      if (!machineId) continue; // Machine ID is required

      const machine = {
        machine_id: machineId,
        area: locationParts[0] || '',
        section: locationParts[1] || '',
        location: locationParts[2] || '',
        serial_number: columns[3] || '', // Column D
        manufacturer: columns[4] || '', // Column E
        theme: columns[6] || '', // Column G
        model: columns[7] || '', // Column H
        install_date: columns[9] || '' // Column J
      };

      // Validate required fields
      if (machine.area && machine.section && machine.location && machine.manufacturer && machine.model) {
        machines.push(machine);
      }
    }

    return machines;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const downloadTemplate = () => {
    const csvContent = 
      "Column A (Unused),Location (A-S-L),Machine ID,Serial Number,Manufacturer,Column F (Unused),Theme,Model,Column I (Unused),Install Date\n" +
      "1,1-2-5,SLOT001,SN123456,IGT,,Mega Fortune,S3000,,2024-01-15\n" +
      "2,1-2-6,SLOT002,SN789012,Aristocrat,,Dragon Link,MK7,,2024-01-20\n" +
      "3,2-1-3,SLOT003,SN345678,Konami,,Lotus Land,Opus,,2023-12-10";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slot_machines_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700">
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            Bulk Upload Slot Machines
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
            <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Download className="w-4 h-4" />
              CSV Format Requirements
            </h4>
            <p className="text-sm text-slate-300 mb-3">
              Your CSV file must have these columns in this exact order:
            </p>
            <ul className="text-sm text-slate-300 space-y-1 list-disc list-inside mb-4">
              <li><strong>Column B:</strong> Location in A-S-L format (e.g., "1-2-5")</li>
              <li><strong>Column C:</strong> Machine ID (unique identifier)</li>
              <li><strong>Column D:</strong> Serial Number</li>
              <li><strong>Column E:</strong> Manufacturer</li>
              <li><strong>Column G:</strong> Theme</li>
              <li><strong>Column H:</strong> Model</li>
              <li><strong>Column J:</strong> Install Date (YYYY-MM-DD format)</li>
            </ul>
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3 mb-4">
              <p className="text-sm text-blue-200">
                <strong>Upsert Logic:</strong> The system uses Machine ID as the unique identifier. 
                Existing machines will be updated, and new machines will be added.
              </p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-700 rounded p-3 mb-4">
              <p className="text-sm text-yellow-200">
                <strong>Excel Users:</strong> If you have an .xlsx file, please save it as CSV format before uploading.
              </p>
            </div>
            <Button 
              onClick={downloadTemplate}
              variant="outline"
              size="sm"
              className="border-slate-500 bg-slate-600 text-slate-200 hover:bg-slate-500"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template CSV
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Select CSV File</Label>
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileSelect}
              className="bg-slate-700 border-slate-600 text-white file:bg-slate-600 file:text-white file:border-0 file:mr-4 file:py-2 file:px-4 file:rounded-md hover:file:bg-slate-500"
            />
            {selectedFile && (
              <p className="text-sm text-slate-400 mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          {result && (
            <div className={`p-4 rounded-lg border ${
              result.success 
                ? 'bg-green-900/30 border-green-700' 
                : 'bg-red-900/30 border-red-700'
            }`}>
              <div className="flex items-start gap-2">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p className={`whitespace-pre-line ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              setShowDialog(false);
              setSelectedFile(null);
              setResult(null);
            }}
            disabled={uploading}
            className="border-slate-600 bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Machines
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}