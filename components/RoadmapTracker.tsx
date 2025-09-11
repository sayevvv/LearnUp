"use client";

import { Fragment, useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/ToastProvider';
import RoadmapGraph from './RoadmapGraph';
import {
  LayoutList,
  GitBranch,
  CheckCircle,
  ArrowLeft,
  Globe,
  XCircle,
  Sparkles,
  RefreshCcw,
  PlayCircle,
  Upload,
  EyeOff,
  Trash2,
} from 'lucide-react';
import RatingSummary from '@/components/RatingSummary';
import TopicChips from '@/components/TopicChips';
import { Transition } from '@headlessui/react';

type Roadmap = {
  id: string;
  title: string;
  content: any;
  published?: boolean;
  slug?: string | null;
  sourceId?: string | null;
};

export default function RoadmapTracker({ roadmapId }: { roadmapId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show } = useToast();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [progress, setProgress] = useState<{ completedTasks: Record<string, boolean>; percent: number } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishOpen, setConfirmPublishOpen] = useState(false);
  const [view, setView] = useState<'graph' | 'checklist'>('graph');
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [nodeSummary, setNodeSummary] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [preparePartial, setPreparePartial] = useState(false);
  const [prepareCtrl, setPrepareCtrl] = useState<AbortController | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmUnpublishOpen, setConfirmUnpublishOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmDeleteText, setConfirmDeleteText] = useState('');
  // Milestone-level generation state (replaces legacy per-node generation)
  const [milestoneGenerating, setMilestoneGenerating] = useState<Record<number, boolean>>({});
  const [autoInitTried, setAutoInitTried] = useState(false);
  const [firstMilestoneGenerating, setFirstMilestoneGenerating] = useState(false);
  const [firstMilestoneError, setFirstMilestoneError] = useState<string | null>(null);
  const [hasShownFirstToast, setHasShownFirstToast] = useState(false);
  const lastMilestoneClickRef = useRef<Record<number, number>>({});
  // Start-date disabled for saved roadmaps

  // Load roadmap + progress
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const [r, p] = await Promise.all([
          fetch(`/api/roadmaps/${roadmapId}`),
          fetch(`/api/roadmaps/${roadmapId}/progress`),
        ]);
        if (!r.ok) throw new Error('Gagal memuat roadmap');
        const rj = await r.json();
        const pj = p.ok ? await p.json() : null;
        if (!active) return;
        setRoadmap(rj);
        setProgress(pj || { completedTasks: {}, percent: 0 });
      } catch (e: any) {
        if (!active) return;
        setError(e.message || 'Gagal memuat data');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [roadmapId]);

  // Removed auto-start bulk generation (?prepare=1) per new first-node only flow

  // Restore preferred view per roadmap, default to graph
  useEffect(() => {
    try {
      const key = `roadmapView:${roadmapId}`;
      const saved = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (saved === 'checklist' || saved === 'graph') setView(saved);
      else setView('graph');
    } catch {}
  }, [roadmapId]);

  // Persist view choice
  useEffect(() => {
    try {
      const key = `roadmapView:${roadmapId}`;
      if (typeof window !== 'undefined') localStorage.setItem(key, view);
    } catch {}
  }, [view, roadmapId]);

  // Support both new 'subbab' and legacy 'sub_tasks'
  const milestones: Array<{ timeframe: string; topic: string; subbab?: string[]; sub_tasks?: Array<string | { task: string; type?: string }> }>
    = useMemo(() => (roadmap?.content?.milestones || []) as any, [roadmap]);

  // Helper: determine if milestone mi can be accessed (previous milestone complete + quiz exists)
  const getGateForMilestone = useCallback((mi: number) => {
    try {
      if (mi <= 0) return { ok: true } as const;
      const prev = mi - 1;
      const prevMilestone = (milestones as any[])[prev] || {};
      const expected = Array.isArray(prevMilestone.subbab)
        ? prevMilestone.subbab.length
        : (Array.isArray(prevMilestone.sub_tasks) ? prevMilestone.sub_tasks.length : 0);
      const tasks = (progress?.completedTasks || {}) as Record<string, any>;
      for (let i = 0; i < expected; i++) {
        if (!tasks[`m-${prev}-t-${i}`]) {
          return { ok: false, reason: 'need-nodes', index: i as number, href: `/dashboard/roadmaps/${(roadmap as any).id}/read?m=${prev}&s=${i}` } as const;
        }
      }
      const quizKey = `quiz-m-${prev}`;
      if (!tasks[quizKey]) {
        return { ok: false, reason: 'need-quiz', href: `/dashboard/roadmaps/${(roadmap as any).id}/quiz?m=${prev}` } as const;
      }
      return { ok: true } as const;
    } catch {
      return { ok: true } as const;
    }
  }, [milestones, progress, roadmap]);

  // Determine if materials are ready for publishing (client-side hint; server enforces again)
  const materialsReady = useMemo(() => {
    try {
      const content: any = (roadmap as any)?.content || {};
      if (content?._generation?.inProgress) return false;
      const mats: any[][] = Array.isArray(content?.materialsByMilestone) ? content.materialsByMilestone : [];
      const ms = Array.isArray((roadmap as any)?.content?.milestones) ? (roadmap as any).content.milestones : [];
      if (!ms.length) return false;
      for (let i = 0; i < ms.length; i++) {
        const m: any = ms[i] || {};
        const expected = Array.isArray(m.subbab) ? m.subbab.length : (Array.isArray(m.sub_tasks) ? m.sub_tasks.length : 0);
        if (expected > 0) {
          const got = Array.isArray(mats[i]) ? mats[i].length : 0;
          if (got < expected) return false;
        }
      }
      return true;
    } catch { return false; }
  }, [roadmap]);

  const hasAnyMaterials = useMemo(() => {
    try {
      const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone)
        ? (roadmap as any).content.materialsByMilestone
        : [];
      return mats.some((mi) => Array.isArray(mi) && mi.length > 0);
    } catch { return false; }
  }, [roadmap]);

  // Auto-init generate only the very first milestone (m=0) if no materials exist at all.
  const triggerFirstMilestoneGeneration = useCallback(async () => {
    setFirstMilestoneError(null);
    setFirstMilestoneGenerating(true);
    try {
      const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=0`, { method: 'POST' });
      if (!res.ok) {
        let msg = 'Gagal generate milestone pertama';
        try { const j = await res.json(); msg = j?.error || msg; } catch {}
        throw new Error(msg);
      }
      const r = await fetch(`/api/roadmaps/${roadmapId}`);
      if (r.ok) {
        const j = await r.json();
        const mats: any[][] = Array.isArray(j?.content?.materialsByMilestone) ? j.content.materialsByMilestone : [];
        const firstList = mats?.[0];
        if (Array.isArray(firstList) && firstList.length && !hasShownFirstToast) {
          show({ type: 'success', title: 'Siap', message: 'Milestone pertama siap dipelajari.' });
          setHasShownFirstToast(true);
        }
        setRoadmap(j);
      }
    } catch (e: any) {
      setFirstMilestoneError(e.message || 'Gagal generate milestone pertama');
    } finally {
      setFirstMilestoneGenerating(false);
    }
  }, [roadmapId, show, hasShownFirstToast]);

  useEffect(() => {
    if (!roadmap) return;
    if (autoInitTried) return;
    const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone)
      ? (roadmap as any).content.materialsByMilestone
      : [];
    const first = mats?.[0]?.[0]; // check any material in first milestone
    const empty = !mats.some(row => Array.isArray(row) && row.length > 0);
    if (first) {
      setHasShownFirstToast(true); // already exists, don't toast
      setAutoInitTried(true);
      return;
    }
    if (empty && !first) {
      setAutoInitTried(true);
      void triggerFirstMilestoneGeneration();
      return;
    }
    setAutoInitTried(true);
  }, [roadmap, autoInitTried, triggerFirstMilestoneGeneration]);

  // Helper: check if any other milestone generation is active (client or server)
  const isOtherGenerationActive = useCallback((mi: number) => {
    try {
      const clientOther = Object.entries(milestoneGenerating).some(([k, v]) => Number(k) !== mi && !!v);
      const genMeta: any = (roadmap as any)?.content?._generation || {};
      // Treat undefined milestone as first (m=0). It's considered "other" for all non-zero milestones.
      const serverOther = !!genMeta.inProgress && (
        typeof genMeta.milestone === 'number'
          ? genMeta.milestone !== mi
          : mi !== 0
      );
      return clientOther || serverOther;
    } catch { return false; }
  }, [milestoneGenerating, roadmap]);

  // Open modal for a milestone with optional index and load cached short summary
  const openMilestoneModal = (m: any, mi: number | null) => {
    setSelectedMilestone(m);
    setSelectedIndex(mi);
    try {
      const details = Array.isArray((m as any).subbab)
        ? (m as any).subbab.join(' | ')
        : (Array.isArray((m as any).sub_tasks) ? (m as any).sub_tasks.map((t: any) => (typeof t === 'string' ? t : t?.task)).join(' | ') : '');
      const cacheKey = `nodeSummary:${m.topic}:${details}`;
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cached) {
        setNodeSummary(cached);
      } else {
        setNodeSummary(null);
        fetch('/api/generate-explanation-short', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic: m.topic, details })
        })
          .then(async (r) => (r.ok ? r.json() : Promise.reject(new Error('Gagal generate ringkasan'))))
          .then((j) => {
            const summary = (j?.explanation || '').toString();
            if (summary) {
              setNodeSummary(summary);
              try { localStorage.setItem(cacheKey, summary); } catch {}
            }
          })
          .catch(() => {});
      }
    } catch {}
  };

  const doPublish = async (publish: boolean) => {
    try {
      setPublishing(true);
      const res = await fetch(`/api/roadmaps/${roadmapId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });
      if (!res.ok) {
        let msg = 'Gagal memperbarui publikasi';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      const rj = await res.json();
      setRoadmap((prev) => ({ ...(prev as any), ...rj }));
      // Show confirmation toast on success
      if (publish) {
        show({ type: 'success', title: 'Dipublikasikan', message: 'Roadmap berhasil dipublikasikan.' });
      } else {
        show({ type: 'success', title: 'Berhasil', message: 'Publikasi dibatalkan.' });
      }
    } catch (e: any) {
  setError(e.message || 'Gagal memperbarui publikasi');
  show({ type: 'error', title: 'Gagal', message: e.message || 'Gagal memperbarui publikasi' });
    } finally {
      setPublishing(false);
    }
  };

  const handlePublish = async (publish: boolean) => {
    if (publish) {
  // Open confirmation modal before publishing
  setConfirmPublishOpen(true);
      return;
    }
    // Confirm before unpublishing
    setConfirmUnpublishOpen(true);
  };

  const performDelete = async () => {
    try {
      const res = await fetch(`/api/roadmaps/${roadmapId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus roadmap');
      show({ type: 'success', title: 'Dihapus', message: 'Roadmap berhasil dihapus.' });
      router.push('/dashboard/roadmaps');
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus roadmap');
      show({ type: 'error', title: 'Gagal', message: e.message || 'Gagal menghapus roadmap' });
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center">Memuat...</div>;
  }
  if (error) {
    return <div className="p-6 text-red-700 bg-red-50">{error}</div>;
  }
  if (!roadmap) {
    return <div className="p-6">Roadmap tidak ditemukan.</div>;
  }

  // Compute a consistent back target based on query ?from= and referrer
  const backHref = (() => {
    const from = (searchParams?.get('from') || '').toLowerCase();
    if (from === 'browse') return '/dashboard/browse';
  if (from === 'history') return '/dashboard/roadmaps';
    if (from === 'roadmaps' || from === 'mine' || from === 'my') return '/dashboard/roadmaps';
    try {
      const ref = document?.referrer || '';
      if (/\/dashboard\/browse/.test(ref)) return '/dashboard/browse';
  if (/\/dashboard\/history/.test(ref)) return '/dashboard/roadmaps';
    } catch {}
    return '/dashboard/roadmaps';
  })();

  return (
    <div className="h-full overflow-hidden bg-white dark:bg-black flex flex-col">
      {/* Header */}
  <header className="flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-slate-200 dark:border-[#1f1f1f] sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="inline-flex items-center justify-center rounded-full h-9 w-9 text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-[#1a1a1a]"
            title="Kembali"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 hidden sm:block">Rencana Belajar</div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 truncate flex items-center gap-2">{roadmap.title}
              {(() => {
                try {
                  const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone) ? (roadmap as any).content.materialsByMilestone : [];
                  const genMeta: any = (roadmap as any)?.content?._generation || {};
                  const firstReady = Array.isArray(mats?.[0]) && mats?.[0]?.length > 0;
                  const serverGenActive = !!genMeta.inProgress && (genMeta.milestone === 0 || typeof genMeta.milestone === 'undefined');
                  if (!firstReady && (firstMilestoneGenerating || serverGenActive)) {
                    return (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[11px] font-medium">
                        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" /></svg>
                        Menyiapkan…
                      </span>
                    );
                  }
                  if (firstReady) {
                    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-medium">✓ Materi pertama siap</span>;
                  }
                } catch {}
                return null;
              })()}
            </h1>
            {Boolean((roadmap as any).sourceId) && (
              <div className="mt-1 flex items-center gap-2">
                {(roadmap as any).source?.user?.name ? (
                  <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px]" title={`Sumber: ${(roadmap as any).source?.user?.name}`}>
                    oleh {(roadmap as any).source?.user?.name}
                  </span>
                ) : null}
                {((roadmap as any).source?.published === false) && (
                  <span className="inline-flex items-center rounded-md bg-amber-50 text-amber-800 px-2 py-0.5 text-[11px] font-medium" title="Sumber tidak lagi publik">
                    Sumber tidak lagi publik
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
  <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] overflow-hidden">
            <button
              type="button"
              onClick={() => setView('graph')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${view === 'graph' ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
              title="Lihat Graph"
            >
              <GitBranch className="h-4 w-4" />
              <span className="hidden sm:inline">Graph</span>
            </button>
            <button
              type="button"
              onClick={() => setView('checklist')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm ${view === 'checklist' ? 'bg-slate-100 dark:bg-[#1a1a1a] text-slate-900 dark:text-white' : 'text-slate-600 dark:text-neutral-300'}`}
              title="Lihat Checklist"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Checklist</span>
            </button>
          </div>
          <TopicChips roadmapId={(roadmap as any).id} />
          {(roadmap as any).sourceId ? (
            <RatingSummary
              roadmapId={(roadmap as any).sourceId}
              canRate={true}
            />
          ) : null}
          {(() => {
            const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone) ? (roadmap as any).content.materialsByMilestone : [];
            const genMeta: any = (roadmap as any)?.content?._generation || {};
            const firstList = mats?.[0];
            const firstReady = Array.isArray(firstList) && firstList.length > 0;
            const serverGenActive = !!genMeta.inProgress && (genMeta.milestone === 0 || typeof genMeta.milestone === 'undefined');
            if (!firstReady) {
              // Show retry only if explicit error state AND no active server generation
              if (firstMilestoneError && !firstMilestoneGenerating && !serverGenActive) {
                return (
                  <button
                    type="button"
                    onClick={() => triggerFirstMilestoneGeneration()}
                    className="rounded-lg px-3 py-2 text-sm font-semibold bg-red-600 text-white hover:bg-red-700 inline-flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Coba Lagi
                  </button>
                );
              }
              const spinning = firstMilestoneGenerating || serverGenActive;
              if (spinning) {
                return (
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      disabled={true}
                      className="rounded-lg px-3 py-2 text-sm font-semibold bg-blue-600 text-white inline-flex items-center gap-2 disabled:opacity-90"
                    >
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" /></svg>
                      Menyiapkan…
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                      title="Batalkan"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials`, { method: 'DELETE' });
                          if (res.ok) {
                            show({ type: 'success', title: 'Dibatalkan', message: 'Pembuatan materi dibatalkan.' });
                          }
                        } catch {}
                        setFirstMilestoneGenerating(false);
                        setFirstMilestoneError(null);
                        try {
                          const r = await fetch(`/api/roadmaps/${roadmapId}`);
                          if (r.ok) setRoadmap(await r.json());
                        } catch {}
                      }}
                      aria-label="Batalkan menyiapkan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                    </button>
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2"
                  onClick={async () => {
                    try {
                      const genMeta: any = (roadmap as any)?.content?._generation || {};
                      const serverOther = !!genMeta.inProgress;
                      if (serverOther || isOtherGenerationActive(0)) {
                        const activeMi: number | undefined = typeof genMeta.milestone === 'number' ? genMeta.milestone : 0;
                        const activeTopic: string | undefined = (Array.isArray((roadmap as any)?.content?.milestones) && typeof activeMi === 'number') ? (roadmap as any).content.milestones[activeMi]?.topic : undefined;
                        show({ type: 'info', title: 'Sedang diproses', message: activeTopic ? `Pembuatan "${activeTopic}" sedang berjalan. Tunggu selesai dahulu sebelum memulai yang lain.` : 'Sedang ada proses pembuatan milestone lain. Tunggu selesai dahulu.' });
                        return;
                      }
                    } catch {}
                    await triggerFirstMilestoneGeneration();
                  }}
                >
                  Generate Milestone
                </button>
              );
            }
            return <Link href={`/dashboard/roadmaps/${roadmap.id}/read`} className="rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700">Mulai Belajar</Link>;
          })()}
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              title="Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M12 6.75a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 13.5a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM12 20.25a1.5 1.5 0 110-3 1.5 1.5 0 010 3z"/></svg>
            </button>
                {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] shadow-lg z-20 p-1">
                {roadmap.published && roadmap.slug ? (
                  <Link href={`/r/${roadmap.slug}`} className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md bg-slate-50 dark:bg-[#141414] hover:bg-slate-100 dark:hover:bg-[#1a1a1a]">
                    <Globe className="h-4 w-4" />
                    <span>Lihat Publik</span>
                  </Link>
                ) : null}
                {/* Bulk generation options removed per new incremental flow */}
                {!(roadmap as any).sourceId ? (
                  <button
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md bg-slate-50 dark:bg-[#141414] hover:bg-slate-100 dark:hover:bg-[#1a1a1a]"
                    disabled={publishing || (!(roadmap as any).published && !materialsReady)}
                    title={
                      (roadmap as any).published
                        ? 'Batalkan Publikasi'
                        : (!materialsReady ? 'Generate materi belajar terlebih dahulu sebelum mempublikasikan' : 'Publikasikan')
                    }
                    onClick={() => { setMenuOpen(false); handlePublish(!(roadmap as any).published); }}
                  >
                    {(roadmap as any).published ? (
                      <>
                        <EyeOff className="h-4 w-4" />
                        <span>Batalkan Publikasi</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Publikasikan</span>
                      </>
                    )}
                  </button>
                ) : null}
                <button className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-md bg-red-50 text-red-700 hover:bg-red-100 dark:bg-[#1a0f0f] dark:text-red-300" onClick={() => { setMenuOpen(false); setConfirmDeleteOpen(true); }}>
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Confirm reset modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmResetOpen(false)} />
          <div className="relative bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl w-[min(520px,92vw)]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1f1f1f]">
              <h3 className="text-base font-semibold">Ulangi Generate Materi?</h3>
            </div>
            <div className="p-5 text-sm text-slate-700 dark:text-neutral-300 space-y-3">
              <p>Tindakan ini akan mengulang pembuatan semua materi untuk roadmap ini.</p>
              <p className="font-medium text-red-600">Semua progress belajar Anda (penanda selesai dan persentase) akan dihapus.</p>
              <p>Lanjutkan?</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border text-sm" onClick={() => setConfirmResetOpen(false)}>Batal</button>
              <button
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm"
                onClick={async () => {
                  setConfirmResetOpen(false);
                  setPreparing(true); setPrepareError(null); setPreparePartial(false);
                  const ctrl = new AbortController(); setPrepareCtrl(ctrl);
                  try {
                    const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?force=1&reset=1`, { method: 'POST', signal: ctrl.signal });
                    if (!res.ok) {
                      let msg = 'Gagal menyiapkan materi';
                      try { const j = await res.json(); msg = j?.error || msg; if (j?.partial) setPreparePartial(true); } catch {}
                      if (res.status === 429) show({ type: 'info', title: 'Server sibuk', message: msg });
                      if (res.status === 409) show({ type: 'info', title: 'Sedang ada proses lain', message: msg });
                      throw new Error(msg);
                    }
                    const r = await fetch(`/api/roadmaps/${roadmapId}`);
                    if (r.ok) setRoadmap(await r.json());
                  } catch (e: any) {
                    setPrepareError(e.message || 'Gagal menyiapkan materi');
                  } finally { setPreparing(false); setPrepareCtrl(null); }
                }}
              >Ya, Hapus Progress & Ulangi</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm unpublish modal */}
      {confirmUnpublishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmUnpublishOpen(false)} />
          <div className="relative bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl w-[min(520px,92vw)]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1f1f1f]">
              <h3 className="text-base font-semibold">Batalkan Publikasi?</h3>
            </div>
            <div className="p-5 text-sm text-slate-700 dark:text-neutral-300 space-y-3">
              <p>Roadmap akan disembunyikan dari halaman publik dan tidak bisa disimpan atau dinilai oleh orang lain.</p>
              <p>Anda dapat mempublikasikannya kembali kapan saja.</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border text-sm" onClick={() => setConfirmUnpublishOpen(false)}>Batal</button>
              <button
                className="px-3 py-1.5 rounded bg-amber-600 text-white text-sm"
                onClick={async () => {
                  setConfirmUnpublishOpen(false);
                  await doPublish(false);
                }}
              >Batalkan Publikasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal (GitHub-style) */}
      {confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDeleteOpen(false)} />
          <div className="relative bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl w-[min(560px,92vw)]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1f1f1f]">
              <h3 className="text-base font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="h-5 w-5" /> Hapus Roadmap?
              </h3>
            </div>
            <div className="p-5 text-sm text-slate-700 dark:text-neutral-300 space-y-4">
              <p className="leading-relaxed">
                Anda akan menghapus roadmap ini beserta progres belajar Anda. Tindakan ini <span className="font-semibold text-red-700 dark:text-red-400">tidak dapat dibatalkan</span>.
              </p>
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                <div className="text-[13px]">Untuk konfirmasi, ketik judul roadmap berikut ini:</div>
                <div className="mt-1 font-mono text-[13px]">{roadmap.title}</div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ketik judul roadmap untuk melanjutkan</label>
                <input
                  autoFocus
                  value={confirmDeleteText}
                  onChange={(e) => setConfirmDeleteText(e.target.value)}
                  className="w-full rounded-md border border-slate-300 dark:border-[#2a2a2a] bg-white dark:bg-[#0f0f0f] px-3 py-2 text-sm"
                  placeholder={roadmap.title}
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border text-sm" onClick={() => setConfirmDeleteOpen(false)}>Batal</button>
              <button
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={confirmDeleteText !== roadmap.title}
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  setConfirmDeleteText('');
                  await performDelete();
                }}
              >Saya mengerti, Hapus Roadmap</button>
            </div>
          </div>
        </div>
      )}

      {/* Inline preparing banner */}
      {(preparing || prepareError || preparePartial) && (
        <div className="px-6 py-3 border-b border-slate-200 dark:border-[#1f1f1f] bg-amber-50 dark:bg-[#2a1f00] text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
          <div className="text-sm">
            {preparing ? 'Menyiapkan materi belajar… Anda bisa mulai meninjau roadmap sambil menunggu.' : (prepareError || (preparePartial ? 'Sebagian materi berhasil dibuat. Anda dapat melanjutkan kapan saja.' : ''))}
          </div>
          {preparing ? (
            <div className="h-1.5 w-32 bg-amber-200 rounded-full overflow-hidden"><div className="h-full w-1/3 bg-amber-600 animate-pulse" /></div>
          ) : null}
        </div>
      )}

      {confirmPublishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmPublishOpen(false)} />
          <div className="relative bg-white dark:bg-[#0f0f0f] rounded-xl shadow-xl w-[min(520px,92vw)]">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1f1f1f]">
              <h3 className="text-base font-semibold">Publikasikan Roadmap?</h3>
            </div>
            <div className="p-5 text-sm text-slate-700 dark:text-neutral-300 space-y-3">
              <p>Roadmap Anda akan tampil di halaman publik dan dapat disimpan atau dinilai oleh orang lain.</p>
              <p>Anda bisa membatalkan publikasi kapan saja dari menu yang sama.</p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 dark:border-[#1f1f1f] flex justify-end gap-2">
              <button className="px-3 py-1.5 rounded border text-sm" onClick={() => setConfirmPublishOpen(false)}>Batal</button>
              <button
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={publishing}
                onClick={async () => {
                  setConfirmPublishOpen(false);
                  await doPublish(true);
                }}
              >Publikasikan</button>
            </div>
          </div>
        </div>
      )}

  {/* Progress bar */}
      <div className="p-6 border-b border-slate-200 dark:border-[#1f1f1f]">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Progress</span>
          <span className="font-semibold">{progress?.percent ?? 0}%</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
  {/* Removed start-date controls */}
      </div>

      {/* Main Content */}
      {view === 'graph' ? (
        <div className="flex-1 min-h-0">
          <div className="h-full">
            <RoadmapGraph
              data={{ milestones: milestones as any }}
              onNodeClick={(m: any) => {
                // Try to resolve index by reference, fallback by topic+timeframe
                let idx = (milestones as any[]).findIndex((x: any) => x === m);
                if (idx < 0) {
                  const t = (m as any).topic;
                  const tf = (m as any).timeframe;
                  idx = (milestones as any[]).findIndex((x: any) => x?.topic === t && x?.timeframe === tf);
                }
                openMilestoneModal(m, idx >= 0 ? idx : null);
              }}
              onStartClick={(mi: number) => {
                const m = (milestones as any[])[mi];
                openMilestoneModal(m, mi);
              }}
              onSubbabClick={(mi: number, si: number) => {
                const gate = getGateForMilestone(mi);
                if (!gate.ok) {
                  if (gate.reason === 'need-nodes') {
                    show({ type: 'info', title: 'Selesaikan materi dulu', message: 'Tuntaskan semua subbab pada milestone sebelumnya terlebih dahulu.' });
                  } else {
                    show({ type: 'info', title: 'Kerjakan kuis', message: 'Selesaikan kuis pada milestone sebelumnya untuk membuka tahap ini.' });
                  }
                  if (gate.href) router.push(gate.href);
                  return;
                }
                router.push(`/dashboard/roadmaps/${(roadmap as any).id}/read?m=${mi}&s=${si}`);
              }}
              startButtonLabel="Detail"
              promptMode={'simple'}
              showMiniMap={false}
                  getMilestoneUI={(mi: number) => {
                    const m = (milestones as any[])[mi];
                    const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone) ? (roadmap as any).content.materialsByMilestone : [];
                    const list = mats?.[mi] || [];
                    const totalSubs = Array.isArray((m as any).subbab) ? (m as any).subbab.length : (Array.isArray((m as any).sub_tasks) ? (m as any).sub_tasks.length : 0);
                    const complete = totalSubs > 0 && list.length >= totalSubs;
                    const genMeta: any = (roadmap as any)?.content?._generation || {};
                    const serverGenActive = !!genMeta.inProgress && (genMeta.milestone === mi || (mi === 0 && typeof genMeta.milestone === 'undefined'));
                    const mats0 = mats?.[0];
                    const firstReady = Array.isArray(mats0) && mats0.length > 0;
                    const serverGenActiveFor0 = !!genMeta.inProgress && (genMeta.milestone === 0 || typeof genMeta.milestone === 'undefined');
                    // Show header-like preparing ONLY when actually generating (server or local)
                    const headerPreparingFirst = (mi === 0) && (!firstReady) && (firstMilestoneGenerating || serverGenActiveFor0);
                    const generating = (headerPreparingFirst ? true : false) || ((mi === 0 && firstMilestoneGenerating) ? true : false) || !!milestoneGenerating[mi] || serverGenActive;
                    const disabled = generating || isOtherGenerationActive(mi);
                    const openHref = complete ? `/dashboard/roadmaps/${(roadmap as any).id}/read?m=${mi}&s=0` : null;
                    return { complete, generating, disabled, openHref };
                  }}
                  onGenerate={async (mi: number) => {
                    const genMeta: any = (roadmap as any)?.content?._generation || {};
                    const serverGenActive = !!genMeta.inProgress && (typeof genMeta.milestone === 'number' ? genMeta.milestone !== mi : mi !== 0);
                    if (isOtherGenerationActive(mi) || serverGenActive) {
                      try {
                        const activeMi: number | undefined = typeof genMeta.milestone === 'number' ? genMeta.milestone : 0;
                        const activeTopic: string | undefined = (Array.isArray((roadmap as any)?.content?.milestones) && typeof activeMi === 'number') ? (roadmap as any).content.milestones[activeMi]?.topic : undefined;
                        show({ type: 'info', title: 'Sedang diproses', message: activeTopic ? `Pembuatan "${activeTopic}" sedang berjalan. Tunggu selesai dahulu sebelum memulai yang lain.` : 'Sedang ada proses pembuatan milestone lain. Tunggu selesai dahulu.' });
                      } catch {
                        show({ type: 'info', title: 'Sedang diproses', message: 'Sedang ada proses pembuatan milestone lain. Tunggu selesai dahulu.' });
                      }
                      return;
                    }
                    const now = Date.now();
                    const last = lastMilestoneClickRef.current[mi] || 0;
                    if (now - last < 1000) return; // debounce
                    lastMilestoneClickRef.current[mi] = now;
                    setMilestoneGenerating(prev => ({ ...prev, [mi]: true }));
                    try {
                      const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=${mi}`, { method: 'POST' });
                      if (!res.ok) {
                        let msg = 'Gagal generate milestone';
                        try { const j = await res.json(); msg = j?.error || msg; } catch {}
                        if (res.status === 409) {
                          show({ type: 'info', title: 'Sedang diproses', message: 'Sedang ada proses pembuatan lain. Coba lagi setelah selesai.' });
                        } else if (res.status === 429) {
                          show({ type: 'info', title: 'Server sibuk', message: msg });
                        } else {
                          show({ type: 'error', title: 'Gagal', message: msg });
                        }
                      } else {
                        const r = await fetch(`/api/roadmaps/${roadmapId}`); if (r.ok) setRoadmap(await r.json());
                      }
                    } catch (e: any) {
                      show({ type: 'error', title: 'Gagal', message: e?.message || 'Gagal generate milestone' });
                    } finally {
                      setMilestoneGenerating(prev => ({ ...prev, [mi]: false }));
                    }
                  }}
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          <ol className="space-y-4">
            {milestones.map((m, mi) => (
              <li key={mi} className="rounded-xl border border-slate-200 bg-white dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-[#1f1f1f] flex items-center justify-between">
                  <button type="button" onClick={() => openMilestoneModal(m, mi)} className="text-left">
                    <div className="text-xs font-semibold tracking-widest uppercase text-blue-600">{m.timeframe || `Tahap ${mi + 1}`}</div>
                    <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-neutral-100">{m.topic}</h3>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMilestoneModal(m, mi)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                    title="Lihat Detail Milestone"
                  >Detail</button>
                </div>
                {(Array.isArray((m as any).subbab) && (m as any).subbab.length) || (Array.isArray((m as any).sub_tasks) && (m as any).sub_tasks.length) ? (
                  <ul className="divide-y divide-slate-200 dark:divide-[#1f1f1f]">
                    {(Array.isArray((m as any).subbab) ? (m as any).subbab : (m as any).sub_tasks).map((task: any, ti: number) => {
                      const key = `m-${mi}-t-${ti}`;
                      const done = !!progress?.completedTasks?.[key];
                      const label = typeof task === 'string' ? task : task?.task;
                      const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone) ? (roadmap as any).content.materialsByMilestone : [];
                      const nodeMaterial = mats?.[mi]?.[ti];
                      const materialReady = !!nodeMaterial;
                      const gate = getGateForMilestone(mi);
                      const locked = !gate.ok;
                      return (
                        <li key={ti} className="flex items-center gap-3 px-5 py-3 group">
                          {done ? (
                            <CheckCircle className="h-5 w-5 text-green-600" aria-label="Selesai" />
                          ) : materialReady ? (
                            <span className="h-5 w-5 inline-flex items-center justify-center rounded-full border border-blue-400 text-blue-500 text-[10px] font-bold" title="Siap dipelajari">✓</span>
                          ) : (
                            <span className="h-5 w-5 inline-flex items-center justify-center rounded-full border border-slate-300 text-slate-300" title="Belum tersedia">•</span>
                          )}
                          {materialReady && !locked ? (
                            <Link href={`/dashboard/roadmaps/${(roadmap as any).id}/read?m=${mi}&s=${ti}`} className="flex-1 text-slate-800 dark:text-neutral-200 hover:underline truncate">{label}</Link>
                          ) : materialReady && locked ? (
                            <button
                              type="button"
                              onClick={() => { if (gate.href) router.push(gate.href); }}
                              className="flex-1 text-left text-slate-500 dark:text-neutral-500 truncate hover:underline"
                              title={gate.reason === 'need-nodes' ? 'Selesaikan subbab milestone sebelumnya' : 'Selesaikan kuis milestone sebelumnya'}
                            >{label}</button>
                          ) : (
                            <span className="flex-1 text-slate-500 dark:text-neutral-500 truncate">{label}</span>
                          )}
                          {locked ? (
                            <span className="text-[10px] uppercase tracking-wide bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-neutral-400 px-2 py-0.5 rounded">Terkunci</span>
                          ) : !materialReady && (
                            <span className="text-[10px] uppercase tracking-wide bg-slate-100 dark:bg-[#1a1a1a] text-slate-500 dark:text-neutral-400 px-2 py-0.5 rounded">Belum</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {/* Milestone generation & quiz row */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-[#1f1f1f] bg-sky-50 dark:bg-[#0b1a24] rounded-b-xl flex items-center justify-between gap-4 flex-wrap">
                  {(() => {
                    const mats: any[][] = Array.isArray((roadmap as any)?.content?.materialsByMilestone) ? (roadmap as any).content.materialsByMilestone : [];
                    const list = mats?.[mi] || [];
                    const totalSubs = Array.isArray((m as any).subbab) ? (m as any).subbab.length : (Array.isArray((m as any).sub_tasks) ? (m as any).sub_tasks.length : 0);
                    const complete = totalSubs > 0 && list.length >= totalSubs;
                    const genMeta: any = (roadmap as any)?.content?._generation || {};
                    // If server doesn't specify milestone index, assume it's the first milestone (m=0)
                    const serverGenActive = !!genMeta.inProgress && (genMeta.milestone === mi || (mi === 0 && typeof genMeta.milestone === 'undefined'));
                    // Derive header-like preparing state for first milestone: not ready, no explicit error
                    const firstList = mats?.[0];
                    const firstReady = Array.isArray(firstList) && firstList.length > 0;
                    const serverGenActiveFor0 = !!genMeta.inProgress && (genMeta.milestone === 0 || typeof genMeta.milestone === 'undefined');
                    const headerPreparingFirst = (mi === 0) && (!firstReady) && !(firstMilestoneError && !firstMilestoneGenerating && !serverGenActiveFor0);
                    // Is this milestone currently generating? (auto-first or manual on this index)
                    const generatingThis = (headerPreparingFirst ? true : false) || ((mi === 0 && firstMilestoneGenerating) ? true : false) || !!milestoneGenerating[mi] || serverGenActive;
                    const lockedByOther = !generatingThis && isOtherGenerationActive(mi);
                    const quizKey = `quiz-m-${mi}`;
                    const quizEntry: any = (progress?.completedTasks as any)?.[quizKey];
                    const quizDone = !!quizEntry?.passed;
                    const quizScore = typeof quizEntry?.score === 'number' ? quizEntry.score : null;
                    const hasQuizStored = Array.isArray((roadmap as any)?.content?.quizzesByMilestone?.[mi]) && (roadmap as any).content.quizzesByMilestone[mi].length > 0;
                    return (
                      <>
                        <div className="flex items-center gap-3 text-sky-900 dark:text-sky-300 font-medium">
                          {complete ? (
                            <CheckCircle className="h-5 w-5 text-green-600" aria-label="Materi lengkap" />
                          ) : generatingThis ? (
                            <svg className="h-5 w-5 animate-spin text-sky-500" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                          ) : (
                            <span className="h-5 w-5 inline-block rounded-full border border-slate-300" aria-hidden />
                          )}
                          <span className="text-sm">Milestone {m.topic}</span>
                          {complete && (
                            <Link href={`/dashboard/roadmaps/${(roadmap as any).id}/quiz?m=${mi}`} className="text-xs underline decoration-dotted">
                              {quizDone ? `Kuis selesai${quizScore !== null ? ` (${quizScore}%)` : ''}` : (hasQuizStored ? 'Kuis siap' : 'Kuis')}
                            </Link>
                          )}
                        </div>
                        {!complete ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={generatingThis || lockedByOther}
                              onClick={async () => {
                              if (generatingThis) return;
                              if (lockedByOther) {
                                try {
                                  const genMeta: any = (roadmap as any)?.content?._generation || {};
                                  const activeMi: number | undefined = typeof genMeta.milestone === 'number' ? genMeta.milestone : undefined;
                                  const activeTopic: string | undefined = (Array.isArray((roadmap as any)?.content?.milestones) && typeof activeMi === 'number') ? (roadmap as any).content.milestones[activeMi]?.topic : undefined;
                                  show({ type: 'info', title: 'Sedang diproses', message: activeTopic ? `Pembuatan "${activeTopic}" sedang berjalan. Tunggu selesai dahulu sebelum memulai yang lain.` : 'Sedang ada proses pembuatan milestone lain. Tunggu selesai dahulu.' });
                                } catch {
                                  show({ type: 'info', title: 'Sedang diproses', message: 'Sedang ada proses pembuatan milestone lain. Tunggu selesai dahulu.' });
                                }
                                return;
                              }
                              const now = Date.now();
                              const last = lastMilestoneClickRef.current[mi] || 0;
                              if (now - last < 1000) return; // debounce 1s
                              lastMilestoneClickRef.current[mi] = now;
                              setMilestoneGenerating(prev => ({ ...prev, [mi]: true }));
                              try {
                                const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=${mi}`, { method: 'POST' });
                                if (!res.ok) {
                                  let msg = 'Gagal generate milestone';
                                  try { const j = await res.json(); msg = j?.error || msg; } catch {}
                                  if (res.status === 409) {
                                    show({ type: 'info', title: 'Sedang diproses', message: 'Sedang ada proses pembuatan lain. Coba lagi setelah selesai.' });
                                  } else if (res.status === 429) {
                                    show({ type: 'info', title: 'Server sibuk', message: msg });
                                  } else {
                                    show({ type: 'error', title: 'Gagal', message: msg });
                                  }
                                } else {
                                  const r = await fetch(`/api/roadmaps/${roadmapId}`); if (r.ok) setRoadmap(await r.json());
                                }
                              } catch (e: any) {
                                show({ type: 'error', title: 'Gagal', message: e?.message || 'Gagal generate milestone' });
                              } finally {
                                setMilestoneGenerating(prev => ({ ...prev, [mi]: false }));
                              }
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed"
                            >{generatingThis ? (
                              <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" /></svg>
                                {mi === 0 ? 'Menyiapkan…' : 'Generate Milestone…'}
                              </>
                            ) : 'Generate Milestone'}</button>
                            {generatingThis ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 text-slate-600 px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                                title="Batalkan pembuatan milestone"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=${mi}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      show({ type: 'success', title: 'Dibatalkan', message: 'Pembuatan milestone dibatalkan.' });
                                    }
                                  } catch {}
                                  setMilestoneGenerating(prev => ({ ...prev, [mi]: false }));
                                  if (mi === 0) setFirstMilestoneGenerating(false);
                                  try {
                                    const r = await fetch(`/api/roadmaps/${roadmapId}`);
                                    if (r.ok) setRoadmap(await r.json());
                                  } catch {}
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 11-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" /></svg>
                                Batalkan
                              </button>
                            ) : null}
                          </div>
                        ) : (
                          mi === 0 ? (
                            <Link
                              href={`/dashboard/roadmaps/${(roadmap as any).id}/read?m=0&s=0`}
                              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-700"
                            >Buka</Link>
                          ) : null
                        )}
                      </>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
      {/* Node Detail Modal for saved roadmaps */}
  {selectedMilestone && (
        <Transition as={Fragment} show={true} appear>
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0">
              <div className="fixed inset-0 transition-opacity bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedMilestone(null); setSelectedIndex(null); }} />
            </Transition.Child>
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <div className="relative bg-white dark:bg-[#0f0f0f] rounded-2xl shadow-2xl w-[min(92vw,720px)] max-h-[80vh] flex flex-col overflow-hidden">
                <header className="flex items-center justify-between flex-shrink-0 p-4 border-b border-slate-200 dark:border-[#1f1f1f]">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold tracking-widest uppercase text-blue-600">{selectedMilestone.timeframe || 'Tahap'}</div>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">{selectedMilestone.topic}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-neutral-400">
                      {selectedMilestone.estimated_dates ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">{selectedMilestone.estimated_dates}</span>
                      ) : null}
                      {selectedMilestone.daily_duration ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-[#121212] px-2 py-1">{selectedMilestone.daily_duration}/hari</span>
                      ) : null}
                    </div>
                  </div>
                  <button onClick={() => { setSelectedMilestone(null); setSelectedIndex(null); }} className="p-1 transition-colors rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-[#1a1a1a]" aria-label="Tutup modal">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </header>
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="mb-4">
                    <div className="text-xs font-semibold tracking-wider text-slate-500 mb-1">Ringkasan Singkat</div>
                    {nodeSummary ? (
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-neutral-300 whitespace-pre-wrap">{nodeSummary}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="h-3.5 bg-slate-200/70 rounded w-5/6 animate-pulse"></div>
                        <div className="h-3.5 bg-slate-200/70 rounded w-full animate-pulse"></div>
                        <div className="h-3.5 bg-slate-200/70 rounded w-4/6 animate-pulse"></div>
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-slate-800 dark:text-neutral-200 text-sm">Subbab</h3>
                  {Array.isArray((selectedMilestone as any).subbab) && (selectedMilestone as any).subbab.length ? (
                    <ol className="mt-2 space-y-2 text-sm list-decimal list-inside text-slate-700 dark:text-neutral-300">
                      {(selectedMilestone as any).subbab.map((title: string, ti: number) => (
                        <li key={ti} className="leading-relaxed">{title}</li>
                      ))}
                    </ol>
                  ) : Array.isArray((selectedMilestone as any).sub_tasks) && (selectedMilestone as any).sub_tasks.length ? (
                    <ol className="mt-2 space-y-2 text-sm list-decimal list-inside text-slate-700 dark:text-neutral-300">
                      {(selectedMilestone as any).sub_tasks.map((task: any, ti: number) => (
                        <li key={ti} className="leading-relaxed">{typeof task === 'string' ? task : task?.task}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">Belum ada rincian subbab untuk materi ini.</p>
                  )}
                 </div>
                {/* Footer with conditional Start Learning button */}
                {(() => {
                  try {
                    const content: any = roadmap?.content || {};
                    const expectedLen = Array.isArray((selectedMilestone as any).subbab)
                      ? (selectedMilestone as any).subbab.length
                      : (Array.isArray((selectedMilestone as any).sub_tasks) ? (selectedMilestone as any).sub_tasks.length : 0);
                    const byMilestone: any[][] = Array.isArray(content?.materialsByMilestone) ? content.materialsByMilestone : [];
                    const mIdx = typeof selectedIndex === 'number' ? selectedIndex : -1;
                    const mats = mIdx >= 0 ? (byMilestone[mIdx] || []) : [];
                    const complete = expectedLen > 0 && mats.length >= expectedLen;
                    return (
                      <div className="flex items-center justify-end gap-2 p-3 border-t border-slate-200 dark:border-[#1f1f1f]">
                        {complete ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-semibold hover:bg-blue-700"
                            onClick={() => {
                              const idx = typeof selectedIndex === 'number' ? selectedIndex : 0;
                              router.push(`/dashboard/roadmaps/${(roadmap as any).id}/read?m=${idx}&s=0`);
                            }}
                          >Mulai Belajar</button>
                        ) : (
                          <span className="text-xs text-slate-500">Materi belum lengkap untuk milestone ini.</span>
                        )}
                      </div>
                    );
                  } catch {
                    return null;
                  }
                })()}
              </div>
            </Transition.Child>
          </div>
        </Transition>
      )}
    </div>
  );
}
