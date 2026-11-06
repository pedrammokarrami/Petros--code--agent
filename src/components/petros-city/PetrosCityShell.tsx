import React, { useState, useEffect } from 'react';
import {
  Compass,
  Cpu,
  Terminal,
  Activity,
  Layers,
  ShoppingBag,
  Sparkles,
  Server,
  Globe,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LuminousPointCloudCanvas } from './LuminousPointCloudCanvas';
import { LayaWelcomeRoom } from './LayaWelcomeRoom';
import { AgencyRoom } from './AgencyRoom';
import { CommerceRoom } from './CommerceRoom';
import { ControlCenterRoom } from './ControlCenterRoom';
import { LaboratoryRoom } from './LaboratoryRoom';
import { EngineeringRoom } from './EngineeringRoom';
import { ContentStudioRoom } from './ContentStudioRoom';
import { Message } from '../../types';

interface Props {
  onToggleLegacy?: () => void;
  language?: string;
  onLanguageChange?: (lang: string) => void;
}

export type CityRoom = 'welcome' | 'engineering' | 'control' | 'laboratory' | 'agency' | 'commerce' | 'studio';

export function PetrosCityShell({
  onToggleLegacy,
  language = 'en',
  onLanguageChange,
}: Props) {
  const [activeRoom, setActiveRoom] = useState<CityRoom>('welcome');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [ecosystemState, setEcosystemState] = useState<string>('CONNECTING');
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('petros_city_laya_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [inputText, setInputText] = useState<string>('');
  const isFa = language === 'fa';

  useEffect(() => {
    try {
      localStorage.setItem('petros_city_laya_history', JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    const checkState = async () => {
      try {
        const res = await fetch('/api/supervisor/status');
        const data = await res.json();
        if (data.success) {
          setEcosystemState(data.overallState || 'ONLINE');
        }
      } catch {
        setEcosystemState('OFFLINE');
      }
    };
    checkState();
    const interval = setInterval(checkState, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isExecuting) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsExecuting(true);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          messages: [...messages, userMsg],
          language,
        }),
      });

      const data = await res.json();
      const reply = data.reply || data.output || data.text || (data.success ? 'Task analyzed.' : 'Processed request.');

      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: reply,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: `Error communicating with local agent: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsExecuting(false);
    }
  };

  const rooms = [
    { id: 'welcome', label: isFa ? 'لایا / خوش‌آمد' : 'Laya Welcome', icon: Compass },
    { id: 'laboratory', label: isFa ? 'آزمایشگاه' : 'Laboratory', icon: Activity },
    { id: 'agency', label: isFa ? 'آژانس هوشمند' : 'Agency', icon: Layers },
    { id: 'commerce', label: isFa ? 'تجارت و مالی' : 'Commerce', icon: ShoppingBag },
    { id: 'engineering', label: isFa ? 'مهندسی' : 'Engineering', icon: Terminal },
    { id: 'studio', label: isFa ? 'استودیو محتوا' : 'Content Studio', icon: Sparkles },
    { id: 'control', label: isFa ? 'مرکز فرماندهی' : 'Control Center', icon: Server },
  ];

  return (
    <div className="relative min-h-screen w-full bg-[#02040A] text-slate-100 flex flex-col overflow-x-hidden select-none font-sans">
      {/* 1. Luminous Scan Point Cloud Background (Westworld Aesthetic) */}
      <LuminousPointCloudCanvas isExecuting={isExecuting} activeRoom={activeRoom} />

      {/* 2. Top Navigation & Telemetry Header */}
      <header className="relative z-10 w-full px-4 py-3 bg-[#02040A]/80 border-b border-[#4FB8FF]/15 backdrop-blur-md flex items-center justify-between gap-4">
        {/* Brand & City Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0A2E66] via-[#1F6FEB] to-[#4FB8FF] flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
            <span className="font-bold text-white text-sm">P</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-sm">PETROS CITY</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[#4FB8FF]">
                v4.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {isFa ? 'پلتفرم جامع هوش مصنوعی ساخت استارتاپ' : 'Autonomous AI Startup Platform'}
            </p>
          </div>
        </div>

        {/* Spatial Room Navigation Pills (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80 backdrop-blur-sm">
          {rooms.map((r) => {
            const Icon = r.icon;
            const isActive = activeRoom === r.id;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRoom(r.id as CityRoom)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#1F6FEB] text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{r.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status Telemetry & Controls */}
        <div className="flex items-center gap-2.5">
          {/* Ecosystem State Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${
              ecosystemState === 'ONLINE'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                : ecosystemState === 'DEGRADED'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                ecosystemState === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'
              } ${isExecuting ? 'animate-ping' : 'animate-pulse'}`}
            />
            <span>{ecosystemState}</span>
          </div>

          {/* Zero-Cost Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-950/40 border border-blue-500/20 text-[11px] text-blue-300 font-mono">
            <Shield className="w-3 h-3 text-[#4FB8FF]" />
            <span>ZERO-COST</span>
          </div>

          {/* Language Toggle */}
          {onLanguageChange && (
            <button
              onClick={() => onLanguageChange(isFa ? 'en' : 'fa')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              {isFa ? 'EN' : 'فا'}
            </button>
          )}

          {/* Legacy Mode Switcher */}
          {onToggleLegacy && (
            <button
              onClick={onToggleLegacy}
              className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-all cursor-pointer"
              title="Switch to classic view"
            >
              Legacy
            </button>
          )}
        </div>
      </header>

      {/* Mobile Room Selector */}
      <div className="lg:hidden flex overflow-x-auto gap-1 p-2 bg-slate-900/60 border-b border-slate-800 z-10">
        {rooms.map((r) => {
          const Icon = r.icon;
          const isActive = activeRoom === r.id;
          return (
            <button
              key={r.id}
              onClick={() => setActiveRoom(r.id as CityRoom)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap ${
                isActive ? 'bg-[#1F6FEB] text-white' : 'text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Room Stage */}
      <main className="relative z-10 flex-1 flex flex-col py-4 px-2 sm:px-4 overflow-y-auto">
        {activeRoom === 'welcome' && (
          <LayaWelcomeRoom
            isFa={isFa}
            onNavigateRoom={setActiveRoom}
            onSendMessage={handleSendMessage}
            isExecuting={isExecuting}
            messages={messages}
            inputText={inputText}
            onInputTextChange={setInputText}
          />
        )}

        {activeRoom === 'laboratory' && <LaboratoryRoom isFa={isFa} />}
        {activeRoom === 'agency' && <AgencyRoom isFa={isFa} />}
        {activeRoom === 'commerce' && <CommerceRoom isFa={isFa} />}
        {activeRoom === 'engineering' && <EngineeringRoom isFa={isFa} />}
        {activeRoom === 'studio' && <ContentStudioRoom isFa={isFa} />}
        {activeRoom === 'control' && <ControlCenterRoom isFa={isFa} />}
      </main>
    </div>
  );
}
