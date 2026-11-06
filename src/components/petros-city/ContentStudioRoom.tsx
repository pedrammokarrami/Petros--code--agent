import React, { useState } from 'react';
import {
  FileCode,
  Download,
  Eye,
  Sparkles,
  Copy,
  Check,
  FileText,
  Monitor,
  Tablet,
  Smartphone,
  Play,
  GitCommit,
  CheckCircle2,
  RefreshCw,
  FolderTree,
  ExternalLink,
  Code2,
} from 'lucide-react';

interface Props {
  isFa?: boolean;
}

interface ArtifactItem {
  id: string;
  name: string;
  type: string;
  size: string;
  category: 'code' | 'docs' | 'config';
  content: string;
  previewHtml?: string;
}

export function ContentStudioRoom({ isFa = false }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [deviceViewport, setDeviceViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [committing, setCommitting] = useState<boolean>(false);
  const [commitSuccess, setCommitSuccess] = useState<boolean>(false);
  const [compiling, setCompiling] = useState<boolean>(false);
  const [compileStatus, setCompileStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const sampleArtifacts: ArtifactItem[] = [
    {
      id: 'art-app',
      name: 'StartupLandingPage.tsx',
      type: 'React 19 Component',
      size: '5.8 KB',
      category: 'code',
      content: `import React, { useState } from 'react';\nimport { Sparkles, Shield, ArrowRight, Zap, CheckCircle2 } from 'lucide-react';\n\nexport default function StartupLandingPage() {\n  const [email, setEmail] = useState('');\n  const [joined, setJoined] = useState(false);\n\n  return (\n    <div className="min-h-screen bg-[#02040A] text-slate-100 p-8 flex flex-col justify-between font-sans">\n      <header className="flex justify-between items-center max-w-5xl mx-auto w-full">\n        <div className="flex items-center gap-2">\n          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold">P</div>\n          <span className="font-bold text-lg">Petros Startup</span>\n        </div>\n        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold">Launch App</button>\n      </header>\n      <main className="max-w-3xl mx-auto text-center space-y-6 my-16">\n        <h1 className="text-4xl sm:text-6xl font-black text-white">Autonomous AI Startup Operating System</h1>\n        <p className="text-slate-400 text-sm sm:text-base">Research, build, monetize, and automate your company through a coordinated multi-agent ecosystem.</p>\n      </main>\n    </div>\n  );\n}`,
      previewHtml: `
        <div style="background-color:#02040A; color:#E2E8F0; min-height:100vh; padding:40px 24px; font-family:sans-serif; box-sizing:border-box;">
          <header style="display:flex; justify-content:space-between; align-items:center; max-width:900px; margin:0 auto 60px auto;">
            <div style="display:flex; align-items:center; gap:10px;">
              <div style="width:34px; height:34px; border-radius:8px; background:linear-gradient(135deg, #1F6FEB, #4FB8FF); display:flex; align-items:center; justify-content:center; font-weight:bold; color:white;">P</div>
              <span style="font-weight:bold; font-size:18px; color:white;">Petros Autonomous Startup</span>
            </div>
            <button style="padding:8px 16px; border-radius:10px; background:#1F6FEB; color:white; border:none; font-weight:bold; font-size:12px; cursor:pointer;">Launch Platform</button>
          </header>
          <main style="max-w:750px; margin:0 auto; text-align:center;">
            <div style="display:inline-block; padding:4px 12px; border-radius:20px; background:rgba(31,111,235,0.15); border:1px solid rgba(79,184,255,0.3); color:#4FB8FF; font-size:11px; margin-bottom:20px; font-family:monospace;">AUTONOMOUS AI STARTUP OPERATING SYSTEM</div>
            <h1 style="font-size:42px; font-weight:900; color:white; line-height:1.2; margin:0 0 20px 0;">Build, Launch & Monetize in One Coherent World</h1>
            <p style="font-size:15px; color:#94A3B8; line-height:1.6; max-width:600px; margin:0 auto 35px auto;">Zero-cost local LLM execution, real Windows Worker code generation, visual workflow automation, and financial unit economics simulation.</p>
            <div style="display:flex; justify-content:center; gap:12px;">
              <button style="padding:12px 24px; border-radius:12px; background:#1F6FEB; color:white; border:none; font-weight:bold; font-size:13px; cursor:pointer;">Start with LAYA →</button>
              <button style="padding:12px 24px; border-radius:12px; background:rgba(255,255,255,0.05); color:#E2E8F0; border:1px solid rgba(255,255,255,0.15); font-weight:bold; font-size:13px; cursor:pointer;">Explore Workflows</button>
            </div>
          </main>
        </div>
      `,
    },
    {
      id: 'art-api',
      name: 'api_gateway_server.py',
      type: 'Python REST API',
      size: '3.4 KB',
      category: 'code',
      content: `from fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI(title="Petros Startup API Gateway", version="1.0.0")\n\nclass LeadModel(BaseModel):\n    name: str\n    email: str\n    company: str\n\n@app.get("/health")\ndef health_check():\n    return {"status": "ok", "zero_cost": True, "engine": "Ollama + Kilo Free"}\n\n@app.post("/leads")\ndef record_lead(lead: LeadModel):\n    return {"success": True, "lead_id": f"ld_{lead.name.lower()}", "status": "qualified"}\n`,
    },
    {
      id: 'art-docs',
      name: 'petros_architecture_report.md',
      type: 'Markdown Report',
      size: '4.2 KB',
      category: 'docs',
      content: `# Petros Ecosystem Architecture Report\n\n## 1. Overview\nPetros is a complete autonomous engineering & operations AI product designed for zero-cost operation on Windows.\n\n## 2. Infrastructure\n- Supervisor Router: 127.0.0.1:19847\n- MCP Bridge: 127.0.0.1:19848\n- Ollama Local Daemon: 127.0.0.1:11434 (qwen3:1.7b-omb-40k, qwen3:1.7b)\n- OpenMausBot: 127.0.0.1:8798\n\n## 3. Policy Guardrails\n- Zero paid external API keys consumed.\n- Freebuff strictly INTERACTIVE_ONLY.\n- Insecure default PIN (123456) strictly prohibited.`,
    },
    {
      id: 'art-spec',
      name: 'pitch_deck_executive_summary.json',
      type: 'JSON Data',
      size: '2.6 KB',
      category: 'config',
      content: `{\n  "startup": "Petros Autonomous Startup",\n  "problem": "Founders waste weeks stitching isolated dashboards and paying expensive cloud AI token subscriptions.",\n  "solution": "A unified Westworld-inspired digital world with LAYA central companion, local zero-cost AI engines, and automated business execution.",\n  "businessModel": "SaaS Tiered Subscription ($49 - $299/mo)",\n  "targetMarket": "120M+ Solo Founders, Indie Hackers, Software Agencies",\n  "moat": "Windows Job Object sandboxing, zero-cost local LLM routing, and autonomous agent squad collaboration."\n}`,
    },
  ];

  const activeArt = selectedArtifact || sampleArtifacts[0];
  const [activeCode, setActiveCode] = useState<string>(sampleArtifacts[0].content);
  const [activePreviewHtml, setActivePreviewHtml] = useState<string>(sampleArtifacts[0].previewHtml || '');

  const handleValidateAndCompile = async (codeToBuild: string) => {
    setCompiling(true);
    setCompileStatus(null);
    try {
      const res = await fetch('/api/app-factory/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToBuild, appName: activeArt.name }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.valid) {
          setActivePreviewHtml(data.previewHtml);
          setCompileStatus(data.repaired ? `🛠️ Repaired & Built in ${data.buildTimeMs}ms` : `⚡ ESBuild Validated (${data.buildTimeMs}ms)`);
        } else {
          setActivePreviewHtml(data.previewHtml);
          setCompileStatus(`⚠️ Build Failed: ${data.errors?.[0]?.message || 'Syntax Error'}`);
        }
      }
    } catch (err: any) {
      setCompileStatus(`Build error: ${err.message}`);
    } finally {
      setCompiling(false);
    }
  };

  const handleExportProject = async () => {
    setExporting(true);
    setExportSuccess(null);
    try {
      const appId = `petros-app-${Date.now().toString(36)}`;
      const res = await fetch('/api/app-factory/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, sourceCode: activeCode }),
      });
      const data = await res.json();
      if (data.success && data.exportPath) {
        setExportSuccess(`Exported to ${data.exportPath}`);
        setTimeout(() => setExportSuccess(null), 4000);
      }
    } catch (err: any) {
      setExportSuccess(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownload = (artifact: ArtifactItem) => {
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGitCommit = async () => {
    setCommitting(true);
    setCommitSuccess(false);
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `feat(app-factory): generate and commit ${activeArt.name}` }),
      });
      const data = await res.json();
      if (data.success) {
        setCommitSuccess(true);
        setTimeout(() => setCommitSuccess(false), 3000);
      }
    } catch {}
    finally {
      setCommitting(false);
    }
  };

  const getViewportWidth = () => {
    switch (deviceViewport) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'w-full';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'کارخانه اپلیکیشن و استودیو تولید (App Factory)' : 'Petros App Factory & Creative Suite'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'ساخت کامل وب‌سایت، پیش‌نمایش چنددستگاهی، خروجی ماژولار و مدیریت گیت با هوش مصنوعی'
              : 'Full-stack application generation, multi-device preview sandbox, and git commit integration'}
          </p>
        </div>

        {/* Viewport & View Mode Controls */}
        <div className="flex items-center gap-2">
          {/* Multi-Device Viewport Switcher */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDeviceViewport('desktop')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === 'desktop' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Desktop View"
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceViewport('tablet')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === 'tablet' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeviceViewport('mobile')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                deviceViewport === 'mobile' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Code vs Preview Toggle */}
          <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'preview' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isFa ? 'پیش‌نمایش' : 'Preview'}</span>
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'code' ? 'bg-[#1F6FEB] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>{isFa ? 'کد منبع' : 'Code'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Artifacts & Templates List */}
        <section className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isFa ? 'خروجی‌ها و قالب‌های برنامه' : 'App Factory Templates & Artifacts'}
          </h3>

          <div className="space-y-2">
            {sampleArtifacts.map((art) => {
              const isSel = activeArt.id === art.id;
              return (
                <div
                  key={art.id}
                  onClick={() => {
                    setSelectedArtifact(art);
                    setActiveCode(art.content);
                    if (art.previewHtml) setActivePreviewHtml(art.previewHtml);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    isSel
                      ? 'bg-[#1F6FEB]/20 border-[#4FB8FF] text-white shadow-md'
                      : 'bg-[#060D1A]/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FileCode className="w-4 h-4 text-[#4FB8FF] shrink-0" />
                    <div>
                      <p className="text-xs font-semibold truncate max-w-[140px]">{art.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{art.type}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">{art.size}</span>
                </div>
              );
            })}
          </div>

          {/* Direct Git Commit & Export Project Buttons */}
          <div className="pt-2 space-y-2">
            <button
              onClick={handleExportProject}
              disabled={exporting}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting Vite Project...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span className="text-emerald-200 truncate">{exportSuccess}</span>
                </>
              ) : (
                <>
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Export Full Vite Project</span>
                </>
              )}
            </button>

            <button
              onClick={handleGitCommit}
              disabled={committing}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {committing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#4FB8FF]" />
                  <span>Committing...</span>
                </>
              ) : commitSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Committed to Git!</span>
                </>
              ) : (
                <>
                  <GitCommit className="w-3.5 h-3.5 text-[#4FB8FF]" />
                  <span>Commit to Local Git</span>
                </>
              )}
            </button>
          </div>
        </section>

        {/* Multi-Device Sandbox Stage */}
        <section className="lg:col-span-3 rounded-2xl bg-[#060D1A]/90 border border-slate-800 p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white font-mono">{activeArt.name}</span>
              <span className="text-slate-500 font-mono text-[11px]">• {activeArt.type}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(activeArt.content)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={() => handleDownload(activeArt)}
                className="px-2.5 py-1 rounded-lg bg-[#1F6FEB] hover:bg-blue-600 text-[11px] text-white font-medium transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-blue-500/20"
              >
                <Download className="w-3 h-3" />
                <span>Download</span>
              </button>
            </div>
          </div>

          {/* ESBuild Live Compiler Status Bar */}
          {compileStatus && (
            <div className="px-3 py-1.5 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-cyan-300 flex items-center justify-between">
              <span>{compileStatus}</span>
              <span className="text-slate-500">Fast In-Memory Transpile</span>
            </div>
          )}

          {/* Sandbox Stage */}
          <div className="flex-1 flex flex-col items-center justify-center bg-slate-950/80 rounded-xl border border-slate-800/80 p-4 min-h-[460px] overflow-hidden">
            {viewMode === 'preview' ? (
              <div
                className={`transition-all duration-300 w-full h-[460px] rounded-lg overflow-hidden border border-slate-800 shadow-2xl ${getViewportWidth()}`}
              >
                <iframe
                  title="App Sandbox Preview"
                  srcDoc={activePreviewHtml || activeArt.previewHtml || '<div style="color:white;padding:20px;">Compiling...</div>'}
                  className="w-full h-full border-0 bg-black"
                  sandbox="allow-scripts"
                />
              </div>
            ) : (
              <div className="w-full h-[460px] flex flex-col space-y-2">
                <textarea
                  value={activeCode}
                  onChange={(e) => setActiveCode(e.target.value)}
                  className="w-full flex-1 p-4 text-xs font-mono text-slate-200 leading-relaxed bg-[#02040A] rounded-lg border border-slate-900 focus:outline-none focus:border-[#4FB8FF] resize-none select-text"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleValidateAndCompile(activeCode)}
                    disabled={compiling}
                    className="px-4 py-2 rounded-xl bg-[#1F6FEB] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    {compiling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>{compiling ? 'Compiling...' : 'Validate & Live Compile (ESBuild)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
