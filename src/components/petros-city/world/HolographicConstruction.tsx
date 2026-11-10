import React from 'react';

interface Props {
  title: string;
  progress: number;
  phase: string;
}

export function HolographicConstruction({ title, progress, phase }: Props) {
  const rows = Math.max(4, Math.min(12, Math.floor(progress / 8)));
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center overflow-hidden bg-[#02040a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(43,128,255,.16),transparent_58%)]" />
      <div className="relative w-[min(680px,90vw)] rounded-[28px] border border-sky-300/20 bg-slate-950/70 p-7 shadow-2xl shadow-sky-950/50 backdrop-blur-xl">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.28em] text-sky-300">Petros environment</p>
            <h1 className="text-2xl font-semibold tracking-tight">Constructing {title}</h1>
            <p className="mt-2 text-sm text-slate-400">{phase}</p>
          </div>
          <span className="font-mono text-sm text-sky-300">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-56 overflow-hidden rounded-2xl border border-sky-300/20 bg-slate-950">
          <div className="absolute inset-x-10 bottom-8 h-px bg-sky-300/70 shadow-[0_0_18px_#67b7ff]" />
          <div className="absolute inset-x-20 bottom-8 top-10 border border-sky-300/30" />
          <div className="absolute inset-x-28 bottom-8 top-20 border border-sky-300/20" />
          {Array.from({ length: rows }).map((_, index) => (
            <span
              key={index}
              className="absolute h-1.5 w-1.5 rounded-full bg-sky-200 shadow-[0_0_12px_#67b7ff]"
              style={{ left: `${12 + ((index * 17) % 76)}%`, top: `${18 + ((index * 23) % 62)}%`, opacity: .35 + progress / 150 }}
            />
          ))}
          <div className="absolute inset-x-0 top-0 h-px animate-[scan_2.4s_linear_infinite] bg-sky-300 shadow-[0_0_24px_#67b7ff]" />
        </div>
        <div className="mt-5 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-300 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );
}
