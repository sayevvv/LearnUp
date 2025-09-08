"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';

type ReaderContext = { title: string; body: string; points?: string[]; roadmapId?: string; m?: number; s?: number } | null;

export default function ReaderAssistantBubble() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [ctx, setCtx] = useState<ReaderContext>(null);
  const [slideIn, setSlideIn] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const composingRef = useRef(false);

  // Personalization for empty state greeting
  const firstName = useMemo(() => {
    const nm = session?.user?.name || '';
    const f = nm.trim().split(/\s+/)[0];
    return f || 'Kamu';
  }, [session?.user?.name]);
  const basePhrase = 'Jangan malu buat tanya!';

  // Listen for context updates from reader page
  useEffect(() => {
    function onCtx(e: any) {
      if (e?.detail) setCtx(e.detail as ReaderContext);
    }
    window.addEventListener('reader:context', onCtx as any);
    return () => window.removeEventListener('reader:context', onCtx as any);
  }, []);

  // Trigger slide-in animation when opening
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setSlideIn(true));
      return () => cancelAnimationFrame(id);
    }
    setSlideIn(false);
  }, [open]);

  async function ask() {
    const question = q.trim();
    if (!question || loading) return;
    setLoading(true);
    setHistory((h) => [...h, { role: 'user', content: question }]);
    try {
      // Build robust context: prefer received reader context; otherwise parse from URL
      let payloadContext: ReaderContext = ctx;
      try {
        const url = new URL(window.location.href);
        const sp = url.searchParams;
        const mParam = Number(sp.get('m') || '0') || 0;
        const sParam = Number(sp.get('s') || '0') || 0;
        const match = url.pathname.match(/\/dashboard\/roadmaps\/([^/]+)/);
        const rid = match?.[1];
        if (!payloadContext) payloadContext = { title: '', body: '', points: [], roadmapId: rid, m: mParam, s: sParam };
        else {
          // Augment identifiers if missing
          if (!payloadContext.roadmapId && rid) payloadContext.roadmapId = rid;
          if (typeof payloadContext.m !== 'number') payloadContext.m = mParam;
          if (typeof payloadContext.s !== 'number') payloadContext.s = sParam;
        }
      } catch {}

      const res = await fetch('/api/reader/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: payloadContext, history }),
      });
      const data = await res.json().catch(() => ({}));
      const answer = data?.answer || 'Maaf, saya tidak menemukan jawabannya pada materi ini.';
      setA(answer);
      setHistory((h) => [...h, { role: 'assistant', content: answer }]);
      // reset input height
      setQ('');
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.focus();
        }
      });
    } catch (e) {
      setA('Terjadi kesalahan. Coba lagi nanti.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-resize textarea with content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 192) + 'px'; // cap ~12rem
  }, [q]);

  return (
    <>
      {/* Launcher: fixed bottom-right on all screens (hidden when open) */}
      {!open && (
        <div
          className="fixed z-50"
          style={{
            bottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
            right: 'calc(2rem + env(safe-area-inset-right, 0px))',
          }}
        >
          <div className="relative animate-mascot">
            <button
              aria-label="Buka asisten"
              onClick={() => setOpen(true)}
              className="relative h-20 w-20 transition-transform duration-200 hover:scale-105"
              title="Buka asisten"
            >
              <Image src="/assets/mascot.png" alt="Asisten" fill sizes="80px" className="object-contain drop-shadow-xl" />
            </button>
            {/* Bubble anchored to the left side of the icon, vertically centered */}
            <div className="absolute right-full top-1/2 -translate-y-1/2 -translate-x-2 select-none pointer-events-none">
              <div className="inline-block whitespace-nowrap rounded-3xl bg-white shadow px-5 py-1.5 text-xs font-semibold text-slate-800 border border-slate-200">
                Bingung, tanya saya!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop docked panel (shown when open) */}
      {open && (
        <div className="hidden xl:block fixed right-6 top-[calc(6rem+0.5rem)] h-[calc(100vh-7rem)] w-[22rem] z-30 pointer-events-none pt-1">
          <div className={`xl:flex xl:flex-col h-full w-full rounded-xl border border-slate-200 bg-white overflow-hidden pointer-events-auto transform transition-transform duration-300 ${slideIn ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="font-semibold">Asisten Belajar</div>
            <button
              type="button"
              aria-label="Tutup panel"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              title="Tutup"
            >
              ×
            </button>
            </div>
  <div className="relative flex-1 overflow-y-auto p-4 bg-white space-y-3" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false">
              {history.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-3">
                  <div className="flex flex-col items-center text-center gap-3 w-full max-w-md">
                    <div>
                      <div className="text-2xl font-extrabold leading-snug text-slate-700 dark:text-slate-200">{firstName},</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{basePhrase}</div>
                    </div>
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 opacity-95">
                      <Image src="/assets/mascot.png" alt="Asisten" fill sizes="128px" className="object-contain" />
                    </div>
                  </div>
                </div>
              )}
            {history.map((m, i) => (
              <div
                key={i}
                className={`inline-block w-fit max-w-[85%] break-words ${m.role === 'user' ? 'ml-auto text-white bg-blue-600' : 'mr-auto bg-slate-100'} rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap`}
              >
                {m.content}
              </div>
            ))}
            {a && history.length===0 ? (
              <div className="inline-block w-fit max-w-[85%] break-words mr-auto bg-slate-100 rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">{a}</div>
            ) : null}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => { e.preventDefault(); ask(); }}
                className="border border-slate-300 rounded-lg flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-slate-300"
                aria-label="Kirim pertanyaan ke asisten"
              >
                <label htmlFor="chat-input" className="sr-only">Pertanyaan</label>
                <textarea
                  id="chat-input"
                  ref={textareaRef}
                  value={q}
                  onChange={(e)=>setQ(e.target.value)}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={() => { composingRef.current = false; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                      e.preventDefault();
                      ask();
                    }
                  }}
                  placeholder="Tulis pertanyaan tentang materi ini…"
                  className="flex-1 max-h-48 overflow-hidden resize-none border-none outline-none focus:outline-none bg-transparent px-2 py-1 text-sm"
                  rows={1}
                  autoComplete="off"
                  enterKeyHint="send"
                  spellCheck
                  maxLength={1000}
                  aria-label="Pertanyaan untuk asisten"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || q.trim().length === 0}
                  aria-disabled={loading || q.trim().length === 0}
                  aria-busy={loading}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold min-w-[84px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Kirim pertanyaan"
                >
                  {loading ? 'Mengirim…' : 'Kirim'}
                </button>
              </form>
            {ctx ? <div className="mt-2 text-[11px] text-slate-500 truncate">Konteks: {ctx.title}</div> : <div className="mt-2 text-[11px] text-slate-400">Konteks materi belum dimuat</div>}
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay panel */}
      {open && (
        <div className="xl:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ${slideIn ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="font-semibold">Asisten Belajar</div>
              <button
                type="button"
                aria-label="Tutup panel"
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                title="Tutup"
              >
                ×
              </button>
            </div>
  <div className="relative flex-1 overflow-y-auto p-4 space-y-3 bg-white" role="log" aria-live="polite" aria-relevant="additions" aria-atomic="false">
              {history.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                  <div className="flex flex-col items-center text-center gap-4 w-full max-w-md">
                    <div>
                      <div className="text-2xl font-extrabold leading-snug text-slate-700 dark:text-slate-200">{firstName},</div>
                      <div className="mt-1 text-base text-slate-600 dark:text-slate-300">{basePhrase}</div>
                    </div>
                    <div className="relative w-28 h-28 md:w-32 md:h-32 opacity-95">
                      <Image src="/assets/mascot.png" alt="Asisten" fill sizes="128px" className="object-contain" />
                    </div>
                  </div>
                </div>
              )}
              {history.map((m, i) => (
                <div
                  key={i}
                  className={`inline-block w-fit max-w-[85%] break-words ${m.role === 'user' ? 'ml-auto text-white bg-blue-600' : 'mr-auto bg-slate-100'} rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap`}
                >
                  {m.content}
                </div>
              ))}
              {a && history.length === 0 ? (
                <div className="inline-block w-fit max-w-[85%] break-words mr-auto bg-slate-100 rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">{a}</div>
              ) : null}
            </div>
            <div
              className="p-3 border-t border-slate-200"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <form
                onSubmit={(e) => { e.preventDefault(); ask(); }}
                className="border border-slate-300 rounded-lg flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-slate-300"
                aria-label="Kirim pertanyaan ke asisten"
              >
                <label htmlFor="chat-input-mobile" className="sr-only">Pertanyaan</label>
                <textarea
                  id="chat-input-mobile"
                  ref={textareaRef}
                  value={q}
                  onChange={(e)=>setQ(e.target.value)}
                  onCompositionStart={() => { composingRef.current = true; }}
                  onCompositionEnd={() => { composingRef.current = false; }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                      e.preventDefault();
                      ask();
                    }
                  }}
                  placeholder="Tulis pertanyaan tentang materi ini…"
                  className="flex-1 max-h-48 overflow-hidden resize-none border-none outline-none focus:outline-none bg-transparent px-2 py-1 text-sm"
                  rows={1}
                  autoComplete="off"
                  enterKeyHint="send"
                  spellCheck
                  maxLength={1000}
                  aria-label="Pertanyaan untuk asisten"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || q.trim().length === 0}
                  aria-disabled={loading || q.trim().length === 0}
                  aria-busy={loading}
                  className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold min-w-[84px] disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Kirim pertanyaan"
                >
                  {loading ? 'Mengirim…' : 'Kirim'}
                </button>
              </form>
              {ctx ? <div className="mt-2 text-[11px] text-slate-500 truncate">Konteks: {ctx.title}</div> : <div className="mt-2 text-[11px] text-slate-400">Konteks materi belum dimuat</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
