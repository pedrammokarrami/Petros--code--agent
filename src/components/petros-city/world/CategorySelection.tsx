import React from 'react';
import { Download, Sparkles } from 'lucide-react';
import { ENVIRONMENTS, type EnvironmentId } from './EnvironmentRegistry';

interface Props {
  selectedId?: EnvironmentId;
  cachedIds?: EnvironmentId[];
  onSelect: (id: EnvironmentId) => void;
}

export function CategorySelection({ selectedId, cachedIds = [], onSelect }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[.28em] text-sky-300">Enter your startup world</p>
          <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">Choose the environment where your idea will take shape.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-400">Each world has its own workstations, specialist agents, and visual language. You only download the environment you choose.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400"><Sparkles className="h-4 w-4 text-sky-300" /> 12 specialized environments</div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ENVIRONMENTS.map((environment) => {
          const Icon = environment.icon;
          const selected = selectedId === environment.id;
          const cached = cachedIds.includes(environment.id);
          return (
            <button key={environment.id} onClick={() => onSelect(environment.id)} className={`group relative overflow-hidden rounded-2xl border p-5 text-left transition duration-300 ${selected ? 'border-sky-300/70 bg-sky-400/10 shadow-[0_0_35px_rgba(79,160,255,.16)]' : 'border-white/10 bg-white/[.035] hover:border-white/25 hover:bg-white/[.07]'}`}>
              <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl transition group-hover:scale-150" style={{ background: environment.accent, opacity: .14 }} />
              <div className="relative flex items-start justify-between gap-4">
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[.07]" style={{ color: environment.accent }}><Icon className="h-5 w-5" /></div>
                {cached ? <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[10px] text-emerald-300">Ready</span> : <Download className="h-4 w-4 text-slate-500 transition group-hover:text-sky-300" />}
              </div>
              <h2 className="relative mt-5 text-base font-semibold text-white">{environment.title}</h2>
              <p className="relative mt-1 text-sm text-slate-400">{environment.subtitle}</p>
              <div className="relative mt-4 flex flex-wrap gap-1.5">{environment.features.slice(0, 3).map((feature) => <span key={feature} className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-400">{feature}</span>)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
