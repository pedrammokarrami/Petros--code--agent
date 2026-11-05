import React, { useState } from 'react';
import { Search, GitBranch, Terminal, Shield, RefreshCw, FileCode, CheckCircle2, Star, ExternalLink, Activity } from 'lucide-react';

interface Props {
  isFa?: boolean;
}

export function LaboratoryRoom({ isFa = false }: Props) {
  const [query, setQuery] = useState<string>('modelcontextprotocol');
  const [searching, setSearching] = useState<boolean>(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'research' | 'skills' | 'diagnostics'>('research');
  const [diagOutput, setDiagOutput] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/research/github?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        // Fallback default vetted repositories
        setResults([
          {
            full_name: 'modelcontextprotocol/servers',
            description: 'Model Context Protocol reference servers and toolkits',
            stars: 12450,
            license: 'MIT',
            url: 'https://github.com/modelcontextprotocol/servers',
          },
          {
            full_name: 'pedrammokarrami/Petros--code--agent',
            description: 'Petros Autonomous Engineering & Operations AI Ecosystem',
            stars: 380,
            license: 'MIT',
            url: 'https://github.com/pedrammokarrami/Petros--code--agent',
          },
          {
            full_name: 'punkpeye/awesome-mcp-servers',
            description: 'Curated list of Model Context Protocol servers',
            stars: 6200,
            license: 'CC0-1.0',
            url: 'https://github.com/punkpeye/awesome-mcp-servers',
          },
        ]);
      }
    } catch {
      setResults([
        {
          full_name: 'modelcontextprotocol/servers',
          description: 'Model Context Protocol reference servers and toolkits',
          stars: 12450,
          license: 'MIT',
          url: 'https://github.com/modelcontextprotocol/servers',
        },
      ]);
    } finally {
      setSearching(false);
    }
  };

  const runDiagnostics = async () => {
    setSearching(true);
    try {
      const res = await fetch('/api/supervisor/status');
      const data = await res.json();
      setDiagOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setDiagOutput(`Diagnostic check failed: ${err?.message}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'آزمایشگاه پژوهش و عیب‌یابی (Laboratory)' : 'Petros Laboratory & Research'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'موتور پژوهش منبع‌باز گیت‌هاب، بازرسی مخازن مجاز و آزمون‌های تشخیصی زیست‌بوم'
              : 'Open-source GitHub intelligence, allowlisted docs research, and ecosystem telemetry diagnostics'}
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('research')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'research' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isFa ? 'پژوهش گیت‌هاب' : 'GitHub Research'}
          </button>
          <button
            onClick={() => { setActiveTab('diagnostics'); runDiagnostics(); }}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'diagnostics' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {isFa ? 'عیب‌یابی سیستمی' : 'System Diagnostics'}
          </button>
        </div>
      </div>

      {activeTab === 'research' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isFa ? 'جستجوی مخازن یا ابزارهای MCP...' : 'Search MCP servers, agent tools, or GitHub repositories...'}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#060D1A]/90 border border-slate-800 text-xs text-white focus:outline-none focus:border-[#4FB8FF]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-5 py-2.5 rounded-xl text-xs font-medium bg-[#1F6FEB] hover:bg-[#4FB8FF] text-white disabled:opacity-50 transition-all cursor-pointer"
            >
              {searching ? (isFa ? 'در حال جستجو...' : 'Searching...') : (isFa ? 'جستجو' : 'Search')}
            </button>
          </form>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((r, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[#060D1A]/80 border border-[#4FB8FF]/15 hover:border-[#4FB8FF]/40 transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-[#4FB8FF]" />
                    {r.full_name}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-amber-300">
                      <Star className="w-3.5 h-3.5 fill-current" /> {r.stars || 0}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                      {r.license || 'Open'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{r.description}</p>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#4FB8FF] hover:underline"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#4FB8FF]" />
              {isFa ? 'خروجی زنده آزمون تشخیصی زیست‌بوم' : 'Ecosystem Live Diagnostic Telemetry'}
            </h4>
            <button
              onClick={runDiagnostics}
              disabled={searching}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
              {isFa ? 'بروزرسانی' : 'Rerun'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-black/70 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[460px]">
            {diagOutput || 'Running diagnostic audit...'}
          </pre>
        </div>
      )}
    </div>
  );
}
