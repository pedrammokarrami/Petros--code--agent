import React, { useState, useEffect } from 'react';
import {
  Workflow,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Zap,
  Terminal,
  Shield,
  FileCode,
  ChevronRight,
  Database,
  Mail,
  Send,
} from 'lucide-react';

interface Props {
  isFa?: boolean;
}

export function PetrosFlowRoom({ isFa = false }: Props) {
  const [flows, setFlows] = useState<any[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState<string>('flow-startup-onboarding');
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchFlows = async () => {
    try {
      const res = await fetch('/api/flow/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.flows)) {
        setFlows(data.flows);
      }
    } catch {}
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/flow/logs');
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch {}
  };

  useEffect(() => {
    fetchFlows();
    fetchLogs();
  }, []);

  const currentFlow = flows.find((f) => f.id === selectedFlowId) || flows[0];

  const handleRunFlow = async () => {
    if (executing || !currentFlow) return;
    setExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch('/api/flow/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flowId: currentFlow.id }),
      });
      const data = await res.json();
      if (data.success) {
        setExecutionResult(data.result);
        fetchFlows();
        fetchLogs();
      }
    } catch (err: any) {
      setExecutionResult({ error: err?.message });
    } finally {
      setExecuting(false);
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'trigger':
        return Zap;
      case 'agent':
        return Sparkles;
      case 'action':
        return Terminal;
      case 'approval':
        return Shield;
      case 'condition':
        return Layers;
      default:
        return Workflow;
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'جریان‌های خودکار پتروس (Petros Flow)' : 'Petros Flow • Visual Agent Automations'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'سازنده بصری گردش‌کار نود-محور مبتنی بر ایجنت‌ها، رویدادها، شرایط و درگاه‌های تایید انسانی'
              : 'Agent-first visual node automations with triggers, condition branches, and human approval gates'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRunFlow}
            disabled={executing}
            className="px-4 py-2 rounded-xl bg-[#1F6FEB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
          >
            {executing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{isFa ? 'در حال اجرای جریان...' : 'Running Flow...'}</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{isFa ? 'اجرای خودکار جریان' : 'Execute Flow'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Flow Selection Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1">
        {flows.map((f) => {
          const isSel = selectedFlowId === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setSelectedFlowId(f.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 border ${
                isSel
                  ? 'bg-[#1F6FEB]/20 border-[#4FB8FF] text-white shadow-md'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-[#4FB8FF]" />
              <span>{f.name}</span>
            </button>
          );
        })}
      </div>

      {/* Visual Flow Canvas Area */}
      {currentFlow && (
        <section className="p-6 rounded-2xl bg-[#060D1A]/90 border border-slate-800 space-y-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">{currentFlow.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{currentFlow.description}</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              ACTIVE & ENABLED
            </span>
          </div>

          {/* Sequential Node Flow Chain */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 overflow-x-auto py-4">
            {currentFlow.nodes.map((node: any, idx: number) => {
              const Icon = getNodeIcon(node.type);
              const isLast = idx === currentFlow.nodes.length - 1;

              return (
                <React.Fragment key={node.id}>
                  {/* Node Block */}
                  <div
                    className={`w-full lg:w-56 shrink-0 p-4 rounded-2xl border transition-all relative ${
                      node.status === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200 shadow-lg shadow-emerald-950/30'
                        : node.status === 'waiting_approval'
                        ? 'bg-amber-950/30 border-amber-500/50 text-amber-200 animate-pulse'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0A2E66] to-[#1F6FEB] flex items-center justify-center text-white shadow-md">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          node.status === 'success'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : node.status === 'waiting_approval'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {node.type}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white truncate">{node.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {node.description}
                    </p>

                    <div className="pt-2.5 mt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-500">{node.id}</span>
                      <span
                        className={
                          node.status === 'success'
                            ? 'text-emerald-400'
                            : node.status === 'waiting_approval'
                            ? 'text-amber-400 font-bold'
                            : 'text-slate-500'
                        }
                      >
                        {node.status === 'success' ? '✓ DONE' : node.status === 'waiting_approval' ? '⏸ APPROVAL' : 'IDLE'}
                      </span>
                    </div>
                  </div>

                  {/* Flow Connector Arrow */}
                  {!isLast && (
                    <div className="hidden lg:flex items-center justify-center shrink-0 text-slate-600">
                      <ArrowRight className="w-5 h-5 text-[#4FB8FF]/40" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Execution Result Log Box */}
          {executionResult && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-fadeIn text-xs">
              <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 border-b border-slate-800 pb-2">
                <span>FLOW EXECUTION COMPLETE: {executionResult.id}</span>
                <span>STATUS: {executionResult.status}</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {executionResult.executedSteps?.map((step: any, i: number) => (
                  <div key={i} className="flex items-center justify-between font-mono text-[11px] text-slate-300">
                    <span>
                      ✓ {step.title} ({step.nodeId})
                    </span>
                    <span className="text-slate-500">{step.durationMs}ms</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Execution Logs Drawer */}
      <section className="p-5 rounded-2xl bg-[#060D1A]/90 border border-slate-800 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4FB8FF]" />
            {isFa ? 'گزارش‌های اجرای گردش‌کار (Audit History)' : 'Automation Execution History'}
          </span>
          <span className="text-slate-500 font-mono">{logs.length} runs recorded</span>
        </div>

        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">No recent flow runs.</p>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">{log.flowId}</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{log.startedAt}</p>
                  </div>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
                  {log.status}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
