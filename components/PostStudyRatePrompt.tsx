"use client";
import { useEffect, useRef, useState } from 'react';

export default function PostStudyRatePrompt({ sourceRoadmapId, sourceSlug }: { sourceRoadmapId: string; sourceSlug?: string | null }) {
  const [show, setShow] = useState(false);
  const seenRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [given, setGiven] = useState<number | null>(null);

  useEffect(() => {
    // Don't show again if rated/dismissed
    const key = `rated:${sourceRoadmapId}`;
    if (localStorage.getItem(key)) return;
    const el = document.getElementById('read-end-sentinel');
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (e && e.isIntersecting && !seenRef.current) {
        seenRef.current = true;
        setShow(true);
      }
    }, { root: null, threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [sourceRoadmapId]);

  async function rate(stars: number) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/roadmaps/${sourceRoadmapId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stars }),
      });
      if (res.ok) {
        setGiven(stars);
        localStorage.setItem(`rated:${sourceRoadmapId}`, String(stars));
        // Auto-hide shortly after
        setTimeout(() => setShow(false), 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!show) return null;
  return (
    <div className="fixed bottom-4 inset-x-0 px-4 z-40">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white shadow-lg p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Selesai belajar sesi ini?</div>
          <div className="text-xs text-slate-600">Bantu yang lain dengan memberi rating untuk roadmap sumber.</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex text-lg">
            {[1,2,3,4,5].map((i) => (
              <button key={i} onClick={() => rate(i)} disabled={busy} className={`px-0.5 ${given && i <= given ? 'text-yellow-500' : 'text-slate-300'} hover:scale-110`} aria-label={`beri ${i} bintang`}>★</button>
            ))}
          </div>
          {sourceSlug ? (
            <a href={`/${['r', sourceSlug].join('/')}`} target="_blank" className="text-xs text-blue-700 hover:underline">Lihat Halaman Publik</a>
          ) : null}
          <button onClick={() => setShow(false)} className="text-xs text-slate-500 hover:text-slate-700">Tutup</button>
        </div>
      </div>
    </div>
  );
}
