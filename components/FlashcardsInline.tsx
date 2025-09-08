"use client";
import { useEffect, useState } from 'react';

type ReaderCtx = { title: string; body: string; points?: string[]; roadmapId?: string; m?: number; s?: number } | null;
type Card = { front: string; back: string };

export default function FlashcardsInline({ initialCtx }: { initialCtx?: ReaderCtx }) {
  const [ctx, setCtx] = useState<ReaderCtx>(initialCtx || null);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // hydrate context from reader dispatcher as user navigates
  useEffect(() => {
    function onCtx(e: any) { if (e?.detail) setCtx(e.detail as ReaderCtx); }
    window.addEventListener('reader:context', onCtx as any);
    return () => window.removeEventListener('reader:context', onCtx as any);
  }, []);

  // fetch cards when context changes (title/body) or identifiers
  useEffect(() => {
    const title = ctx?.title || '';
    const body = ctx?.body || '';
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        // derive identifiers for server fallback
        let rid = ctx?.roadmapId, m = ctx?.m, s = ctx?.s;
        try {
          const url = new URL(window.location.href);
          if (!rid) {
            const match = url.pathname.match(/\/dashboard\/roadmaps\/([^/]+)/);
            rid = match?.[1];
          }
          if (typeof m !== 'number') m = Number(url.searchParams.get('m') || '0') || 0;
          if (typeof s !== 'number') s = Number(url.searchParams.get('s') || '0') || 0;
        } catch {}
        // If there is no context text and also no identifiers, clear and stop
        if (!title && !body && (!rid || m == null || s == null)) {
          if (!abort) { setCards([]); setIndex(0); setShowBack(false); setLoading(false); }
          return;
        }
        const res = await fetch('/api/reader/flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context: ctx, limit: 5, roadmapId: rid, m, s })
        });
        const data = await res.json().catch(() => ({}));
        if (abort) return;
        const arr: Card[] = Array.isArray(data?.cards) ? data.cards.filter((c: any) => c?.front && c?.back).slice(0, 5) : [];
        setCards(arr);
        setIndex(0);
        setShowBack(false);
      } catch {
        if (abort) return;
        setCards([]);
      } finally { if (!abort) setLoading(false); }
    })();
    return () => { abort = true; };
  }, [ctx?.title, ctx?.body]);

  const current = cards[index] as Card | undefined;

  function next(rating: 'hard' | 'ok' | 'easy' | 'next') {
    // simple next; hook for SRS later
    setShowBack(false);
    setIndex((i) => (i + 1 < cards.length ? i + 1 : 0));
  }

  return (
    <section aria-label="Flashcards" className="mt-8">
  {/* Title + counter */}
  <div className="text-[10px] font-semibold tracking-wider uppercase text-slate-500">Flashcard</div>
  {/* Counter kecil */}
      <div className="text-xs text-slate-500 mb-2">{cards.length ? `${index + 1}/${cards.length}` : ''}</div>
  <div className="relative mx-auto w-full max-w-[18rem] sm:max-w-[20rem] md:max-w-[20rem]">
        {/* Blue thick drop behind the card */}
        <div aria-hidden className="pointer-events-none absolute inset-0 translate-x-3 translate-y-3 sm:translate-x-4 sm:translate-y-4 rounded-[28px] bg-blue-600"></div>
        {/* Foreground card */}
  <div className="relative z-10 rounded-[28px] border border-slate-200 bg-white h-[22rem] sm:h-[24rem] md:h-[28rem] flex items-center justify-center text-center px-6 shadow-sm">
          {loading ? (
            <div className="text-sm text-slate-600">Menyiapkan kartu…</div>
          ) : current ? (
            <div className="w-full">
              <div className="text-slate-900 whitespace-pre-wrap text-base sm:text-lg leading-relaxed">{showBack ? current.back : current.front}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">Belum ada kartu untuk materi ini.</div>
          )}
        </div>
      </div>
      {current && (
        <div className="mt-8 flex items-center justify-center">
          <div className="inline-grid grid-cols-3 gap-3 items-center">
            {/* Left slot: Balik (kept invisible when front) */}
            <button
              onClick={() => setShowBack(false)}
              className={`rounded-full border border-slate-300 bg-white text-slate-800 text-xs px-4 py-2 font-semibold hover:bg-slate-50 ${!showBack ? 'invisible pointer-events-none' : ''}`}
              aria-label="Balik ke pertanyaan"
              aria-hidden={!showBack}
              tabIndex={showBack ? 0 : -1}
            >
              Balik
            </button>

            {/* Center slot: Lihat Jawaban (front) OR Selanjutnya (back) */}
            {showBack ? (
              <button
                onClick={() => next('next')}
                className="rounded-full bg-slate-900 text-white text-xs px-4 py-2 font-semibold hover:bg-black"
                aria-label="Kartu berikutnya"
              >
                Selanjutnya
              </button>
            ) : (
              <button
                onClick={() => setShowBack(true)}
                className="rounded-full bg-blue-600 text-white text-xs px-4 py-2 font-semibold hover:bg-blue-700"
                aria-label="Lihat jawaban"
              >
                Lihat Jawaban
              </button>
            )}

            {/* Right placeholder to keep center perfectly centered */}
            <button
              className="rounded-full border border-slate-300 bg-white text-slate-800 text-xs px-4 py-2 font-semibold invisible pointer-events-none"
              aria-hidden
              tabIndex={-1}
            >
              Placeholder
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
