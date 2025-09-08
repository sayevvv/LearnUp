"use client";
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

type Aggregate = {
  avg: number;
  count: number;
  histogram: number[];
  saves: number;
};

export default function RatingSummary({ roadmapId, canRate }: { roadmapId: string; canRate: boolean }) {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  const [my, setMy] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  useEffect(() => { setMounted(true); }, []);

  async function load() {
    const d = await fetch(`/api/roadmaps/${roadmapId}/rating`, { cache: 'no-store' }).then(r => r.json());
    setAgg(d?.aggregate || { avg: 0, count: 0, histogram: [0,0,0,0,0], saves: 0, forks: 0 });
    setMy(d?.myRating?.stars ?? null);
  }

  useEffect(() => { load(); }, [roadmapId]);

  async function rate(stars: number) {
    if (!canRate || busy) return;
    setBusy(true);
    // Optimistic update so header reflects immediately
    setAgg(prev => {
      const prevAvg = prev?.avg ?? 0;
      const prevCount = prev?.count ?? 0;
      const prevHist = prev?.histogram ?? [0,0,0,0,0];
      const hadPrev = typeof my === 'number' && my > 0;
      const oldSum = prevAvg * prevCount;
      let newCount = prevCount;
      let newSum = oldSum;
      const newHist = [...prevHist];
      if (hadPrev) {
        // adjust histogram and sum
        if (my && newHist[my-1] > 0) newHist[my-1] -= 1;
        newSum -= (my || 0);
      } else {
        newCount += 1;
      }
      newSum += stars;
      newHist[stars-1] = (newHist[stars-1] ?? 0) + 1;
      const newAvg = newCount > 0 ? newSum / newCount : 0;
      return { avg: newAvg, count: newCount, histogram: newHist, saves: prev?.saves ?? 0 };
    });
    setMy(stars);
    const res = await fetch(`/api/roadmaps/${roadmapId}/rating`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stars }) });
    setBusy(false);
    if (res.ok) {
      // Re-sync with backend to be safe
      load();
    }
  }

  const avg = agg?.avg ?? 0;
  const count = agg?.count ?? 0;
  const saves = agg?.saves ?? 0;
  const display = my ?? Math.round(avg);
  const activeStars = hover || selected || display;

  // When opening the modal, initialize selection to current rating
  useEffect(() => {
    if (open) {
      setSelected(my || 0);
      setHover(0);
    }
  }, [open, my]);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-sm hover:bg-slate-50 dark:border-[#2a2a2a] dark:hover:bg-[#1a1a1a]"
        title={canRate ? 'Beri Rating' : 'Lihat Rating'}
      >
        <span className="text-yellow-500">★</span>
        <span className="text-slate-700 text-sm">{avg.toFixed(1)} ({count})</span>
      </button>
      {/* Saves only (removed forks UI) */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span title="Disimpan" className="inline-flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M6 2.25A2.25 2.25 0 003.75 4.5v15.75A1.5 1.5 0 006.136 21.6l5.864-3.518 5.864 3.518A1.5 1.5 0 0020.25 20.25V4.5A2.25 2.25 0 0018 2.25H6z"/></svg>
          {saves}
        </span>
      </div>

      {open && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-[min(500px,92vw)] rounded-2xl bg-white/90 dark:bg-[#0b0b0b]/90 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd"/></svg>
            </button>
            <div className="px-6 pt-8 pb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Beri Rating</h3>
                <p className="mt-1 text-xs text-slate-500">Rata-rata {avg.toFixed(1)} dari {count} rating</p>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <button
                    key={i}
                    aria-label={`beri ${i} bintang`}
                    disabled={!canRate}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setSelected(i)}
                    className={`p-1 text-3xl transition-transform ${i <= (hover || selected || 0) ? 'text-yellow-500 drop-shadow-[0_0_6px_rgba(234,179,8,0.35)]' : 'text-slate-300'} ${canRate ? 'hover:scale-110' : ''}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              {!canRate && <div className="mt-2 text-center text-xs text-slate-500">Anda tidak dapat memberi rating pada roadmap ini.</div>}
              {canRate && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
                    onClick={async () => { if (selected > 0) { await rate(selected); setOpen(false); } }}
                    disabled={busy || selected < 1}
                  >
                    {busy ? 'Mengirim…' : 'Kirim Rating'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
