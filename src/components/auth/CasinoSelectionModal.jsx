import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle2 } from "lucide-react";
import { Casino } from "@/entities/Casino";

export default function CasinoSelectionModal({ open, onSelectCasino }) {
  const [casinos, setCasinos] = useState([]);
  const [selectedCasinoId, setSelectedCasinoId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadCasinos();
    }
  }, [open]);

  const loadCasinos = async () => {
    try {
      const casinosData = await Casino.list();
      setCasinos(casinosData);
      
      // Check if there's a previously selected casino
      const storedCasino = localStorage.getItem('selected_casino') || localStorage.getItem('anonymous_casino');
      if (storedCasino) {
        const parsed = JSON.parse(storedCasino);
        setSelectedCasinoId(parsed.id);
      } else if (casinosData.length > 0) {
        setSelectedCasinoId(casinosData[0].id);
      }
    } catch (error) {
      console.error('Error loading casinos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedCasinoId) {
      const casino = casinos.find(c => c.id === selectedCasinoId);
      onSelectCasino({ id: selectedCasinoId, name: casino.name });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md bg-slate-800 border-slate-700 text-white"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-white flex items-center justify-center gap-2">
            <Building2 className="w-6 h-6" />
            Select Your Casino
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : casinos.length > 0 ? (
            <>
              <RadioGroup value={selectedCasinoId} onValueChange={setSelectedCasinoId}>
                <div className="space-y-3">
                  {casinos.map((casino) => {
                    const isSelected = selectedCasinoId === casino.id;
                    return (
                      <div 
                        key={casino.id} 
                        onClick={() => setSelectedCasinoId(casino.id)}
                        className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-500/50' 
                            : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <RadioGroupItem 
                          value={casino.id} 
                          id={casino.id}
                          className={isSelected ? 'border-white' : ''}
                        />
                        <Label 
                          htmlFor={casino.id} 
                          className={`text-lg cursor-pointer flex-1 ${
                            isSelected ? 'text-white font-bold' : 'text-slate-200'
                          }`}
                        >
                          {casino.name}
                        </Label>
                        {isSelected && (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
              <Button 
                onClick={handleConfirm}
                disabled={!selectedCasinoId}
                className="w-full mt-6 h-12 text-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
              >
                Confirm Selection
              </Button>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400">No casinos available. Please contact an administrator.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}