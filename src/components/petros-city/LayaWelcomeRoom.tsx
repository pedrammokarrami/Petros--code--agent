import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  ArrowRight,
  Compass,
  Cpu,
  Layers,
  ShoppingBag,
  Terminal,
  Activity,
  Server,
  Shield,
  CheckCircle2,
  Clock,
  Send,
  RefreshCw,
  FolderTree,
  ExternalLink,
  ChevronRight,
  Play,
  FileCode,
  Zap,
} from 'lucide-react';
import { Message } from '../../types';

interface Props {
  isFa?: boolean;
  onNavigateRoom: (room: 'welcome' | 'engineering' | 'control' | 'laboratory' | 'agency' | 'commerce' | 'studio') => void;
  onSendMessage: (text: string) => Promise<void>;
  isExecuting: boolean;
  messages: Message[];
  inputText: string;
  onInputTextChange: (text: string) => void;
}

export function LayaWelcomeRoom({
  isFa = false,
  onNavigateRoom,
  onSendMessage,
  isExecuting,
  messages,
  inputText,
  onInputTextChange,
}: Props) {
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<string>('saas');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/project/info')
      .then((r) => r.json())
      .then((d) => setWorkspaceInfo(d))
      .catch(() => {});

    fetch('/api/supervisor/status')
      .then((r) => r.json())
      .then((d) => setTelemetry(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isExecuting]);

  const startupStarters = [
    {
      id: 'saas',
      title: isFa ? 'استارتاپ نرم‌افزاری و SaaS' : 'SaaS & Digital Platform',
      icon: Cpu,
      prompt: isFa
        ? 'کمکم کن یک استارتاپ SaaS برای این ایده طراحی و راه‌اندازی کنم: مدل اشتراک، معماری فنی و اولین نسخه اجرایی.'
        : 'Help me build a complete SaaS startup for this product: subscription model, technical architecture, and MVP codebase.',
      room: 'engineering',
    },
    {
      id: 'ecommerce',
      title: isFa ? 'برند فروشگاهی و E-Commerce' : 'E-Commerce & DTC Brand',
      icon: ShoppingBag,
      prompt: isFa
        ? 'کمکم کن یک برند تجارت الکترونیک ایجاد کنم: مدل اقتصادی، محاسبه حاشیه سود، و ویترین فروشگاهی.'
        : 'Help me launch an E-Commerce brand: unit economics, margin calculation, and digital storefront.',
      room: 'commerce',
    },
    {
      id: 'agency',
      title: isFa ? 'آژانس هوشمند و خدمات B2B' : 'AI Agency & B2B Services',
      icon: Layers,
      prompt: isFa
        ? 'کمکم کن یک آژانس خدمات مبتنی بر هوش مصنوعی راه‌اندازی کنم: بسته‌های خدماتی، فرآیند جذب مشتری و قراردادها.'
        : 'Help me create an AI digital agency: service packages, client acquisition loops, and delivery workflows.',
      room: 'agency',
    },
    {
      id: 'research',
      title: isFa ? 'پژوهش و اعتبارسنجی ایده' : 'Market Research & Validation',
      icon: Activity,
      prompt: isFa
        ? 'تحلیل بازار و رقبای این ایده را انجام بده: مزیت رقابتی، تحلیل SWOT و ابزارهای منبع‌باز موجود.'
        : 'Perform market and competitor research for this idea: competitive moat, SWOT analysis, and existing open-source libraries.',
      room: 'laboratory',
    },
  ];

  const startupMilestones = [
    { id: 1, title: isFa ? 'محیط کاری و گیت مستقر شد' : 'Local Workspace Ready', done: true },
    { id: 2, title: isFa ? 'موتورهای محلی و رایگان فعال (Ollama / Kilo)' : 'Zero-Cost Engines Online', done: telemetry?.overallState === 'ONLINE' || telemetry?.overallState === 'DEGRADED' },
    { id: 3, title: isFa ? 'اعتبارسنجی ایده و تحلیل بازار' : 'Market Research & Moat', done: false, room: 'laboratory' },
    { id: 4, title: isFa ? 'مدل تجاری و اقتصاد واحد' : 'Unit Economics & Pricing', done: false, room: 'commerce' },
    { id: 5, title: isFa ? 'پیاده‌سازی کد MVP با مهندس هوشمند' : 'MVP Codebase & Tests', done: false, room: 'engineering' },
    { id: 6, title: isFa ? 'استقرار و انتشار نهایی' : 'Production Launch & Package', done: false, room: 'studio' },
  ];

  const handleStarterClick = (promptText: string) => {
    onInputTextChange(promptText);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isExecuting) return;
    onSendMessage(inputText);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-8 animate-fadeIn text-slate-100">
      {/* 1. LAYA CINEMATIC HERO & WORLD INTRODUCTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#06101F]/90 via-[#030814]/95 to-[#02040A] border border-[#4FB8FF]/25 p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* LAYA Avatar & Voice Waveform */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1F6FEB]/15 border border-[#4FB8FF]/30 text-[#4FB8FF] text-xs font-mono tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-spin" />
              <span>{isFa ? 'هوش مصنوعی مرکزی • لایا (LAYA)' : 'CENTRAL AI COMPANION • LAYA'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              {isFa ? (
                <>
                  از یک ایده خام تا{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4FB8FF] via-[#79C0FF] to-white">
                    یک استارتاپ واقعی و زنده
                  </span>
                </>
              ) : (
                <>
                  Turn any idea into a{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#4FB8FF] via-[#79C0FF] to-white">
                    living, executable startup
                  </span>
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              {isFa
                ? 'سلام، من لایا هستم؛ همراه هوشمند شما در پتروس. من تحقیق، تدوین مدل کسب‌وکار، برندینگ، کدنویسی و اجرای تیم‌های ایجنت را در یک دنیای یکپارچه هماهنگ می‌کنم.'
                : 'Welcome. I am LAYA, your autonomous co-founder in Petros. I coordinate market research, business economics, engineering execution, and agent squads across a unified ecosystem.'}
            </p>

            {/* Live Context Telemetry Badges */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {isFa ? 'هوش محلی Ollama فعال' : 'Ollama Offline LLM Active'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[#4FB8FF]" />
                {isFa ? 'مدل Kilo رایگان' : 'Kilo Free Tier ($0.00)'}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
                {workspaceInfo?.name || 'Desktop/petros'}
              </span>
            </div>
          </div>

          {/* Holographic Laya Point-Mesh Visual Badge */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 shrink-0 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#0A2E66]/40 via-[#1F6FEB]/20 to-[#4FB8FF]/10 blur-2xl animate-pulse" />
            <div className="relative w-44 h-44 rounded-full border border-[#4FB8FF]/30 bg-[#06101F]/80 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center shadow-inner">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#0A2E66] to-[#4FB8FF] flex items-center justify-center shadow-lg shadow-blue-500/30 border border-white/20 mb-3">
                <Compass className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '24s' }} />
              </div>
              <p className="text-xs font-bold text-white tracking-widest uppercase">LAYA CORE</p>
              <p className="text-[10px] text-[#4FB8FF] font-mono mt-0.5">READY TO EXECUTE</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STARTUP LAUNCHPAD ARCHETYPES */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#4FB8FF]" />
            {isFa ? 'شروع سریع راه‌اندازی استارتاپ' : 'Startup Quick-Launch Archetypes'}
          </h2>
          <span className="text-xs text-slate-500">
            {isFa ? 'انتخاب قالب برای شروع مستقیم' : 'Select a lane to initiate'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {startupStarters.map((item) => {
            const Icon = item.icon;
            const isSel = selectedArchetype === item.id;
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedArchetype(item.id);
                  handleStarterClick(item.prompt);
                }}
                className={`group p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSel
                    ? 'bg-[#1F6FEB]/15 border-[#4FB8FF] text-white shadow-lg shadow-blue-900/20'
                    : 'bg-[#060D1A]/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0A2E66] to-[#1F6FEB] flex items-center justify-center text-white shadow-md">
                    <Icon className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#4FB8FF] transition-all" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateRoom(item.room as any);
                  }}
                  className="pt-2 text-[11px] font-medium text-[#4FB8FF] flex items-center gap-1 group-hover:underline"
                >
                  <span>{isFa ? 'ورود به محیط تخصصی' : 'Enter Environment'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. LAYA CONVERSATIONAL WORKSPACE & MILESTONE BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Conversation Stream */}
        <section className="lg:col-span-2 rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-4 sm:p-5 flex flex-col h-[520px] shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-semibold text-white">
                {isFa ? 'گفتگوی فعال با لایا' : 'Active Conversation with Laya'}
              </span>
            </div>
            <span className="text-slate-400 font-mono text-[11px]">
              {messages.length} {isFa ? 'پیام' : 'messages'}
            </span>
          </div>

          {/* Messages Scroll Area */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-[#06101F] border border-[#4FB8FF]/20 flex items-center justify-center text-[#4FB8FF]">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-300 font-medium">
                  {isFa
                    ? 'ایده، نیاز یا پروژه خود را بنویسید تا با هم نقشه راه آن را بسازیم.'
                    : 'Describe your startup idea or product goal to generate a real execution roadmap.'}
                </p>
                <p className="text-xs text-slate-500 max-w-md">
                  {isFa
                    ? 'مثال: "کمکم کن برای فروشگاه هوشمند قهوه یک سیستم اشتراک آنلاین طراحی کنم."'
                    : 'Example: "Help me create an online business for an AI code diagnostic tool."'}
                </p>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === 'user' ? 'items-end' : 'items-start'
                  } animate-fadeIn`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    <span>{m.role === 'user' ? (isFa ? 'شما' : 'YOU') : 'LAYA'}</span>
                    <span>•</span>
                    <span>{new Date(m.timestamp || Date.now()).toLocaleTimeString()}</span>
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#1F6FEB] text-white rounded-tr-xs shadow-md shadow-blue-900/30'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs whitespace-pre-wrap'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}

            {isExecuting && (
              <div className="flex items-center gap-2 text-xs text-[#4FB8FF] animate-pulse py-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{isFa ? 'لایا در حال تحلیل و هماهنگی ایجنت‌ها...' : 'Laya is thinking & coordinating...'}</span>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleFormSubmit} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => onInputTextChange(e.target.value)}
              placeholder={
                isFa
                  ? 'دستور یا ایده خود را بنویسید (مثلاً: یک فروشگاه اشتراکی بساز)...'
                  : 'Tell Laya what to build (e.g., "Help me create an online business for this product")...'
              }
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-[#4FB8FF] rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isExecuting}
              className="px-4 py-2.5 rounded-xl bg-[#1F6FEB] hover:bg-blue-600 disabled:opacity-50 text-white font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
            >
              <span>{isFa ? 'ارسال' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>

        {/* Startup Execution Roadmap Milestones */}
        <section className="rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 flex flex-col justify-between shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-[#4FB8FF]" />
                {isFa ? 'نقشه راه اجرای استارتاپ' : 'Startup Execution Roadmap'}
              </h3>
              <span className="text-[11px] font-mono text-emerald-400">2 / 6 DONE</span>
            </div>

            <div className="mt-4 space-y-3">
              {startupMilestones.map((m) => (
                <div
                  key={m.id}
                  onClick={() => m.room && onNavigateRoom(m.room as any)}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    m.done
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                      : m.room
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer'
                      : 'bg-slate-900/30 border-slate-800/50 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {m.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                    <span className="text-xs font-medium">{m.title}</span>
                  </div>
                  {m.room && !m.done && (
                    <span className="text-[10px] text-[#4FB8FF] underline uppercase tracking-wider font-mono">
                      {isFa ? 'اقدام' : 'GO'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Portal Switcher */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {isFa ? 'دسترسی سریع به فضاها' : 'Quick Room Portals'}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigateRoom('laboratory')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-left cursor-pointer truncate"
              >
                🔬 {isFa ? 'آزمایشگاه' : 'Laboratory'}
              </button>
              <button
                onClick={() => onNavigateRoom('commerce')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-left cursor-pointer truncate"
              >
                🛍️ {isFa ? 'تجارت و مالی' : 'Commerce'}
              </button>
              <button
                onClick={() => onNavigateRoom('agency')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-left cursor-pointer truncate"
              >
                🤖 {isFa ? 'آژانس هوشمند' : 'Agency'}
              </button>
              <button
                onClick={() => onNavigateRoom('engineering')}
                className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-left cursor-pointer truncate"
              >
                💻 {isFa ? 'مهندسی کد' : 'Engineering'}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
