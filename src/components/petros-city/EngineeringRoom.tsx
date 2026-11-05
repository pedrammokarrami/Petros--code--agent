import React, { useState, useEffect } from 'react';
import { Terminal as TerminalIcon, GitBranch, FolderTree, Play, ShieldAlert, Check, X, RefreshCw, FileCode, CheckCircle2 } from 'lucide-react';
import { FileExplorer } from '../FileExplorer';
import { TerminalPanel } from '../TerminalPanel';

interface Props {
  isFa?: boolean;
}

export function EngineeringRoom({ isFa = false }: Props) {
  const [activeTab, setActiveTab] = useState<'terminal' | 'files' | 'git'>('terminal');
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [gitDiff, setGitDiff] = useState<string>('');
  const [loadingGit, setLoadingGit] = useState<boolean>(false);

  // Command safety guard
  const [cmdInput, setCmdInput] = useState<string>('pytest tests/');
  const [pendingDangerousCmd, setPendingDangerousCmd] = useState<string | null>(null);
  const [cmdOutput, setCmdOutput] = useState<string>('Ready for engineering operations.');
  const [executing, setExecuting] = useState<boolean>(false);

  const fetchGitData = async () => {
    setLoadingGit(true);
    try {
      const [statusRes, diffRes] = await Promise.all([
        fetch('/api/git/status').then((r) => r.json()),
        fetch('/api/git/diff').then((r) => r.json()),
      ]);
      setGitStatus(statusRes);
      setGitDiff(diffRes.diff || 'No pending unstaged git changes.');
    } catch {
      setGitDiff('Git status unavailable or directory is not a git repo.');
    } finally {
      setLoadingGit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'git') {
      fetchGitData();
    }
  }, [activeTab]);

  const isDangerousCommand = (cmd: string): boolean => {
    const c = cmd.toLowerCase().trim();
    return (
      c.includes('rmdir /s') ||
      c.includes('del /f') ||
      c.includes('format') ||
      c.includes('taskkill') ||
      c.includes('rm -rf') ||
      c.includes(':(){ :|:& };:')
    );
  };

  const executeCommand = async (commandToRun: string) => {
    setExecuting(true);
    try {
      const res = await fetch('/api/terminal/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: commandToRun }),
      });
      const data = await res.json();
      setCmdOutput(data.output || (data.success ? 'Command finished successfully.' : `Error: ${data.error}`));
    } catch (err: any) {
      setCmdOutput(`Execution error: ${err?.message}`);
    } finally {
      setExecuting(false);
      setPendingDangerousCmd(null);
    }
  };

  const handleRunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmdInput.trim() || executing) return;

    if (isDangerousCommand(cmdInput)) {
      setPendingDangerousCmd(cmdInput);
      return;
    }
    executeCommand(cmdInput);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Room Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <TerminalIcon className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'اتاق مهندسی و کدنویسی (Engineering)' : 'Petros Engineering Room'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'محیط اجرای دستورات امن، مرورگر پرونده‌های محلی، و کنترل نسخه Git با سپرهای محافظتی'
              : 'Safe terminal execution, real local file tree, and Git version control with approval guards'}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'terminal' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            {isFa ? 'ترمینال امن' : 'Safe Terminal'}
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'files' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            {isFa ? 'مرورگر فایل' : 'File Explorer'}
          </button>
          <button
            onClick={() => setActiveTab('git')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'git' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            {isFa ? 'کنترل نسخه Git' : 'Git VCS'}
          </button>
        </div>
      </div>

      {/* Dangerous Command Approval Guard Modal */}
      {pendingDangerousCmd && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                {isFa ? 'هشدار امنیتی: تایید کاربر الزامی است' : 'Security Guard: Approval Required'}
              </p>
              <p className="text-xs text-amber-300 font-mono">
                Command: <span className="text-white">{pendingDangerousCmd}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => executeCommand(pendingDangerousCmd)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all cursor-pointer"
            >
              {isFa ? 'تایید و اجرا' : 'Approve & Run'}
            </button>
            <button
              onClick={() => setPendingDangerousCmd(null)}
              className="px-3 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              {isFa ? 'انصراف' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* View Content */}
      {activeTab === 'terminal' && (
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-4">
          <form onSubmit={handleRunSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-emerald-400 font-mono text-xs select-none">$</span>
              <input
                type="text"
                value={cmdInput}
                onChange={(e) => setCmdInput(e.target.value)}
                placeholder="Enter command (e.g. pytest tests/ or git status)..."
                className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-white focus:outline-none focus:border-[#4FB8FF]"
              />
            </div>
            <button
              type="submit"
              disabled={executing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-[#1F6FEB] hover:bg-[#4FB8FF] text-white disabled:opacity-40 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {executing ? (isFa ? 'در حال اجرا...' : 'Running...') : (isFa ? 'اجرا' : 'Execute')}
            </button>
          </form>

          {/* Terminal Console Output */}
          <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/80 font-mono text-xs">
            <div className="p-2.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                WORKSPACE: C:\Users\ELI\Desktop\petros
              </span>
              <span>Loopback Protected</span>
            </div>
            <pre className="p-4 text-emerald-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {cmdOutput}
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'files' && (
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-4">
          <p className="text-xs text-slate-400">
            {isFa
              ? 'محتوای پرونده‌های پروژه هدف (C:\\Users\\ELI\\Desktop\\petros)'
              : 'Target project workspace files (C:\\Users\\ELI\\Desktop\\petros)'}
          </p>
          <div className="h-[460px] overflow-hidden rounded-xl border border-slate-800 bg-black/50">
            <FileExplorer
              isOpen={true}
              onClose={() => {}}
              onSelectFileForContext={() => {}}
              embedded={true}
            />
          </div>
        </div>
      )}

      {activeTab === 'git' && (
        <div className="p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#4FB8FF]" />
              <span className="text-sm font-semibold text-white">Git Workspace Status</span>
            </div>
            <button
              onClick={fetchGitData}
              disabled={loadingGit}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingGit ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/80 font-mono text-xs">
            <div className="p-2.5 bg-slate-900/80 border-b border-slate-800 text-[11px] text-slate-400">
              Diff & Working Tree
            </div>
            <pre className="p-4 text-blue-200 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
              {gitDiff}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
