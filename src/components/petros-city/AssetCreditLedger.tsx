import React, { useMemo, useState } from 'react';
import { Scale, ExternalLink, ShieldCheck, X } from 'lucide-react';
import { PETROS_ROOMS, attributionSources } from '../../data/petrosBlueprint';

interface Props {
  isFa?: boolean;
}

/**
 * CC-BY / free-tier attribution ledger.
 *
 * PETROS ships only CC0 / public-domain assets in the default build, but CC-BY
 * repositories are available per room. This ledger is the legal surface: every
 * source that requires credit is listed with its licence and the rooms using it,
 * and it is reachable from the room chrome at all times.
 */
export function AssetCreditLedger({ isFa = false }: Props) {
  const [open, setOpen] = useState(false);
  const sources = useMemo(() => attributionSources(), []);
  const cleanSources = useMemo(
    () => PETROS_ROOMS.flatMap((room) => room.sources).filter((source) => !source.attributionRequired),
    [],
  );
  const uniqueClean = useMemo(
    () => Array.from(new Map(cleanSources.map((source) => [source.repository, source])).values()),
    [cleanSources],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/70 text-[11px] text-slate-300 hover:text-white hover:border-[#4FB8FF]/50 transition cursor-pointer"
        title={isFa ? 'دفتر اعتبارات دارایی‌های سه‌بعدی' : '3D asset attribution ledger'}
      >
        <Scale className="w-3.5 h-3.5 text-[#4FB8FF]" />
        <span>{isFa ? 'اعتبارات دارایی' : 'Asset credits'}</span>
        <span className="font-mono text-[10px] text-slate-500">{sources.length}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#02040A]/85 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-[#4FB8FF]/25 bg-[#050C18] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <div className="sticky top-0 flex items-start justify-between gap-4 p-5 border-b border-slate-800 bg-[#050C18]/95 backdrop-blur">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Scale className="w-4 h-4 text-[#4FB8FF]" />
                  {isFa ? 'اعتبارات و مجوز دارایی‌ها' : 'Asset attribution ledger'}
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isFa
                    ? 'هر منبع CC-BY که در ساخت اتاق‌ها استفاده می‌شود، به‌صورت خودکار اینجا فهرست می‌شود.'
                    : 'Every CC-BY source used while building rooms is listed here automatically from the registry.'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
                aria-label={isFa ? 'بستن' : 'Close'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <section>
                <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                  {isFa ? 'نیازمند ذکر منبع (CC-BY / رایگان مشروط)' : 'Credit required (CC-BY / conditional free)'}
                </h3>
                <ul className="space-y-2">
                  {sources.map((source) => (
                    <li
                      key={source.repository}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-slate-100 font-medium hover:text-[#4FB8FF] inline-flex items-center gap-1"
                        >
                          {source.repository}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
                          {source.license}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        {isFa ? 'اتاق‌ها: ' : 'Rooms: '}
                        {source.roomIds
                          .map((roomId) => PETROS_ROOMS.find((room) => room.id === roomId)?.name[isFa ? 'fa' : 'en'])
                          .filter(Boolean)
                          .join(isFa ? '، ' : ', ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isFa ? 'بدون نیاز به ذکر منبع' : 'No attribution required'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {uniqueClean.map((source) => (
                    <a
                      key={source.repository}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-600"
                    >
                      {source.repository} · <span className="font-mono text-emerald-300">{source.license}</span>
                    </a>
                  ))}
                </div>
              </section>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                {isFa
                  ? 'همه‌ی دارایی‌های پیش‌فرض با glTF Transform به Draco + KTX2 فشرده می‌شوند تا سقف ۵ مگابایت بار اولیه حفظ شود.'
                  : 'Every default asset is compressed with glTF Transform (Draco + KTX2) so the first-load budget stays under 5 MB.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AssetCreditLedger;
