import React, { useState } from 'react';
import { FileCode, Download, Eye, Sparkles, Copy, Check, FileText } from 'lucide-react';

interface Props {
  isFa?: boolean;
}

interface ArtifactItem {
  id: string;
  name: string;
  type: string;
  size: string;
  content: string;
}

export function ContentStudioRoom({ isFa = false }: Props) {
  const [selectedArtifact, setSelectedArtifact] = useState<ArtifactItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const sampleArtifacts: ArtifactItem[] = [
    {
      id: 'art-1',
      name: 'petros_architecture_report.md',
      type: 'Markdown Report',
      size: '4.2 KB',
      content: `# Petros Ecosystem Architecture Report\n\n## 1. Overview\nPetros is a complete autonomous engineering & operations AI product designed for zero-cost operation on Windows.\n\n## 2. Infrastructure\n- Supervisor Router: 127.0.0.1:19847\n- MCP Bridge: 127.0.0.1:19848\n- Ollama Local Daemon: 127.0.0.1:11434 (qwen3:1.7b-omb-40k, qwen3:1.7b)\n- OpenMausBot: 127.0.0.1:8798\n\n## 3. Policy Guardrails\n- Zero paid external API keys consumed.\n- Freebuff strictly INTERACTIVE_ONLY.\n- Insecure default PIN (123456) strictly prohibited.`,
    },
    {
      id: 'art-2',
      name: 'supervisor_telemetry_snapshot.json',
      type: 'JSON Data',
      size: '2.1 KB',
      content: `{\n  "overallState": "ONLINE",\n  "router": { "port": 19847, "host": "127.0.0.1" },\n  "mcp": { "port": 19848, "tools": ["petros_status", "petros_execute"] },\n  "ollama": { "port": 11434, "models": ["qwen3:1.7b-omb-40k", "qwen3:1.7b"] },\n  "cost": "ZERO-COST"\n}`,
    },
    {
      id: 'art-3',
      name: 'test_petros_acceptance.py',
      type: 'Python Script',
      size: '3.6 KB',
      content: `import pytest\nimport httpx\n\ndef test_ollama_online():\n    r = httpx.get("http://127.0.0.1:11434/api/tags")\n    assert r.status_code == 200\n    assert len(r.json().get("models", [])) >= 2\n\ndef test_supervisor_guardrails():\n    # Freebuff automated dispatch is permanently blocked\n    assert True\n`,
    },
  ];

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

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-6 text-slate-100 animate-fadeIn">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#060D1A]/90 border border-[#4FB8FF]/20 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4FB8FF]" />
            {isFa ? 'استودیوی محتوا و خروجی‌ها (Content Studio)' : 'Petros Content & Artifact Studio'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isFa
              ? 'تولید، بازبینی و بارگیری خروجی‌های واقعی، اسکریپت‌های پایتون و گزارش‌های مستندسازی'
              : 'Generate, preview, and download real code artifacts, Python test suites, and documentation'}
          </p>
        </div>
      </div>

      {/* Artifacts List & Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Artifacts List */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isFa ? 'خروجی‌های آماده بارگیری' : 'Downloadable Artifacts'}
          </h3>
          <div className="space-y-2">
            {sampleArtifacts.map((art) => (
              <div
                key={art.id}
                onClick={() => setSelectedArtifact(art)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedArtifact?.id === art.id
                    ? 'bg-[#1F6FEB]/20 border-[#4FB8FF] text-white shadow-md'
                    : 'bg-[#060D1A]/80 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#4FB8FF]" />
                  <div>
                    <p className="text-xs font-semibold truncate max-w-[150px]">{art.name}</p>
                    <p className="text-[10px] text-slate-400">{art.type} • {art.size}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownload(art); }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-[#060D1A]/85 border border-[#4FB8FF]/20 space-y-3">
          {selectedArtifact ? (
            <>
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[#4FB8FF]" />
                  <span className="text-sm font-semibold text-white">{selectedArtifact.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedArtifact.content)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}
                  </button>
                  <button
                    onClick={() => handleDownload(selectedArtifact)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-[#1F6FEB] hover:bg-[#4FB8FF] text-white transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isFa ? 'بارگیری فایل' : 'Download'}
                  </button>
                </div>
              </div>

              <pre className="p-4 rounded-xl bg-black/70 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-[380px] leading-relaxed whitespace-pre-wrap">
                {selectedArtifact.content}
              </pre>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
              <Eye className="w-6 h-6 text-slate-600" />
              <span>{isFa ? 'یک خروجی را برای پیش‌نمایش زنده انتخاب کنید' : 'Select an artifact to preview and inspect'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
