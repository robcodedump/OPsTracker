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