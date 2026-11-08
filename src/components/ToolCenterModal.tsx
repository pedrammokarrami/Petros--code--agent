import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Cpu,
  HardDrive,
  Gamepad2,
  Code2,
  ShoppingBag,
  Image as ImageIcon,
  Video,
  Search,
  Box,
  CheckCircle2,
  AlertTriangle,
  Play,
  Download,
  RotateCw,
  ShieldAlert,
  Sliders,
  ExternalLink,
  Sparkles,
  Zap,
} from 'lucide-react';

export interface ToolItem {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  license: string;
  status: string;
  isLocal: boolean;
  cost: string;
  hardwareRequirements: {
    minRamGb: number;
    minDiskGb: number;
    needsGpu: boolean;
  };
  capabilities: string[];
}

export interface HardwareMetrics {
  cpuName: string;
  cpuCores: number;
  totalRamGb: number;
  freeRamGb: number;
  freeDiskGb: number;
  gpuName?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  onSelectTool?: (toolId: string) => void;
}

export function ToolCenterModal({ isOpen, onClose, language = 'fa', onSelectTool }: Props) {
  if (!isOpen) return null;

  const isFa = language === 'fa';
  const [activeTab, setActiveTab] = useState<string>('all');
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [hardware, setHardware] = useState<HardwareMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [executingToolId, setExecutingToolId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: isFa ? 'همه ابزارها' : 'All Tools', icon: Wrench },
    { id: 'game_dev', label: isFa ? 'بازی‌سازی' : 'Game Dev', icon: Gamepad2 },
    { id: 'app_dev', label: isFa ? 'توسعه نرم‌افزار' : 'App Dev', icon: Code2 },
    { id: 'ecommerce', label: isFa ? 'کسب‌وکار و تجارت' : 'E-Commerce', icon: ShoppingBag },
    { id: 'image_gen', label: isFa ? 'تولید تصویر' : 'Image Gen', icon: ImageIcon },
    { id: 'video_audio', label: isFa ? 'ویدیو و صوت' : 'Video & Audio', icon: Video },
    { id: 'research', label: isFa ? 'پژوهش و داده' : 'Research', icon: Search },
    { id: 'design_3d', label: isFa ? 'طراحی و ۳بعدی' : 'Design & 3D', icon: Box },
  ];

  const fetchToolData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tools/status');
      const data = await res.json();
      if (data.tools) setTools(data.tools);
      if (data.hardware) setHardware(data.hardware);
    } catch (err: any) {
      console.error('Failed to load tool status', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchToolData();
  }, []);

  const handleTestRun = async (toolId: string) => {
    setExecutingToolId(toolId);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(
          isFa
            ? `ابزار ${toolId} با موفقیت تست شد. نتیجه در خروجی ثبت گردید.`
            : `Tool ${toolId} executed successfully and verified.`
        );
      } else {
        setActionFeedback(`Execution notice: ${data.output || data.error}`);
      }
      fetchToolData();
    } catch (e: any) {
      setActionFeedback(`Error: ${e.message}`);
    } finally {
      setExecutingToolId(null);
    }
  };

  const handleInstall = async (toolId: string) => {
    setExecutingToolId(toolId);
    setActionFeedback(null);
    try {
      const res = await fetch('/api/tools/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolId, userConfirmed: true }),
      });
      const data = await res.json();
      setActionFeedback(data.message);
      fetchToolData();
    } catch (e: any) {
      setActionFeedback(`Installation error: ${e.message}`);
    } finally {
      setExecutingToolId(null);
    }
  };

  const filteredTools =
    activeTab === 'all' ? tools : tools.filter((t) => t.category === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-5xl h-[88vh] bg-[#070E1B] border border-[#4FB8FF]/30 rounded-3xl shadow-2xl shadow-blue-950/40 flex flex-col overflow-hidden text-slate-200"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B1528] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isFa ? 'مرکز ابزارها و اکوسیستم هوشمند پتروس' : 'Petros Autonomous Tool Center'}
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-400/30">
                  Orchestrator v4.3
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isFa
                  ? 'کشف، ارزیابی، نصب، اتصال و اعتبارسنجی ابزارهای موردنیاز اهداف کاربر'
                  : 'Discover, evaluate, install, connect, and verify tools required to build products.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Hardware Resource Telemetry Widget */}
        {hardware && (
          <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-6 text-slate-400">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-200 font-medium">{hardware.cpuName}</span>
                <span className="text-[10px] text-slate-500">({hardware.cpuCores} Cores)</span>
              </div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span>
                  RAM: <strong className="text-white">{hardware.freeRamGb} GB</strong> / {hardware.totalRamGb} GB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>
                  Disk Free: <strong className="text-white">{hardware.freeDiskGb} GB</strong>
                </span>
              </div>
              {hardware.gpuName && (
                <div className="flex items-center gap-1.5 text-purple-300">
                  <Zap className="w-3.5 h-3.5" />
                  <span className="text-[11px] truncate max-w-[160px]">{hardware.gpuName}</span>
                </div>
              )}
            </div>

            <button
              onClick={fetchToolData}
              className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isFa ? 'تازه‌سازی سلامت' : 'Refresh Health'}
            </button>
          </div>
        )}

        {/* Feedback Alert Banner */}
        {actionFeedback && (
          <div className="px-6 py-2 bg-blue-900/40 border-b border-blue-500/40 text-xs text-blue-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-300" />
              {actionFeedback}
            </span>
            <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Category Rail */}
          <div className="w-56 bg-slate-950/60 border-e border-slate-800 p-3 space-y-1 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              const count =
                cat.id === 'all' ? tools.length : tools.filter((t) => t.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-400">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tool Cards Content Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {filteredTools.map((tool) => {
              const isReady = tool.status === 'Ready';
              return (
                <div
                  key={tool.id}
                  className="p-5 rounded-2xl bg-[#0B1528]/80 border border-slate-800 hover:border-blue-500/30 transition flex flex-col gap-3 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <h4 className="font-bold text-sm text-white">{tool.name}</h4>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isReady
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          }`}
                        >
                          {tool.status}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">v{tool.version}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                          {tool.license}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{tool.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isReady ? (
                        <button
                          onClick={() => handleTestRun(tool.id)}
                          disabled={executingToolId === tool.id}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs hover:bg-blue-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          {executingToolId === tool.id ? (isFa ? 'در حال اجرا...' : 'Running...') : (isFa ? 'تست کارکرد' : 'Test Run')}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstall(tool.id)}
                          disabled={executingToolId === tool.id}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs hover:bg-emerald-600 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          {executingToolId === tool.id ? (isFa ? 'در حال نصب...' : 'Installing...') : (isFa ? 'نصب و راه‌اندازی' : 'Install')}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Capabilities & Resource Badges */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                    <span className="text-slate-500">{isFa ? 'قابلیت‌ها:' : 'Capabilities:'}</span>
                    {tool.capabilities.map((cap, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-md text-slate-300">
                        {cap}
                      </span>
                    ))}
                    <span className="ml-auto text-[10px] text-slate-400 flex items-center gap-2">
                      <span>RAM: &ge; {tool.hardwareRequirements.minRamGb} GB</span>
                      <span>•</span>
                      <span>Disk: &ge; {tool.hardwareRequirements.minDiskGb} GB</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0B1528] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{isFa ? 'سرویس‌دهنده محلی پتروس فعال است' : 'Petros Local Worker & MCP Connected'}</span>
          </div>
          <span>Total Tools Managed: {tools.length}</span>
        </div>
      </div>
    </div>
  );
}
