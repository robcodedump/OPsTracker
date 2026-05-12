const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useState, useRef, useEffect } from 'react';

import { Casino, SlotMachine, Issue, MaintenanceRecord } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, Loader2, X } from 'lucide-react';

export default function AIChatWidget() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hello! I'm your AI Data Assistant. Ask me anything about your casinos, slot machines, issues, or maintenance records. You can optionally filter by date range and data scope above.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState('all'); // 'all' | 'current'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const messagesEndRef = useRef(null);

  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getCurrentCasino = () => {
    const raw = localStorage.getItem('selected_casino') || localStorage.getItem('anonymous_casino');
    return raw ? JSON.parse(raw) : null;
  };

  const fetchData = async () => {
    const currentCasino = getCurrentCasino();
    const filterByCasino = scope === 'current' && currentCasino;

    const [casinos, machines, issuesRaw, maintenanceRaw, equipmentLogsRaw, ramClearsRaw, equipmentRaw] = await Promise.all([
      Casino.list(),
      filterByCasino ? SlotMachine.filter({ casino_id: currentCasino.id }) : SlotMachine.list(),
      filterByCasino ? Issue.filter({ casino_id: currentCasino.id }) : Issue.list(),
      filterByCasino ? MaintenanceRecord.filter({ casino_id: currentCasino.id }) : MaintenanceRecord.list(),
      filterByCasino
        ? db.entities.EquipmentLog.filter({ casino_id: currentCasino.id })
        : db.entities.EquipmentLog.list(),
      filterByCasino
        ? db.entities.RamClear.filter({ casino_id: currentCasino.id })
        : db.entities.RamClear.list(),
      filterByCasino
        ? db.entities.Equipment.filter({ casino_id: currentCasino.id })