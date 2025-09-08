"use client";

import Link from 'next/link';
import React from 'react';

type RoadmapItem = {
  id: string;
  title: string;
  updatedAt: string | Date;
  content?: any;
  topics?: Array<{ slug: string; name: string; isPrimary?: boolean }>;
};

export default function RoadmapGridClient({ items }: { items: RoadmapItem[] }) {
  const [preparingId, setPreparingId] = React.useState<string | null>(null);
  const [readyMap, setReadyMap] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    const url = new URL(window.location.href);
    const created = url.searchParams.get('created');
    if (created) {
      setPreparingId(created);
      (async () => {
        try {
          await fetch(`/api/roadmaps/${created}/prepare-materials`, { method: 'POST' });
        } catch {}
        setReadyMap((m) => ({ ...m, [created]: true }));
        url.searchParams.delete('created');
        window.history.replaceState({}, '', url.toString());
      })();
    }
  }, []);

  const isReady = (id: string) => readyMap[id] || id !== preparingId;
  const isGenerating = (r: RoadmapItem) => {
    try {
      const gen = (r as any)?.content?._generation || {};
      if (!gen?.inProgress) return false;
      const started = Date.parse(gen?.startedAt || '');
      if (!started || Number.isNaN(started)) return true;
      // consider active if within 45 minutes since start
      return (Date.now() - started) < 45 * 60 * 1000;
    } catch {
      return false;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map((r) => {
  const gated = !isReady(r.id) || isGenerating(r);
        const updated = new Date(r.updatedAt);
        const primaryTopic = Array.isArray(r.topics) && r.topics.length
          ? (r.topics.find(t => t.isPrimary) || r.topics[0])
          : null;
        return (
          <Link href={`/dashboard/roadmaps/${r.id}?from=roadmaps`} key={r.id} className={`relative block rounded-2xl border border-slate-200 hover:border-blue-300 transition-all bg-white p-4 pb-14 dark:bg-[#0b0b0b]`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-[15px] sm:text-base font-semibold text-slate-900 truncate dark:text-slate-100">{r.title}</h3>
              {gated ? (
                <div className="flex items-center gap-2 text-xs text-slate-500"><span className="inline-block h-2 w-2 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" /> Menyiapkan materi…</div>
              ) : null}
            </div>
            {/* Inline topic chips removed; bottom-right chip is shown instead */}
            <div className="text-sm text-slate-500 mt-2 dark:text-slate-400">Diperbarui {updated.toLocaleString('id-ID')}</div>
            {/* Bottom bar: only topic chip on the right; entire card is clickable */}
            <div className="absolute inset-x-4 bottom-3 flex items-center justify-end pointer-events-none">
              {primaryTopic ? (
                <span
                  className={`px-2 py-0.5 text-[11px] rounded-full border ${primaryTopic.isPrimary ? 'bg-blue-50/90 border-blue-300 text-blue-700' : 'bg-slate-50/90 border-slate-200 text-slate-600'}`}
                  title={primaryTopic.isPrimary ? 'Topik Utama' : 'Topik'}
                >
                  {primaryTopic.name}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
