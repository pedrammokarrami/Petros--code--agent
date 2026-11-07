/**
 * Petros World Header Bar
 * Apple-grade glassmorphic navigation header featuring domain selector,
 * room pills, visual mode toggle, and system utilities.
 */

import React from 'react';
import {
  Building2,
  Briefcase,
  ShoppingCart,
  Video,
  Cpu,
  Box,
  Layers,
  Wrench,
  Globe,
  History,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useBusinessWorldStore, DOMAIN_MANIFESTS } from '../business/BusinessWorldManager';
import { BusinessDomain } from '../business/types';

interface Props {
  language: string;
  onLanguageChange?: (lang: string) => void;
  visualMode: 'normal' | 'holographic';
  onToggleVisualMode: (mode: 'normal' | 'holographic') => void;
  onOpenToolCenter: () => void;
  onOpenBrowserWorkspace: () => void;
  onToggleHistory: () => void;
  onClearHistory: () => void;
  messageCount: number;
  showHistoryDrawer: boolean;
}

export const WorldHeaderBar: React.FC<Props> = ({
  language,
  onLanguageChange,
  visualMode,
  onToggleVisualMode,
  onOpenToolCenter,
  onOpenBrowserWorkspace,
  onToggleHistory,
  onClearHistory,
  messageCount,
  showHistoryDrawer,
}) => {
  const isFa = language === 'fa';
  const currentDomain = useBusinessWorldStore((s) => s.currentDomain);
  const currentRoom = useBusinessWorldStore((s) => s.currentRoom);
  const setDomain = useBusinessWorldStore((s) => s.setDomain);
  const setRoom = useBusinessWorldStore((s) => s.setRoom);
  const activeManifest = useBusinessWorldStore((s) => s.activeDomainManifest);

  const domainOptions: { id: BusinessDomain; labelEn: string; labelFa: string; icon: any }[] = [
    { id: 'campus', labelEn: 'Campus', labelFa: 'ستاد مرکزی', icon: Building2 },
    { id: 'agency', labelEn: 'Agency', labelFa: 'آژانس', icon: Briefcase },
    { id: 'commerce', labelEn: 'Commerce', labelFa: 'تجارت و لجستیک', icon: ShoppingCart },
    { id: 'content', labelEn: 'Content', labelFa: 'استودیو مدیا', icon: Video },
    { id: 'research', labelEn: 'Research', labelFa: 'آزمایشگاه AI', icon: Cpu },
  ];

  return (
    <header className="relative z-30 w-full px-6 py-3 flex flex-wrap items-center justify-between gap-3 pointer-events-auto border-b border-white/10 bg-[#02040a]/75 backdrop-blur-xl shadow-lg">
      {/* 1. Petros Brand & Active Domain Badge */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0A2E66] via-[#1F6FEB] to-[#4FB8FF] flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/20">
          <span className="font-bold text-white text-sm">P</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-wider text-white text-sm">PETROS</span>
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded-full border text-white font-medium shadow-sm"
              style={{
                backgroundColor: `${activeManifest.themeColor}33`,
                borderColor: `${activeManifest.themeColor}88`,
                color: activeManifest.themeColor,
              }}
            >
              {activeManifest.badge}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs">
            {isFa ? activeManifest.subtitle : activeManifest.title}
          </p>
        </div>
      </div>

      {/* 2. Central Domain Selector Dock (Only in 3D Holographic Mode) */}
      {visualMode === 'holographic' && (
        <div className="flex items-center gap-1 p-1 rounded-full bg-slate-900/90 border border-white/15 shadow-xl backdrop-blur-xl">
          {domainOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = currentDomain === opt.id;
            return (
              <button
                key={opt.id}
                id={`btn-domain-${opt.id}`}
                onClick={() => setDomain(opt.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{isFa ? opt.labelFa : opt.labelEn}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Visual Mode Switcher (Normal / Holographic) & Action Utilities */}
      <div className="flex items-center gap-2">
        {/* Visual Mode Toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-slate-900/80 border border-white/10">
          <button
            id="btn-mode-normal"
            onClick={() => onToggleVisualMode('normal')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer ${
              visualMode === 'normal'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden md:inline">{isFa ? 'عادی' : 'Stage'}</span>
          </button>
          <button
            id="btn-mode-holographic"
            onClick={() => onToggleVisualMode('holographic')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer ${
              visualMode === 'holographic'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3 h-3" />
            <span className="hidden md:inline">{isFa ? 'سه‌بعدی' : '3D World'}</span>
          </button>
        </div>

        {/* Tool Center */}
        <button
          id="btn-tool-center"
          onClick={onOpenToolCenter}
          className="apple-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-blue-300 hover:text-white cursor-pointer"
        >
          <Wrench className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline">{isFa ? 'ابزارها' : 'Tools'}</span>
        </button>

        {/* Browser Workspace */}
        <button
          id="btn-browser-workspace"
          onClick={onOpenBrowserWorkspace}
          className="apple-glass-pill flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-indigo-300 hover:text-white cursor-pointer"
        >
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">{isFa ? 'مرورگر' : 'Browser'}</span>
        </button>

        {/* History Toggle */}
        {messageCount > 1 && (
          <button
            id="btn-toggle-history"
            onClick={onToggleHistory}
            className={`apple-glass-pill flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs cursor-pointer ${
              showHistoryDrawer ? 'bg-blue-600 text-white border-blue-400' : 'text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>{messageCount}</span>
          </button>
        )}

        {/* Language */}
        <button
          id="btn-toggle-language"
          onClick={() => onLanguageChange && onLanguageChange(isFa ? 'en' : 'fa')}
          className="apple-glass-pill px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white cursor-pointer"
        >
          <span>{isFa ? 'EN' : 'فا'}</span>
        </button>

        {/* Reset World */}
        <button
          id="btn-reset-world"
          onClick={onClearHistory}
          title={isFa ? 'شروع گفتگوی جدید' : 'Start Fresh'}
          className="apple-glass-pill p-2 rounded-lg text-slate-400 hover:text-white cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Room Navigation Ribbon (Sub-bar under header when in 3D Mode) */}
      {visualMode === 'holographic' && (
        <div className="w-full flex items-center justify-center gap-2 pt-1 pb-0.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/40 border border-white/10 backdrop-blur-md overflow-x-auto max-w-full">
            <span className="text-[11px] font-medium text-slate-400 px-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              {isFa ? 'فضاهای اتاق:' : 'Focal Zones:'}
            </span>
            {activeManifest.rooms.map((room) => {
              const isSelected = currentRoom === room.id;
              return (
                <button
                  key={room.id}
                  id={`btn-room-${room.id}`}
                  onClick={() => setRoom(room.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-white/20 text-white border border-white/30 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {room.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
};
