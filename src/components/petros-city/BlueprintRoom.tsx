import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Loader2,
  Package,
  Radio,
  Send,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  getRoom,
  getSpecialists,
  ROOM_CODES,
  type AgentSpec,
  type RoomId,
} from '../../data/petrosBlueprint';
import { FEED_PROBES, askFreeReasoning, callFeed } from '../../services/ai/domainFeeds';
import { feedQuota } from '../../services/ai/quotaGuard';
import { AssetCreditLedger } from './AssetCreditLedger';

interface Props {
  roomId: RoomId;
  isFa?: boolean;
}

interface Turn {
  id: string;
  role: 'user' | 'agent' | 'system';
  text: string;
}

type FeedStatus = { state: 'idle' | 'loading' | 'ok' | 'error'; message?: string };

/**
 * Registry-driven industry room.
 *
 * One component renders all twelve industry bays plus Sohrab's Treasury: the agent
 * roster, their stations, the prop manifest and the live zero-cost feed links all
 * come from `petrosBlueprint`, so shipping a room is a data change, not a new UI.
 */
export function BlueprintRoom({ roomId, isFa = false }: Props) {
  const room = useMemo(() => getRoom(roomId), [roomId]);
  const lead = room.agents[0];
  const specialists = useMemo(() => getSpecialists(room), [room]);

  const [activeAgentId, setActiveAgentId] = useState<string>(lead.id);
  const [input, setInput] = useState<string>('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [thinking, setThinking] = useState<boolean>(false);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [feedStatus, setFeedStatus] = useState<Record<string, FeedStatus>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const activeAgent: AgentSpec =
    room.agents.find((agent) => agent.id === activeAgentId) ?? lead;

  useEffect(() => {
    setActiveAgentId(lead.id);
    setTurns([]);
    setReasonError(null);
    setFeedStatus({});
  }, [roomId, lead.id]);

  useEffect(() => {
    const host = scrollRef.current;
    if (host) host.scrollTop = host.scrollHeight;
  }, [turns, thinking]);

  const label = (value: { en: string; fa: string }) => (isFa ? value.fa : value.en);

  const handleAsk = useCallback(async () => {
    const prompt = input.trim();
    if (!prompt || thinking) return;
    setInput('');
    setReasonError(null);
    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: prompt }]);
    setThinking(true);

    const system = [
      `You are ${label(activeAgent.role)} (${activeAgent.kind}) in the ${label(room.name)} room of PETROS City.`,
      `Room mandate: ${label(room.tagline)}.`,
      `You stand at: ${label(activeAgent.station)}. Attire: ${label(activeAgent.attire)}.`,
      `Allowed data feeds: ${room.feeds.map((feed) => feed.label).join(', ')}.`,
      'Answer as a specialist operator: concrete, short, no filler. If a number needs live data, say which feed to query.',
    ].join(' ');

    const result = await askFreeReasoning(prompt, { system });
    setThinking(false);

    if (result.ok && result.text) {
      setTurns((prev) => [...prev, { id: `a-${Date.now()}`, role: 'agent', text: result.text! }]);
    } else {
      setReasonError(result.error ?? 'Reasoning unavailable');
      setTurns((prev) => [
        ...prev,
        {
          id: `s-${Date.now()}`,
          role: 'system',
          text: isFa
            ? 'اتصال به موتور استدلال رایگان برقرار نشد؛ می‌توانید داده‌ی زنده‌ی فیدها را مستقیم از پنل پایین بپرسید.'
            : 'The free reasoning engine is unavailable right now; query the live feeds directly from the panel below.',
        },
      ]);
    }
  }, [activeAgent, input, isFa, label, room, thinking]);

  const runProbe = useCallback(async (feedId: string) => {
    const probe = FEED_PROBES[feedId];
    if (!probe) return;
    setFeedStatus((prev) => ({ ...prev, [feedId]: { state: 'loading' } }));
    const result = await callFeed(probe.path, { method: probe.method, body: probe.body });
    setFeedStatus((prev) => ({
      ...prev,
      [feedId]: result.ok
        ? { state: 'ok', message: probe.summarise(result.data) }
        : { state: 'error', message: result.error ?? 'Feed unavailable' },
    }));
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 space-y-5 text-slate-100 animate-fadeIn" dir={isFa ? 'rtl' : 'ltr'}>
      {/* Room identity */}
      <header className="p-5 rounded-2xl bg-[#060D1A]/90 border border-white/10 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center border font-mono text-[11px] font-bold"
              style={{ borderColor: `${room.accent}55`, color: room.accent, background: `${room.accent}12` }}
            >
              {ROOM_CODES[room.id]}
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white">{label(room.name)}</h2>
              <p className="text-xs text-slate-400 mt-1">{label(room.tagline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AssetCreditLedger isFa={isFa} />
            <span className="px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-700/70 text-[11px] font-mono text-slate-400">
              4 agents
            </span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-5">
        {/* Agent roster */}
        <section className="space-y-2.5">
          <h3 className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            {isFa ? 'گروه اتاق' : 'Room roster'}
          </h3>
          {room.agents.map((agent) => {
            const isActive = agent.id === activeAgent.id;
            return (
              <button
                key={agent.id}
                onClick={() => setActiveAgentId(agent.id)}
                className={`w-full text-start rounded-xl border p-3 transition cursor-pointer ${
                  isActive
                    ? 'bg-[#0A1628] border-[#4FB8FF]/45 shadow-lg shadow-blue-900/20'
                    : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    {agent.kind === 'lead' ? (
                      <Sparkles className="w-3.5 h-3.5" style={{ color: room.accent }} />
                    ) : (
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    {label(agent.role)}
                  </span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-400">
                    {agent.model}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {label(agent.station)} · {label(agent.attire)}
                </p>
              </button>
            );
          })}
        </section>

        {/* Conversation with the selected agent */}
        <section className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden min-h-[320px]">
          <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" style={{ color: room.accent }} />
              {label(activeAgent.role)}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {activeAgent.kind === 'lead' ? 'LEAD' : 'SPECIALIST'}
            </span>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3 space-y-2.5 max-h-64">
            {turns.length === 0 && (
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {isFa
                  ? 'این ایجنت روی داده‌ی زنده‌ی اتاق کار می‌کند. یک سؤال بپرس یا فید پایین را اجرا کن.'
                  : 'This agent works off the room’s live data. Ask a question, or run a feed below.'}
              </p>
            )}
            {turns.map((turn) => (
              <div
                key={turn.id}
                className={`text-[12px] leading-relaxed rounded-lg px-2.5 py-2 whitespace-pre-wrap ${
                  turn.role === 'user'
                    ? 'bg-[#12233D] text-slate-100'
                    : turn.role === 'system'
                    ? 'bg-amber-500/10 text-amber-200 border border-amber-500/25'
                    : 'bg-slate-800/60 text-slate-200'
                }`}
              >
                {turn.text}
              </div>
            ))}
            {thinking && (
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                {isFa ? 'در حال استدلال…' : 'Reasoning…'}
              </div>
            )}
          </div>

          {reasonError && (
            <div className="px-3.5 py-2 text-[11px] text-amber-300 bg-amber-950/20 border-t border-amber-500/20 flex items-center gap-1.5">
              <TriangleAlert className="w-3 h-3" />
              {reasonError}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleAsk();
            }}
            className="p-2.5 border-t border-slate-800 flex gap-2"
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isFa ? `از ${label(activeAgent.role)} بپرس…` : `Ask ${label(activeAgent.role)}…`}
              className="flex-1 bg-slate-950/70 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-[#4FB8FF]/50"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="px-3 rounded-lg bg-[#1F6FEB] hover:bg-[#2a7ff0] disabled:opacity-40 text-white transition cursor-pointer"
              aria-label={isFa ? 'ارسال' : 'Send'}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>
      </div>

      {/* Live zero-cost feeds */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
        <h3 className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          {isFa ? 'فیدهای زنده (رایگان)' : 'Live zero-cost feeds'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {room.feeds.map((feed) => {
            const probe = FEED_PROBES[feed.id];
            const status = feedStatus[feed.id] ?? { state: 'idle' as const };
            const quota = feedQuota.status(feed.id);
            return (
              <div key={feed.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-200">{feed.label}</span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {quota.limit === null ? '∞' : `${quota.used}/${quota.limit}`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{label(feed.description)}</p>
                {status.message && (
                  <p
                    className={`text-[11px] mt-1.5 flex items-start gap-1.5 ${
                      status.state === 'ok' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {status.state === 'ok' && <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" />}
                    {status.message}
                  </p>
                )}
                <button
                  onClick={() => runProbe(feed.id)}
                  disabled={!probe || status.state === 'loading'}
                  className="mt-2 text-[11px] px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 border border-slate-700 disabled:opacity-40 transition cursor-pointer"
                >
                  {status.state === 'loading'
                    ? isFa
                      ? 'در حال اجرا…'
                      : 'Running…'
                    : isFa
                    ? 'اجرای نمونه'
                    : 'Run probe'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Prop manifest */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h3 className="text-[11px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2.5">
          <Package className="w-3.5 h-3.5" />
          {isFa ? 'فهرست دارایی‌های سه‌بعدی اتاق' : 'Room asset manifest'}
        </h3>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {room.props.map((prop) => (
            <li key={prop.label.en} className="rounded-lg bg-slate-950/50 border border-slate-800 p-2.5">
              <p className="text-xs text-slate-200">{label(prop.label)}</p>
              <p className="font-mono text-[10px] text-slate-500 mt-1">{prop.keywords.join(' · ')}</p>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-slate-500 mt-2.5">
          {isFa ? 'مخازن: ' : 'Sources: '}
          {room.sources.map((source) => `${source.repository} (${source.license})`).join(isFa ? '، ' : ' · ')}
        </p>
      </section>
    </div>
  );
}

export default BlueprintRoom;
