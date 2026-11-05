import React, { useState, useEffect } from 'react';
import {
  Server,
  Cpu,
  Shield,
  Activity,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Terminal,
  Bot,
  Zap,
  Lock,
  Globe,
  Database,
} from 'lucide-react';

interface Props {
  isFa?: boolean;
}

export function ControlCenterRoom({ isFa = false }: Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<any>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [mcpStatusData, setMcpStatusData] = useState<any>(null);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinResult, setPinResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/supervisor/status');
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (err: any) {
      console.warn('Failed to fetch supervisor status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStartEcosystem = async () => {
    setActionLoading(true);
    setActionMessage(isFa ? 'در حال راه‌اندازی روتر و بریج MCP با بایند لوپ‌بک...' : 'Starting Router & MCP Bridge with loopback binding...');
    try {
      const res = await fetch('/api/supervisor/start', { method: 'POST' });
      const data = await res.json();
      setActionMessage(data.message || (data.success ? 'Ecosystem Started' : 'Failed to start'));
      await fetchStatus();
    } catch (err: any) {
      setActionMessage(err?.message || 'Start failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopEcosystem = async () => {
    setActionLoading(true);
    setActionMessage(isFa ? 'در حال متوقف‌سازی امن سرویس‌های پتروس...' : 'Stopping Supervisor-owned services safely...');
    try {
      const res = await fetch('/api/supervisor/stop', { method: 'POST' });
      const data = await res.json();
      setActionMessage(data.message || (data.success ? 'Ecosystem Stopped' : 'Failed to stop'));
      await fetchStatus();
    } catch (err: any) {
      setActionMessage(err?.message || 'Stop failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunMcpStatus = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/mcp/status', { method: 'POST' });
      const data = await res.json();
      setMcpStatusData(data);
    } catch (err: any) {
      setMcpStatusData({ success: false, error: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinResult(null);
    try {
      const res = await fetch('/api/keys/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      setPinResult({
        success: data.valid || data.success,
        message: data.message || data.error || (data.valid ? 'PIN Valid' : 'PIN Invalid'),
      });
    } catch (err: any) {
      setPinResult({ success: false, message: err.message });
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Title & Quick Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[#4FB8FF]">
              <Server className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-semibold tracking-wide text-white">
              {isFa ? 'مرکز فرماندهی پتروس (Control Center)' : 'Petros Control Center'}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                status?.overallState === 'ONLINE'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : status?.overallState === 'DEGRADED'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
              }`}
            >
              {status?.overallState || 'CONNECTING...'}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {isFa
              ? 'مدیریت و نظارت بی‌درنگ بر روتر، پل ارتباطی MCP، سرویس Ollama و بات گرافیکی OpenMausBot'
              : 'Real-time telemetry and management for Router, MCP Bridge, Ollama daemon, and OpenMausBot'}
          </p>
        </div>

        {/* Start / Stop Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleStartEcosystem}
            disabled={actionLoading || status?.overallState === 'ONLINE'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[#1F6FEB] hover:bg-[#4FB8FF] text-white disabled:opacity-40 transition-all shadow-md shadow-blue-900/40 active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isFa ? 'راه‌اندازی سوپروایزر' : 'Start Ecosystem'}
          </button>
          <button
            onClick={handleStopEcosystem}
            disabled={actionLoading || status?.overallState === 'OFFLINE'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            {isFa ? 'توقف امن' : 'Stop Safe'}
          </button>
          <button
            onClick={fetchStatus}
            disabled={actionLoading}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#4FB8FF] animate-pulse" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* 4 Core Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Router Service */}
        <div className="p-4 rounded-xl bg-[#060D1A]/80 border border-[#4FB8FF]/15 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Server className="w-4 h-4 text-[#4FB8FF]" />
              <span>Petros Router</span>
            </div>
            {status?.services?.router?.online ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> 19847
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <XCircle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Host: 127.0.0.1 (Loopback)</p>
            <p>Latency: {status?.services?.router?.latencyMs ? `${status.services.router.latencyMs}ms` : '-'}</p>
            {status?.services?.router?.pid && <p>PID: {status.services.router.pid}</p>}
          </div>
        </div>

        {/* MCP Bridge */}
        <div className="p-4 rounded-xl bg-[#060D1A]/80 border border-[#4FB8FF]/15 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Cpu className="w-4 h-4 text-[#4FB8FF]" />
              <span>Petros MCP</span>
            </div>
            {status?.services?.mcp?.online ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> 19848
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <XCircle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Protocol: {status?.services?.mcp?.protocolVersion || '2024-11-05'}</p>
            <p>Discovered Tools: {status?.services?.mcp?.tools?.length || 0}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(status?.services?.mcp?.tools || []).map((t: string) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-[10px] text-blue-300 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Ollama Daemon */}
        <div className="p-4 rounded-xl bg-[#060D1A]/80 border border-[#4FB8FF]/15 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Bot className="w-4 h-4 text-[#4FB8FF]" />
              <span>Ollama Daemon</span>
            </div>
            {status?.services?.ollama?.online ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> 11434
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <XCircle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Status: Local GPU / CPU</p>
            <p>Models: {(status?.services?.ollama?.models || []).length}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {(status?.services?.ollama?.models || []).map((m: string) => (
                <span key={m} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 font-mono">
                  {m}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* OpenMausBot */}
        <div className="p-4 rounded-xl bg-[#060D1A]/80 border border-[#4FB8FF]/15 backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Globe className="w-4 h-4 text-[#4FB8FF]" />
              <span>OpenMausBot</span>
            </div>
            {status?.services?.mausbot?.online ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> 8798
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                <XCircle className="w-3.5 h-3.5" /> Offline
              </span>
            )}
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>Role: Visual Desktop Agent</p>
            <p>Endpoint: 127.0.0.1:8798</p>
            <a
              href="http://127.0.0.1:8798"
              target="_blank"
              rel="noreferrer"
              className="inline-block text-[#4FB8FF] hover:underline text-[11px] mt-1"
            >
              {isFa ? 'مشاهده رابط MausBot ↗' : 'Open MausBot Interface ↗'}
            </a>
          </div>
        </div>
      </div>

      {/* Engine Policy Matrix & Guardrails */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#4FB8FF]" />
            <h3 className="text-sm font-semibold text-white">
              {isFa ? 'ماتریس سیاست و هدایت موتورهای پتروس (Zero-Cost Guardrails)' : 'Engine Dispatch Policy & Zero-Cost Guardrails'}
            </h3>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
            0 External Paid Credits
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] uppercase bg-slate-900/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Engine</th>
                <th className="py-2.5 px-3">Role & Policy</th>
                <th className="py-2.5 px-3">State</th>
                <th className="py-2.5 px-3">Cost Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">ANUS CLI</td>
                <td className="py-2.5 px-3 text-slate-300">Primary preferred zero-cost autonomous execution engine</td>
                <td className="py-2.5 px-3 text-emerald-400 font-mono">CONFIGURED (v0.2.2)</td>
                <td className="py-2.5 px-3 text-emerald-300">ZERO-COST</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Kilo CLI</td>
                <td className="py-2.5 px-3 text-slate-300">Complex coding tasks with verified free model (kilo/kilo-auto/free)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-mono">CONFIGURED (v7.8.18)</td>
                <td className="py-2.5 px-3 text-emerald-300">ZERO-COST (Free Tier)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Ollama Daemon</td>
                <td className="py-2.5 px-3 text-slate-300">Local offline LLM (qwen3:1.7b-omb-40k, qwen3:1.7b)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-mono">DISPATCH_READY</td>
                <td className="py-2.5 px-3 text-emerald-300">ZERO-COST (100% Local)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-white">Pi CLI</td>
                <td className="py-2.5 px-3 text-slate-300">Interactive Windows pair-coding agent</td>
                <td className="py-2.5 px-3 text-amber-300 font-mono">INTERACTIVE_CODING</td>
                <td className="py-2.5 px-3 text-emerald-300">ZERO-COST</td>
              </tr>
              <tr className="bg-amber-950/20">
                <td className="py-2.5 px-3 font-semibold text-amber-300">Freebuff</td>
                <td className="py-2.5 px-3 text-amber-200">
                  <span className="font-semibold text-rose-300">[GUARDRAIL]</span> Automated dispatch permanently blocked. Human-interactive only.
                </td>
                <td className="py-2.5 px-3 text-amber-400 font-mono">INTERACTIVE_ONLY</td>
                <td className="py-2.5 px-3 text-emerald-300">ZERO-COST</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* MCP Read-Only Inspection & PIN Verification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MCP Status Tool Test */}
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#4FB8FF]" />
              <h4 className="text-sm font-semibold text-white">
                {isFa ? 'اجرای تست ابزار خواندنی MCP (petros_status)' : 'Read-Only MCP Tool Inspection'}
              </h4>
            </div>
            <button
              onClick={handleRunMcpStatus}
              disabled={actionLoading || !status?.services?.mcp?.online}
              className="px-3 py-1.5 rounded-lg text-xs bg-[#1F6FEB] hover:bg-[#4FB8FF] text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              {isFa ? 'اجرای petros_status' : 'Run petros_status'}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {isFa
              ? 'تست امن فراخوانی JSON-RPC پروتکل MCP به متد petros_status بدون ریسک اجرای دستورات مخرب.'
              : 'Executes the real MCP JSON-RPC petros_status tool against port 19848.'}
          </p>
          {mcpStatusData && (
            <pre className="p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-48">
              {JSON.stringify(mcpStatusData, null, 2)}
            </pre>
          )}
        </div>

        {/* PIN Security Audit */}
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#4FB8FF]" />
            <h4 className="text-sm font-semibold text-white">
              {isFa ? 'تست و ممیزی امنیتی پین دسترسی (PIN Audit)' : 'PIN Security Guardrail Audit'}
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            {isFa
              ? 'بررسی رد شدن قطعی پین پیش‌فرض ۱۲۳۴۵۶ و تایید پین اختصاصی نشست.'
              : 'Verifies strict rejection of insecure default PIN (123456) and acceptance of your configured PIN.'}
          </p>

          <form onSubmit={handleVerifyPin} className="flex gap-2">
            <input
              type="text"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Enter PIN to test (e.g. 123456)..."
              className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-[#4FB8FF]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer"
            >
              {isFa ? 'بررسی' : 'Verify'}
            </button>
          </form>

          {pinResult && (
            <div
              className={`p-2.5 rounded-lg text-xs border flex items-center gap-2 ${
                pinResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}
            >
              {pinResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{pinResult.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
