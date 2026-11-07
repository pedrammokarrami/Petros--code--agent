import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Compass,
  ArrowRight,
  Maximize2,
  Minimize2,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  ShoppingBag,
  Activity,
  Terminal,
  Shield,
  FileCode,
  Globe,
  LogOut,
  Wrench,
  History,
  Layout,
  Box,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { PetrosWorldViewport } from '../../petros-world/ui/PetrosWorldViewport';
import { WorldHeaderBar } from '../../petros-world/ui/WorldHeaderBar';
import { EventActivityFeed } from '../../petros-world/ui/EventActivityFeed';
import { eventGateway } from '../../petros-world/events/BusinessEventGateway';
import { useBusinessWorldStore } from '../../petros-world/business/BusinessWorldManager';
import { Message } from '../../types';
import { BrowserWorkspace } from '../BrowserWorkspace';
import { ToolCenterModal } from '../ToolCenterModal';

interface Props {
  language?: string;
  onLanguageChange?: (lang: string) => void;
  walletSession?: { sessionId: string; walletAddress: string; projectSlug: string } | null;
  onLogout?: () => void;
  onToggleLegacy?: () => void;
}

export function LayaGenerativeExperience({
  language = 'fa',
  onLanguageChange,
  walletSession,
  onLogout,
  onToggleLegacy,
}: Props) {
  const isFa = language === 'fa';

  // Visual Mode: 'normal' (Clean, distraction-free Apple interface) vs 'holographic' (3D Game-World)
  const [visualMode, setVisualMode] = useState<'normal' | 'holographic'>(() => {
    try {
      const saved = localStorage.getItem('petros_visual_mode');
      if (saved === 'normal' || saved === 'holographic') return saved;
    } catch {}
    return 'holographic';
  });

  const handleSetMode = (mode: 'normal' | 'holographic') => {
    console.log('[Laya] Switch visual mode to:', mode);
    setVisualMode(mode);
    try {
      localStorage.setItem('petros_visual_mode', mode);
      useBusinessWorldStore.getState().setVisualMode(mode);
    } catch {}
  };

  // Spatial Environment Room: 'void' | 'commerce' | 'engineering' | 'agency' | 'research'
  const [environment, setEnvironment] = useState<WorldEnvironment>('void');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [activeDrawer, setActiveDrawer] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(false);
  const [showBrowserWorkspace, setShowBrowserWorkspace] = useState<boolean>(false);
  const [showToolCenter, setShowToolCenter] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [browserInitialUrl, setBrowserInitialUrl] = useState<string>('https://godotengine.org');
  const [agentBrowserTask, setAgentBrowserTask] = useState<{ active: boolean; action?: string; targetUrl?: string }>({ active: false });

  // App Factory Sub-state for real workspace interaction
  const [appPrompt, setAppPrompt] = useState<string>('E-Commerce Dashboard');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isBuildingApp, setIsBuildingApp] = useState<boolean>(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  // Conversation history
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem('petros_generative_messages');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg-laya-init',
        role: 'agent',
        content: isFa
          ? 'سلام، من لایا هستم؛ معمار هوشمند پتروس. ایده یا پروژه خود را شرح دهید تا محیط اختصاصی، ابزارها و کدهای آن را برایتان بسازم.'
          : 'Hello, I am Laya; Petros System Architect. Describe your startup or business idea, and we will build your tailored environment, tools, and execution squad.',
        timestamp: Date.now(),
      },
    ];
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('petros_generative_messages', JSON.stringify(messages));
    } catch {}
    if (chatEndRef.current) {
      chatEndRef.current.scrollTop = chatEndRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem('petros_visual_mode', visualMode);
    } catch {}
  }, [visualMode]);

  // Intent recognition engine for world environment
  const detectEnvironment = (text: string): WorldEnvironment => {
    const t = text.toLowerCase();
    if (
      t.includes('commerce') ||
      t.includes('store') ||
      t.includes('shop') ||
      t.includes('فروشگاه') ||
      t.includes('تجارت') ||
      t.includes('محصول') ||
      t.includes('e-commerce')
    ) {
      return 'commerce';
    }
    if (
      t.includes('saas') ||
      t.includes('app') ||
      t.includes('software') ||
      t.includes('code') ||
      t.includes('react') ||
      t.includes('typescript') ||
      t.includes('dashboard') ||
      t.includes('frontend') ||
      t.includes('backend') ||
      t.includes('برنامه') ||
      t.includes('نرم‌افزار') ||
      t.includes('پلتفرم') ||
      t.includes('توسعه') ||
      t.includes('اپلیکیشن') ||
      t.includes('کد') ||
      t.includes('داشبورد') ||
      t.includes('مهندسی') ||
      t.includes('کارخانه')
    ) {
      return 'engineering';
    }
    if (
      t.includes('agency') ||
      t.includes('service') ||
      t.includes('client') ||
      t.includes('آژانس') ||
      t.includes('خدمات') ||
      t.includes('تیم')
    ) {
      return 'agency';
    }
    if (
      t.includes('research') ||
      t.includes('validate') ||
      t.includes('market') ||
      t.includes('پژوهش') ||
      t.includes('تحقیق') ||
      t.includes('اعتبارسنجی')
    ) {
      return 'research';
    }
    return 'void';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isExecuting) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsExecuting(true);

    // Detect environment dynamically from user conversation
    const targetEnv = detectEnvironment(query);
    if (targetEnv !== 'void') {
      setTimeout(() => {
        setEnvironment(targetEnv);
      }, 400);
    }

    if (/(research|web|browser|سایت|وب|مرورگر|تحقیق|پژوهش|godot|compare)/i.test(query)) {
      setAgentBrowserTask({
        active: true,
        action: isFa ? 'جستجو و استخراج مستندات و فریم‌ورک‌ها' : 'Researching documentation & frameworks',
        targetUrl: 'https://godotengine.org',
      });
      setShowBrowserWorkspace(true);
    }
    if (/(ابزار|tools|dependency|dependencies|نصب|نصب کن)/i.test(query)) {
      setShowToolCenter(true);
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          lang: language,
          history: messages.slice(-6).map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const reply =
        data.response || data.reply || data.text || (data.success ? 'پروژه و ساختار تحلیل شد.' : 'درخواست پردازش شد.');

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
        content: isFa
          ? `ارتباط با هوش مصنوعی لایا انجام نشد: ${err.message}`
          : `Connection to Laya AI failed: ${err.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleObjectClick = (objectId: string) => {
    setActiveDrawer(objectId);
    if (objectId === 'app-factory-compiler' && !generatedCode) {
      handleBuildApp('React E-Commerce Showcase');
    }
  };

  // Real App Factory Integration
  const handleBuildApp = async (prompt: string) => {
    setIsBuildingApp(true);
    setExportStatus(null);
    try {
      const appSnippet = `export default function App() {\n  return (\n    <div className="p-8 bg-slate-900 text-white min-h-screen">\n      <h1 className="text-2xl font-bold text-cyan-400 mb-4">${prompt}</h1>\n      <p className="text-slate-300">Generated autonomously by Petros App Factory.</p>\n      <div className="grid grid-cols-3 gap-4 mt-6">\n        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">Analytics</div>\n        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">Orders</div>\n        <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">Revenue</div>\n      </div>\n    </div>\n  );\n}`;
      const res = await fetch('/api/app-factory/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appName: prompt,
          code: appSnippet,
          sourceCode: appSnippet,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.compiledJs || data.code);
      }
    } catch {
      setGeneratedCode(`// Live generated sandbox ready for ${prompt}`);
    } finally {
      setIsBuildingApp(false);
    }
  };

  const handleExportApp = async () => {
    setExportStatus('Exporting to desktop workspace...');
    try {
      const res = await fetch('/api/app-factory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: 'PetrosGenApp',
          sourceCode: generatedCode || 'export default function App() { return <div>Petros App</div>; }',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExportStatus(isFa ? `در پوشه خروجی ذخیره شد: ${data.exportPath}` : `Saved to: ${data.exportPath}`);
      } else {
        setExportStatus('Export error: ' + (data.error || 'Failed'));
      }
    } catch (e: any) {
      setExportStatus('Export error: ' + e.message);
    }
  };

  const handleClearHistory = () => {
    const initMsg: Message = {
      id: `msg-reset-${Date.now()}`,
      role: 'agent',
      content: isFa
        ? 'محیط بازنشانی شد. ایده جدید خود را مطرح کنید.'
        : 'Environment reset. What idea would you like to explore next?',
      timestamp: Date.now(),
    };
    setMessages([initMsg]);
    setEnvironment('void');
    setActiveDrawer(null);
  };

  // CLEAN CONVERSATIONAL FOCUS:
  // We extract ONLY the latest active turn for the main stage
  const latestTurnMessages = React.useMemo(() => {
    if (messages.length <= 1) return messages;
    // Find the last user message and the subsequent agent responses
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) {
      return [messages[messages.length - 1]];
    }
    return messages.slice(lastUserIdx);
  }, [messages]);

  return (
    <div
      className={`relative w-full h-screen text-slate-100 flex flex-col overflow-hidden select-none font-sans transition-colors duration-700 ${
        visualMode === 'normal' ? 'apple-normal-bg' : 'bg-[#02040A]'
      }`}
    >
      {/* 1. THREE.JS 3D GENERATIVE WORLD VIEWPORT */}
      <PetrosWorldViewport activeMode={visualMode} />

      {/* 2. TOP APPLE-GRADE HEADER BAR & DOMAIN/ROOM DOCK */}
      <WorldHeaderBar
        language={language}
        onLanguageChange={onLanguageChange}
        visualMode={visualMode}
        onToggleVisualMode={handleSetMode}
        onOpenToolCenter={() => setShowToolCenter(true)}
        onOpenBrowserWorkspace={() => setShowBrowserWorkspace(true)}
        onToggleHistory={() => setShowHistoryDrawer(!showHistoryDrawer)}
        onClearHistory={handleClearHistory}
        messageCount={messages.length}
        showHistoryDrawer={showHistoryDrawer}
      />

      {/* 3. REAL-TIME OPERATIONS EVENT FEED */}
      <EventActivityFeed language={language} />

      {/* 4. MAIN CONVERSATIONAL STAGE (Clean, focused turn layout) */}
      <main className="relative z-10 flex-1 flex flex-col justify-end items-center px-4 pb-6 pointer-events-none">
        {/* In Normal Mode: Display Elegant Floating Laya Orb / Emblem */}
        {visualMode === 'normal' && messages.length <= 1 && (
          <div className="absolute top-1/3 -translate-y-1/2 flex flex-col items-center pointer-events-none apple-float">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600/30 via-cyan-400/20 to-transparent border border-cyan-400/30 flex items-center justify-center apple-glow backdrop-blur-xl">
              <Sparkles className="w-10 h-10 text-cyan-300 animate-pulse" />
            </div>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
              {isFa ? 'لایا — معمار استارتاپ و هوش پتروس' : 'Laya — Petros Startup Architect'}
            </h2>
            <p className="mt-1 text-xs text-slate-400 max-w-sm text-center">
              {isFa
                ? 'سیستم هوشمند خلق اپلیکیشن، تجارت الکترونیک و هماهنگی ابزارها'
                : 'Intelligent software synthesis, commerce, and autonomous tools'}
            </p>
          </div>
        )}

        {/* LAYA ACTIVE TURN DISPLAY (Showing ONLY the latest active prompt & answer) */}
        <div className="w-full max-w-2xl mb-4 pointer-events-auto">
          <div className="space-y-3">
            {latestTurnMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col apple-turn-enter ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] font-semibold text-slate-400">
                  <span>{msg.role === 'user' ? (isFa ? 'شما' : 'You') : isFa ? 'لایا' : 'Laya'}</span>
                  {msg.role === 'agent' && <Sparkles className="w-3 h-3 text-cyan-400" />}
                </div>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed max-w-[92%] shadow-xl backdrop-blur-2xl transition-all duration-300 ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white rounded-br-none border border-blue-400/20 shadow-blue-900/30'
                      : 'apple-glass-card text-slate-100 rounded-bl-none border border-white/10'
                  }`}
                  dir={isFa ? 'rtl' : 'ltr'}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Elegant Apple-grade Thinking Indicator */}
            {isExecuting && (
              <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl apple-glass-card border border-cyan-500/30 max-w-fit apple-turn-enter">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs text-cyan-300 font-medium">
                  {isFa ? 'لایا در حال تحلیل و پردازش پاسخ...' : 'Laya is reasoning and synthesizing...'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. QUICK SUGGESTION CHIPS (Clean, unobtrusive shortcuts) */}
        {messages.length <= 2 && !isExecuting && (
          <div className="w-full max-w-2xl mb-3 flex flex-wrap items-center justify-center gap-2 pointer-events-auto">
            <button
              onClick={() => handleSendMessage(isFa ? 'می‌خواهم یک فروشگاه آنلاین با کاتالوگ بسازم.' : 'I want to build an e-commerce platform.')}
              className="apple-glass-pill px-3 py-1.5 rounded-full text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              🛍️ {isFa ? 'فروشگاه آنلاین با کاتالوگ' : 'Online Store with Catalog'}
            </button>
            <button
              onClick={() => handleSendMessage(isFa ? 'یک داشبورد مدیریت با ری‌اکت و تایپ‌اسکریپت بساز.' : 'Build a React dashboard with TypeScript.')}
              className="apple-glass-pill px-3 py-1.5 rounded-full text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              ⚡ {isFa ? 'داشبورد ری‌اکت و تایپ‌اسکریپت' : 'React TypeScript App'}
            </button>
            <button
              onClick={() => handleSendMessage(isFa ? 'اسکواد هوشمند آژانس را برای تدوین طرح استارتاپ فعال کن.' : 'Activate agency squad for startup plan.')}
              className="apple-glass-pill px-3 py-1.5 rounded-full text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              👥 {isFa ? 'اسکواد آژانس چندعاملی' : 'Agency Multi-Agent Squad'}
            </button>
          </div>
        )}

        {/* 6. PRIMARY MINIMAL INPUT DOCK (Zero clutter, Apple frosted glass) */}
        <div className="w-full max-w-2xl pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center apple-glass-card rounded-2xl p-1.5 border border-white/15 shadow-2xl focus-within:border-cyan-400/50 transition-all duration-300"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isFa
                  ? 'ایده استارتاپ یا نیاز پروژه خود را بنویسید (مثلاً: ساخت فروشگاه دیجیتال یا نرم‌افزار)...'
                  : 'Describe your startup or project idea (e.g. build an e-commerce platform)...'
              }
              disabled={isExecuting}
              dir={isFa ? 'rtl' : 'ltr'}
              className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none"
            />

            {/* Voice Interaction Toggle */}
            <button
              type="button"
              onClick={() => setIsVoiceActive(!isVoiceActive)}
              title={isFa ? 'تعامل صوتی' : 'Voice Interaction'}
              className={`p-2.5 rounded-xl transition cursor-pointer ${
                isVoiceActive
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {isVoiceActive ? <Mic className="w-4 h-4 animate-pulse" /> : <Mic className="w-4 h-4" />}
            </button>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!inputText.trim() || isExecuting}
              className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/25 transition cursor-pointer ml-1"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* 7. SLIDE-OUT HISTORY DRAWER (On-demand conversational archive) */}
      {showHistoryDrawer && (
        <div className="absolute top-16 right-6 bottom-6 w-96 max-w-[90vw] z-30 apple-glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden apple-drawer-enter">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-amber-400" />
              <h3 className="font-bold text-sm text-white">
                {isFa ? 'تاریخچه کامل گفتگو' : 'Full Conversation History'}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearHistory}
                title={isFa ? 'پاک کردن تاریخچه' : 'Clear History'}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs" dir={isFa ? 'rtl' : 'ltr'}>
            {messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`p-3 rounded-xl border ${
                  m.role === 'user'
                    ? 'bg-blue-950/40 border-blue-500/30 text-blue-100 ml-4'
                    : 'bg-slate-900/60 border-slate-700/50 text-slate-200 mr-4'
                }`}
              >
                <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400">
                  <span className="font-semibold">
                    {m.role === 'user' ? (isFa ? 'شما' : 'You') : isFa ? 'لایا' : 'Laya'}
                  </span>
                  <span>{new Date(m.timestamp || Date.now()).toLocaleTimeString()}</span>
                </div>
                <div className="leading-relaxed">{m.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. SLIDE-OUT 3D OBJECT WORKSPACE DRAWER */}
      {activeDrawer && (
        <div className="absolute top-16 right-6 bottom-6 w-96 max-w-[90vw] z-30 apple-glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden apple-drawer-enter">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="font-bold text-sm text-white capitalize">
                {activeDrawer.replace('-', ' ')}
              </h3>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 p-5 overflow-y-auto text-xs space-y-4" dir={isFa ? 'rtl' : 'ltr'}>
            {activeDrawer === 'commerce-storefront' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-cyan-300 text-sm">
                  {isFa ? 'ویترین دیجیتال و مدل فروشگاه' : 'Digital Storefront Architecture'}
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  {isFa
                    ? 'ساختار چندکاناله فروش با تسویه‌حساب وب۳ و درگاه‌های متصل.'
                    : 'Multi-channel digital storefront configured with Web3 settlement.'}
                </p>
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between text-slate-400">
                    <span>{isFa ? 'وضعیت کاتالوگ' : 'Catalog Status'}</span>
                    <span className="text-emerald-400">{isFa ? 'آماده سنتز' : 'Ready'}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{isFa ? 'واحد ارزی' : 'Currency'}</span>
                    <span className="text-white font-mono">USD / USDT</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSendMessage(isFa ? 'یک محصول نمونه با قیمت و حاشیه سود اضافه کن.' : 'Generate a sample product with pricing.')}
                  className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-500 transition cursor-pointer"
                >
                  {isFa ? 'تولید کاتالوگ با لایا' : 'Generate Catalog with Laya'}
                </button>
              </div>
            )}

            {activeDrawer === 'commerce-economics' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-emerald-400 text-sm">
                  {isFa ? 'مدل اقتصادی واحد (Unit Economics)' : 'Unit Economics & Margins'}
                </h4>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Target Gross Margin</span>
                    <span className="text-emerald-400 font-bold">68.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CAC Payback</span>
                    <span className="text-cyan-300 font-bold">2.4 Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">LTV / CAC</span>
                    <span className="text-amber-300 font-bold">4.2x</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSendMessage(isFa ? 'نقطه سر‌به‌سر و حاشیه سود را تحلیل کن.' : 'Analyze breakeven and margin sensitivity.')}
                  className="w-full py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                >
                  {isFa ? 'تحلیل نقطه سر‌به‌سر' : 'Analyze Breakeven'}
                </button>
              </div>
            )}

            {activeDrawer === 'app-factory-compiler' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-cyan-300 text-sm">
                  {isFa ? 'راکتور سنتز کد (App Factory)' : 'App Factory Compiler Reactor'}
                </h4>
                <p className="text-slate-300">
                  {isFa
                    ? 'تولید خودکار کدهای واکنش‌گرای React + Tailwind با ترنسپایل آنی در حافظه.'
                    : 'Instant in-memory TSX transpilation and reactive component synthesis.'}
                </p>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-slate-400">{isFa ? 'عنوان کامپوننت:' : 'Component Theme:'}</label>
                  <input
                    type="text"
                    value={appPrompt}
                    onChange={(e) => setAppPrompt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleBuildApp(appPrompt)}
                    disabled={isBuildingApp}
                    className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-500 transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{isBuildingApp ? (isFa ? 'در حال کامپایل...' : 'Building...') : isFa ? 'کامپایل TSX' : 'Compile TSX'}</span>
                  </button>

                  <button
                    onClick={handleExportApp}
                    className="flex-1 py-2 bg-slate-800 border border-slate-700 text-slate-200 rounded-lg hover:text-white transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>{isFa ? 'خروجی دسکتاپ' : 'Export'}</span>
                  </button>
                </div>

                {exportStatus && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono">
                    {exportStatus}
                  </div>
                )}
              </div>
            )}

            {activeDrawer === 'agency-squad' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-amber-400 text-sm">
                  {isFa ? 'تیم چندعاملی خودمختار' : 'Autonomous Multi-Agent Squad'}
                </h4>
                <div className="space-y-2">
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Supervisor Agent</span>
                    <span className="text-emerald-400 font-mono text-[11px]">ACTIVE</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Coder Agent</span>
                    <span className="text-emerald-400 font-mono text-[11px]">STANDBY</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span>Router Worker</span>
                    <span className="text-cyan-400 font-mono text-[11px]">PORT 20131</span>
                  </div>
                </div>
                <button
                  onClick={() => handleSendMessage(isFa ? 'برنامه اجرایی اسکواد برای این استارتاپ را تدوین کن.' : 'Draft squad execution blueprint for this startup.')}
                  className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-500 transition cursor-pointer"
                >
                  {isFa ? 'برنامه‌ریزی اسکواد با لایا' : 'Plan Squad Tasks with Laya'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. BROWSER WORKSPACE MODAL */}
      {showBrowserWorkspace && (
        <div className="fixed inset-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <BrowserWorkspace
            initialUrl={browserInitialUrl}
            onClose={() => setShowBrowserWorkspace(false)}
            language={language}
            agentTask={agentBrowserTask}
          />
        </div>
      )}

      {/* 10. TOOL CENTER MODAL */}
      <ToolCenterModal
        isOpen={showToolCenter}
        onClose={() => setShowToolCenter(false)}
        language={language}
      />
    </div>
  );
}
