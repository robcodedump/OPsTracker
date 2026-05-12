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
        : db.entities.Equipment.list(),
    ]);

    // Apply optional date filtering
    const inRange = (dateStr) => {
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (dateFrom && d < new Date(dateFrom)) return false;
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false;
      return true;
    };

    const issues = issuesRaw.filter(i => inRange(i.reported_date));
    const maintenance = maintenanceRaw.filter(m => inRange(m.maintenance_date));
    const equipmentLogs = equipmentLogsRaw.filter(e => inRange(e.log_date));
    const ramClears = ramClearsRaw.filter(r => inRange(r.clear_date));

    const equipment = equipmentRaw;

    return { casinos, machines, issues, maintenance, equipmentLogs, ramClears, equipment, currentCasino };
  };

  const buildPrompt = (question, data) => {
    const { casinos, machines, issues, maintenance, equipmentLogs, ramClears, equipment, currentCasino } = data;
    const scopeLabel = scope === 'current' && currentCasino ? `casino: ${currentCasino.name}` : 'all casinos';
    const dateLabel = dateFrom || dateTo ? ` | Date range: ${dateFrom || 'any'} to ${dateTo || 'any'}` : '';

    // Build a machine lookup map for enriching issues with model/manufacturer info
    const machineMap = {};
    machines.forEach(m => { machineMap[m.machine_id] = m; });

    // Build a casino lookup map
    const casinoMap = {};
    casinos.forEach(c => { casinoMap[c.id] = c.name; });

    const summary = `
DATA SCOPE: ${scopeLabel}${dateLabel}

CASINOS (${casinos.length}):
${casinos.map(c => `- ${c.name} (id: ${c.id})`).join('\n')}

SLOT MACHINES (${machines.length}):
${machines.map(m => `- [Casino: ${casinoMap[m.casino_id] || m.casino_id}] MachineID: ${m.machine_id} | ${m.manufacturer} ${m.model} | Theme: ${m.theme || 'N/A'} | Location: ${m.area}-${m.section}-${m.location} | Serial: ${m.serial_number || 'N/A'} | Install: ${m.install_date || 'N/A'} | Status: ${m.status}`).join('\n')}

ISSUES (${issues.length}) — each issue is enriched with the machine's manufacturer and model for analysis:
${issues.map(i => {
  const machine = machineMap[i.machine_id];
  const modelInfo = machine ? `${machine.manufacturer} ${machine.model}` : 'Unknown Model';
  const theme = machine?.theme || 'N/A';
  return `- [Casino: ${casinoMap[i.casino_id] || i.casino_id}] ${i.area}-${i.section}-${i.location} | Machine: ${i.machine_id} | Model: ${modelInfo} | Theme: ${theme} | Service: ${i.service_status} | Resolved: ${i.resolved} | Reported: ${i.reported_date?.slice(0,10)} | Resolved Date: ${i.resolved_date?.slice(0,10) || 'N/A'} | Description: ${i.issue_description?.slice(0, 100)}`;
}).join('\n')}

MAINTENANCE RECORDS (${maintenance.length}):
${maintenance.map(m => {
  const machine = machineMap[m.machine_id];
  const modelInfo = machine ? `${machine.manufacturer} ${machine.model}` : 'Unknown Model';
  return `- [Casino: ${casinoMap[m.casino_id] || m.casino_id}] Machine: ${m.machine_id} | Model: ${modelInfo} | ${m.trimester} ${m.year} | Tech: ${m.technician} | Date: ${m.maintenance_date} | Completed: ${m.completed}`;
}).join('\n')}

EQUIPMENT ASSETS (${equipment.length}):
${equipment.map(e => `- [Casino: ${casinoMap[e.casino_id] || e.casino_id}] ${e.equipment_type} | Model: ${e.model_name} | Asset ID: ${e.asset_id || 'N/A'} | Location: ${e.location} | Status: ${e.status} | PM Cycle: ${e.pm_cycle} | Install: ${e.install_date || 'N/A'} | Last PM: ${e.last_pm_date || 'N/A'}`).join('\n')}

EQUIPMENT LOGS (${equipmentLogs.length}):
${equipmentLogs.map(e => `- [Casino: ${casinoMap[e.casino_id] || e.casino_id}] ${e.title} | Status: ${e.status} | Type: ${e.entry_type} | Severity: ${e.severity || 'N/A'} | Tech: ${e.technician || 'N/A'} | Date: ${e.log_date?.slice(0,10)}`).join('\n')}

RAM CLEARS (${ramClears.length}):
${ramClears.map(r => `- [Casino: ${casinoMap[r.casino_id] || r.casino_id}] ${r.area}-${r.section}-${r.location} | RTP: ${r.current_rtp}% | MaxBet: ${r.max_bet} | Checked: ${r.checked} | Date: ${r.clear_date}`).join('\n')}
`.trim();

    return `You are an expert casino operations analyst assistant. You have been given complete structured data from a slot machine maintenance management system. You can answer detailed analytical questions by aggregating, counting, grouping, ranking, and cross-referencing records. For example, you can count issues per model, find the most problematic machine, rank technicians by workload, calculate resolution times, identify trends by year/month, etc. Always show your reasoning and counts when doing aggregations. If the answer cannot be determined from the data, say so honestly.

${summary}

USER QUESTION: ${question}`;
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);

    const data = await fetchData();
    const prompt = buildPrompt(question, data);
    const response = await db.integrations.Core.InvokeLLM({ prompt });

    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Card className="border border-blue-800/50 bg-slate-800 shadow-lg mb-8">
      <CardHeader className="border-b border-slate-700 pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-400" />
          AI Data Assistant
        </CardTitle>

        {/* Controls */}
        <div className="flex flex-col gap-3 mt-3">
          {/* Scope toggle */}
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-slate-400 text-sm self-center whitespace-nowrap">Data Scope:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setScope('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                  scope === 'all'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                All Casinos
              </button>
              <button
                onClick={() => setScope('current')}
                className={`px-4 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${
                  scope === 'current'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Current Casino
              </button>
            </div>
          </div>

          {/* Date range */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <span className="text-slate-400 text-sm whitespace-nowrap">Date Range:</span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-start sm:items-center">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-11 px-3 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm w-full sm:w-auto focus:outline-none focus:border-blue-500"
                placeholder="From"
              />
              <span className="text-slate-500 text-sm hidden sm:block">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-11 px-3 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm w-full sm:w-auto focus:outline-none focus:border-blue-500"
                placeholder="To"
              />
              {(dateFrom || dateTo) && (
                <button
                  onClick={clearDates}
                  className="flex items-center gap-1 text-slate-400 hover:text-white text-sm px-2 py-1 min-h-[44px]"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
              {!dateFrom && !dateTo && (
                <span className="text-slate-500 text-xs italic">Optional — leave blank for all time</span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col" style={{ height: '420px' }}>
        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                }`}
              >
                {msg.text}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-blue-400" />
              </div>
              <div className="bg-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="text-slate-400 text-sm">Analyzing data...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-700 p-4 flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your data..."
            disabled={loading}
            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 h-11"
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 text-white min-h-[44px] px-4 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}