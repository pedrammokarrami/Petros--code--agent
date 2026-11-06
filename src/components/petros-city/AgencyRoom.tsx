import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Cpu,
  Shield,
  Play,
  CheckCircle2,
  Clock,
  Terminal,
  Send,
  RefreshCw,
  FolderTree,
  AlertTriangle,
  Flame,
  FileCode,
  Users,
} from 'lucide-react';

interface Props {
  isFa?: boolean;
}

interface AgentCard {
  id: string;
  name: string;
  titleFa: string;
  role: string;
  engine: string;
  status: 'ONLINE' | 'STANDBY';
  cost: string;
  icon: any;
  capabilities: string[];
}

export function AgencyRoom({ isFa = false }: Props) {
  const [selectedAgent, setSelectedAgent] = useState<string>('engineer');
  const [taskPrompt, setTaskPrompt] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const [tasksList, setTasksList] = useState<any[]>([]);

  const agents: AgentCard[] = [
    {
      id: 'engineer',
      name: 'Software Engineer Agent',
      titleFa: 'ایجنت مهندسی نرم‌افزار',
      role: 'Full-stack code development, tests, and debugging',
      engine: 'Petros Windows Worker (Kilo Free Tier)',
      status: 'ONLINE',
      cost: 'ZERO-COST',
      icon: Terminal,
      capabilities: ['Python / TypeScript MVP', 'Unit test generation', 'Safe terminal execution', 'Approval-guarded commits'],
    },
    {
      id: 'strategy',
      name: 'Executive Strategy Agent',
      titleFa: 'ایجنت استراتژی و معمار کسب‌وکار',
      role: 'Business model design, unit economics, pitch deck',
      engine: 'Ollama Local LLM',
      status: 'ONLINE',
      cost: 'ZERO-COST',
      icon: Layers,
      capabilities: ['Lean Canvas generation', 'TAM / SAM / SOM analysis', 'Monetization strategy', 'Competitive defensibility'],
    },
    {
      id: 'growth',
      name: 'Growth & Marketing Agent',
      titleFa: 'ایجنت رشد و بازاریابی',
      role: 'Audience acquisition, launch campaigns, copywriting',
      engine: 'Ollama Local LLM',
      status: 'ONLINE',
      cost: 'ZERO-COST',
      icon: Sparkles,
      capabilities: ['Landing page copy', 'SEO content clusters', 'Viral launch campaigns', 'Customer personas'],
    },
    {
      id: 'support',
      name: 'Customer Operations Agent',
      titleFa: 'ایجنت پشتیبانی و عملیات',
      role: 'Onboarding flows, FAQ knowledge bases, user retention',
      engine: 'OpenMausBot Visual Agent',
      status: 'ONLINE',
      cost: 'ZERO-COST',
      icon: Users,
      capabilities: ['Interactive onboarding guide', 'Automated support triage', 'Documentation generator', 'User journey mapping'],
    },
  ];

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasksList(data.tasks);
      }
    } catch {}
  };

  useEffect(() => {
    fetchTasks();
    const timer = setInterval(fetchTasks, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskPrompt.trim() || executing) return;

    if (selectedAgent === 'engineer') {
      // High-privilege execution requires explicit user confirmation modal
      setPendingApproval(taskPrompt);
    } else {
      runAgentTask(taskPrompt, 'ANALYZE');
    }
  };

  const runAgentTask = async (prompt: string, confirmMode: string = 'RUN') => {
    setExecuting(true);
    setExecutionOutput(null);
    setPendingApproval(null);

    try {
      if (selectedAgent === 'engineer') {
        // Dispatches to Windows Worker via /api/supervisor/execute or fallback to terminal runner
        let res = await fetch('/api/supervisor/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            task: `[engine:kilo] ${prompt}`,
            confirm: confirmMode,
          }),
        });
        if (res.status === 404) {
          res = await fetch('/api/terminal/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: `kilo run --auto --format json --dir . --model kilo/kilo-auto/free "${prompt.replace(/"/g, '\\"')}"`,
            }),
          });
        }
        const data = await res.json();
        if (data.success) {
          const out = data.stdout || data.output || (typeof data.data === 'object' ? JSON.stringify(data.data, null, 2) : String(data.data));
          setExecutionOutput(out || 'Task completed successfully by Windows Worker.');
        } else {
          setExecutionOutput(`Execution error: ${data.error || 'Worker rejected task'}`);
        }
      } else {
        // Dispatches to conversational agent via /api/agent/chat
        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        setExecutionOutput(data.reply || data.output || 'Task analyzed and returned.');
      }
      fetchTasks();
    } catch (err: any) {
      setExecutionOutput(`Network or dispatch error: ${err?.message}`);
    } finally {
      setExecuting(false);
    }
  };

  const currentAgent = agents.find((a) => a.id === selectedAgent) || agents[0];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'آژانس هوشمند و تیم‌های ایجنت (Agency)' : 'Petros AI Agency & Agent Squads'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'سپردن ماموریت‌های استارتاپی به ایجنت‌های تخصصی: استراتژی، بازاریابی، کدنویسی و عملیات'
              : 'Delegate startup missions to autonomous specialized agents with guarded approval workflows'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            4 AGENTS READY
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-mono">
            ZERO-COST TIER
          </span>
        </div>
      </div>

      {/* Dangerous Task Approval Modal */}
      {pendingApproval && (
        <div className="p-4 rounded-2xl bg-amber-950/70 border border-amber-500/60 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn shadow-2xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                {isFa ? 'تایید امنیتی اجرای کد الزامی است' : 'Security Guard: Worker Execution Approval'}
              </p>
              <p className="text-xs text-amber-300 font-mono">
                Task: <span className="text-white">{pendingApproval}</span>
              </p>
              <p className="text-[11px] text-amber-400/80">
                {isFa
                  ? 'این دستور توسط ورکر ویندوز پتروس و مدل Kilo رایگان اجرا خواهد شد.'
                  : 'This task will execute on the local Windows Worker via verified free Kilo.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => runAgentTask(pendingApproval, 'RUN')}
              className="px-4 py-2 rounded-xl text-xs bg-amber-500 hover:bg-amber-400 text-black font-bold transition-all cursor-pointer shadow-md shadow-amber-500/20"
            >
              {isFa ? 'تایید و اجرای زنده (RUN)' : 'Approve & Execute (RUN)'}
            </button>
            <button
              onClick={() => setPendingApproval(null)}
              className="px-3 py-2 rounded-xl text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Agent Squad Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents.map((ag) => {
          const Icon = ag.icon;
          const isSel = selectedAgent === ag.id;
          return (
            <div
              key={ag.id}
              onClick={() => setSelectedAgent(ag.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                isSel
                  ? 'bg-[#1F6FEB]/15 border-[#4FB8FF] text-white shadow-xl shadow-blue-900/20'
                  : 'bg-[#060D1A]/80 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0A2E66] to-[#1F6FEB] flex items-center justify-center text-white shadow-md">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {ag.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">{isFa ? ag.titleFa : ag.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{ag.role}</p>
              </div>
              <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono text-[#4FB8FF] flex items-center justify-between">
                <span>{ag.cost}</span>
                <span className="text-slate-500">{ag.engine.split(' ')[0]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mission Dispatch Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#4FB8FF]" />
              {isFa ? `کنسول اعزام ماموریت به: ${currentAgent.titleFa}` : `Mission Dispatch Console: ${currentAgent.name}`}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">{currentAgent.engine}</span>
          </div>

          {/* Capabilities Badges */}
          <div className="flex flex-wrap gap-1.5">
            {currentAgent.capabilities.map((c, i) => (
              <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                ✓ {c}
              </span>
            ))}
          </div>

          {/* Task Form */}
          <form onSubmit={handleDispatch} className="space-y-3 pt-2">
            <textarea
              rows={3}
              value={taskPrompt}
              onChange={(e) => setTaskPrompt(e.target.value)}
              placeholder={
                isFa
                  ? `دستور یا وظیفه را برای ${currentAgent.titleFa} بنویسید (مثلاً: یک ساختار ماژولار پایتون برای محاسبات سود پیاده کن)...`
                  : `Enter the objective for ${currentAgent.name} (e.g., "Create a modular Python calculator for MRR and churn in test directory")...`
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-[#4FB8FF] rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-all resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                {selectedAgent === 'engineer' ? '⚠️ Requires explicit RUN confirmation' : '⚡ Autonomous analysis'}
              </span>
              <button
                type="submit"
                disabled={!taskPrompt.trim() || executing}
                className="px-5 py-2.5 rounded-xl bg-[#1F6FEB] hover:bg-blue-600 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
              >
                {executing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{isFa ? 'در حال اجرا...' : 'Dispatching...'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isFa ? 'اعزام ایجنت' : 'Dispatch Agent'}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Execution Output Stream */}
          {executionOutput && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-[11px] text-emerald-400 border-b border-slate-800/80 pb-1.5">
                <span>EXECUTION OUTPUT</span>
                <span>STATUS: 200 OK</span>
              </div>
              <pre className="whitespace-pre-wrap overflow-x-auto max-h-64 leading-relaxed">
                {executionOutput}
              </pre>
            </div>
          )}
        </section>

        {/* Real Task History Timeline */}
        <section className="rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4FB8FF]" />
              {isFa ? 'تاریخچه ماموریت‌های فعال' : 'Active Missions Timeline'}
            </h3>
            <span className="text-xs font-mono text-slate-400">{tasksList.length} total</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {tasksList.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                {isFa ? 'ماموریتی در صف وجود ندارد.' : 'No active tasks in queue.'}
              </p>
            ) : (
              tasksList.map((t, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-white truncate max-w-[150px]">
                      {t.prompt || t.id}
                    </span>
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                        t.status === 'completed' || t.status === 'done'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-blue-500/10 text-blue-400'
                      }`}
                    >
                      {t.status || 'READY'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Mode: {t.mode || 'agent'}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
