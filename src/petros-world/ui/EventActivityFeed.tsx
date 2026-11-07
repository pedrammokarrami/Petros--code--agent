/**
 * Petros Event Activity Feed
 * Unobtrusive glassmorphic real-time stream displaying verified business actions and agent activity.
 */

import React, { useEffect, useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
import { BusinessEvent } from '../events/eventTypes';
import { BusinessEventGateway } from '../events/BusinessEventGateway';

interface Props {
  language: string;
}

export const EventActivityFeed: React.FC<Props> = ({ language }) => {
  const isFa = language === 'fa';
  const [events, setEvents] = useState<BusinessEvent[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const gateway = BusinessEventGateway.getInstance();
    setEvents(gateway.getRecentEvents(8));

    const unsubscribe = gateway.subscribe((newEvent) => {
      setEvents((prev) => [newEvent, ...prev.slice(0, 15)]);
    });

    return unsubscribe;
  }, []);

  if (events.length === 0) return null;

  const latest = events[0];

  const getDomainColor = (domain: string) => {
    switch (domain) {
      case 'agency':
        return '#8b5cf6';
      case 'commerce':
        return '#f59e0b';
      case 'content':
        return '#ec4899';
      case 'research':
        return '#06b6d4';
      default:
        return '#3b82f6';
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-20 max-w-sm pointer-events-auto">
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 backdrop-blur-xl shadow-2xl p-3 transition-all duration-300">
        {/* Header summary */}
        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between gap-3 cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400" />
            </div>
            <span className="text-xs font-semibold text-white tracking-wide">
              {isFa ? 'رویدادهای زنده سیستم' : 'Live Operations Feed'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
              {events.length}
            </span>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Latest event preview when collapsed */}
        {!isExpanded && latest && (
          <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2 text-xs">
            <span
              className="w-2 h-2 rounded-full mt-1.5 shrink-0"
              style={{ backgroundColor: getDomainColor(latest.domain) }}
            />
            <div className="overflow-hidden">
              <p className="font-medium text-slate-200 truncate">{latest.title}</p>
              <p className="text-[11px] text-slate-400 truncate">{latest.description}</p>
            </div>
          </div>
        )}

        {/* Full event list when expanded */}
        {isExpanded && (
          <div className="mt-3 pt-2 border-t border-white/5 space-y-2 max-h-60 overflow-y-auto pr-1">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2 text-xs"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: getDomainColor(evt.domain) }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-100">{evt.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">{evt.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
