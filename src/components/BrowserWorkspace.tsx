import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  X,
  Plus,
  Bookmark,
  History,
  Download,
  Search,
  ExternalLink,
  Shield,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Bot,
  CheckCircle,
  AlertCircle,
  Layers,
  Settings
} from 'lucide-react';

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
}

interface Props {
  initialUrl?: string;
  onClose?: () => void;
  language?: string;
  agentTask?: {
    active: boolean;
    action?: string;
    targetUrl?: string;
  };
}

export function BrowserWorkspace({
  initialUrl = 'https://godotengine.org',
  onClose,
  language = 'fa',
  agentTask,
}: Props) {
  const isFa = language === 'fa';

  const defaultBookmarks = [
    { title: 'Godot Engine', url: 'https://godotengine.org' },
    { title: 'React Documentation', url: 'https://react.dev' },
    { title: 'Three.js Library', url: 'https://threejs.org' },
    { title: 'GitHub Open Source', url: 'https://github.com' },
    { title: 'DuckDuckGo Search', url: 'https://duckduckgo.com' },
  ];

  const [tabs, setTabs] = useState<BrowserTab[]>([
    {
      id: 'tab-1',
      title: 'Godot Engine',
      url: initialUrl,
      isLoading: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<Array<{ title: string; url: string; time: string }>>([
    { title: 'Godot Engine', url: initialUrl, time: new Date().toLocaleTimeString() },
  ]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [showDownloads, setShowDownloads] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState(defaultBookmarks);
  const [iframeKey, setIframeKey] = useState<number>(1);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    if (activeTab) {
      setInputUrl(activeTab.url);
    }
  }, [activeTabId, activeTab?.url]);

  // Handle URL navigation
  const navigateTo = (urlToLoad: string) => {
    let clean = urlToLoad.trim();
    if (!clean) return;

    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.includes('.') && !clean.includes(' ')) {
        clean = `https://${clean}`;
      } else {
        // Search query via DuckDuckGo
        clean = `https://duckduckgo.com/?q=${encodeURIComponent(clean)}`;
      }
    }

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, url: clean, title: clean.replace(/https?:\/\/(www\.)?/, '').split('/')[0], isLoading: true } : t
      )
    );

    setHistoryList((prev) => [{ title: clean, url: clean, time: new Date().toLocaleTimeString() }, ...prev]);
    setIframeKey((k) => k + 1);

    setTimeout(() => {
      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, isLoading: false } : t)));
    }, 1200);
  };

  const addTab = (url: string = 'https://duckduckgo.com') => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: 'New Tab',
      url,
      isLoading: false,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; // Keep at least one tab
    const nextTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(nextTabs);
    if (activeTabId === tabId) {
      setActiveTabId(nextTabs[0].id);
    }
  };

  return (
    <div
      className={`flex flex-col bg-[#070E1B] text-slate-200 border border-[#4FB8FF]/30 rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden transition-all duration-300 z-40 ${
        isFullScreen ? 'fixed inset-4 z-50' : 'h-full w-full'
      }`}
      dir="ltr"
    >
      {/* 1. AGENT ACTIVITY TELEMETRY BANNER (if active) */}
      {agentTask?.active && (
        <div className="bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 border-b border-blue-500/40 px-4 py-2 flex items-center justify-between text-xs text-blue-200 animate-pulse">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-white">
              {isFa ? 'عامل هوشمند پتروس در حال پژوهش وب:' : 'Petros Autonomous Agent Browsing:'}
            </span>
            <span className="text-cyan-300">{agentTask.action || 'Navigating documentation and extracting dependencies'}</span>
          </div>
          <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded-full border border-blue-400/40 text-blue-300">
            Playwright Core Active
          </span>
        </div>
      )}

      {/* 2. TAB STRIP */}
      <div className="flex items-center px-3 pt-2 bg-slate-950/80 border-b border-slate-800 gap-1 overflow-x-auto select-none">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-xl text-xs font-medium cursor-pointer transition max-w-[200px] border-t border-x ${
                isActive
                  ? 'bg-[#0B1528] text-white border-blue-500/40 shadow-md'
                  : 'bg-slate-900/40 text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="truncate">{tab.title}</span>
              {tabs.length > 1 && (
                <button
                  onClick={(e) => closeTab(tab.id, e)}
                  className="opacity-60 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}

        <button
          onClick={() => addTab()}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="New Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Workspace'}
          >
            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
              title="Close Browser"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. NAVIGATION & ADDRESS BAR */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#0B1528] border-b border-slate-800">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIframeKey((k) => k + 1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Reload"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Input */}
        <div className="flex-1 flex items-center gap-2 bg-slate-950/90 border border-slate-700/60 rounded-xl px-3 py-1.5 focus-within:border-blue-500/70 transition">
          <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigateTo(inputUrl)}
            placeholder={isFa ? 'نشانی وب‌سایت یا عبارت جستجو را وارد کنید...' : 'Enter URL or search query...'}
            className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none font-mono"
          />
          {activeTab.isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <button
              onClick={() => navigateTo(inputUrl)}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold px-1"
            >
              Go
            </button>
          )}
        </div>

        {/* Utility Actions */}
        <div className="flex items-center gap-1 text-slate-400">
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg transition ${showHistory ? 'text-blue-400 bg-blue-900/40' : 'hover:text-white hover:bg-slate-800'}`}
            title="Browsing History"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.open(activeTab.url, '_blank')}
            className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Open in System Browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. BOOKMARKS BAR */}
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/50 border-b border-slate-800/80 text-[11px] overflow-x-auto">
        <Bookmark className="w-3 h-3 text-amber-400 shrink-0" />
        {bookmarks.map((bm, i) => (
          <button
            key={i}
            onClick={() => navigateTo(bm.url)}
            className="px-2 py-0.5 rounded-md hover:bg-slate-800/80 text-slate-300 hover:text-white transition whitespace-nowrap"
          >
            {bm.title}
          </button>
        ))}
      </div>

      {/* 5. VIEWPORT CONTENT (Iframe with Scale/Zoom) */}
      <div className="relative flex-1 bg-slate-950 overflow-hidden flex flex-col">
        {activeTab.isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse z-10" />
        )}

        <iframe
          key={`${activeTab.id}-${iframeKey}`}
          src={activeTab.url}
          title={activeTab.title}
          className="w-full h-full border-none bg-white"
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top left',
            width: `${100 / (zoomLevel / 100)}%`,
            height: `${100 / (zoomLevel / 100)}%`,
          }}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        {/* 6. HISTORY DRAWER MODAL */}
        {showHistory && (
          <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#060D1A]/95 border-l border-slate-800 shadow-2xl p-4 flex flex-col z-20 backdrop-blur-xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-bold text-xs text-white flex items-center gap-2">
                <History className="w-4 h-4 text-blue-400" />
                {isFa ? 'تاریخچه وب‌گردی' : 'Browsing History'}
              </span>
              <button
                onClick={() => setHistoryList([])}
                className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
              >
                {isFa ? 'پاک‌سازی' : 'Clear'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 space-y-2">
              {historyList.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    navigateTo(item.url);
                    setShowHistory(false);
                  }}
                  className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition text-xs"
                >
                  <div className="font-medium text-slate-200 truncate">{item.title}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-1">
                    <span className="truncate max-w-[180px]">{item.url}</span>
                    <span className="text-[9px] text-slate-500">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 7. FOOTER STATUS BAR */}
      <div className="px-3 py-1 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Sandbox Active
          </span>
          <span>Zoom: {zoomLevel}%</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <span>WebView2 / Edge Shell</span>
          <span>•</span>
          <span>Petros Browser Engine</span>
        </div>
      </div>
    </div>
  );
}
