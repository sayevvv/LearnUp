"use client";
import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ReaderHeroImageServer from '@/components/ReaderHeroImageServer';
import PrefetchImage from '@/components/PrefetchImage';
import FlashcardsInline from '@/components/FlashcardsInline';
import NextMaterialLink from '@/components/NextMaterialLink';

interface MaterialNode {
  milestoneIndex: number;
  subIndex: number;
  title: string;
  body: string;
  points: string[];
  heroImage?: string;
}

interface IncrementalMaterialProps {
  roadmapId: string;
  m: number;
  s: number;
  initialMaterial: MaterialNode | null;
  expectedSubs: number; // expected subbab count in this milestone
  byMilestone: any[][]; // existing materials matrix snapshot
  quizPassed: boolean;
  hasNextMilestone: boolean;
  milestoneTopic: string;
}

export default function IncrementalMaterial({ roadmapId, m, s, initialMaterial, expectedSubs, byMilestone, quizPassed, hasNextMilestone, milestoneTopic }: IncrementalMaterialProps) {
  const [material, setMaterial] = useState<MaterialNode | null>(initialMaterial);
  const [loading, setLoading] = useState(!initialMaterial);
  const [error, setError] = useState<string | null>(null);
  const [backgroundGen, setBackgroundGen] = useState(false);

  const fetchRoadmapAndExtract = useCallback(async () => {
    try {
      const res = await fetch(`/api/roadmaps/${roadmapId}`);
      if (!res.ok) throw new Error('Gagal memuat materi');
      const data = await res.json();
      const mats: any[][] = Array.isArray(data?.content?.materialsByMilestone) ? data.content.materialsByMilestone : [];
      const cur = mats?.[m]?.[s] || null;
      if (cur) setMaterial(cur);
      return mats;
    } catch (e: any) {
      setError(e.message || 'Gagal memuat materi');
      return [];
    }
  }, [roadmapId, m, s]);

  // Generate current node if missing
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (material) return; // already present
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=${m}&s=${s}`, { method: 'POST' });
        if (!res.ok) {
          let msg = 'Gagal generate materi';
            try { const j = await res.json(); msg = j?.error || msg; } catch {}
          throw new Error(msg);
        }
        if (aborted) return;
        await fetchRoadmapAndExtract();
      } catch (e: any) {
        if (!aborted) setError(e.message || 'Gagal generate materi');
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [material, roadmapId, m, s, fetchRoadmapAndExtract]);

  // Background generate next subbab if exists and missing
  useEffect(() => {
    let aborted = false;
    (async () => {
      if (!material) return; // wait until current loaded
      const nextIndex = s + 1;
      if (nextIndex >= expectedSubs) return;
      const mats = byMilestone;
      const haveNext = Array.isArray(mats?.[m]) && mats[m][nextIndex];
      if (haveNext) return;
      setBackgroundGen(true);
      try {
        const res = await fetch(`/api/roadmaps/${roadmapId}/prepare-materials?m=${m}&s=${nextIndex}`, { method: 'POST' });
        if (!res.ok) return; // silent fail
      } finally {
        if (!aborted) setBackgroundGen(false);
      }
    })();
    return () => { aborted = true; };
  }, [material, roadmapId, m, s, expectedSubs, byMilestone]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-1/2 bg-slate-200 animate-pulse rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-slate-200 animate-pulse rounded" />
          <div className="h-4 w-3/5 bg-slate-200 animate-pulse rounded" />
        </div>
        <div className="text-xs text-slate-500">Menyiapkan materi…</div>
      </div>
    );
  }
  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }
  if (!material) {
    return <div className="text-sm text-slate-500">Materi belum tersedia.</div>;
  }

  const thisMilestoneMaterials = Array.isArray(byMilestone?.[m]) ? byMilestone[m] : [];
  const totalCurrentMilestone = thisMilestoneMaterials.length;
  const hasNextInSame = totalCurrentMilestone > 0 && !!thisMilestoneMaterials[s + 1];
  const isLastInMilestone = totalCurrentMilestone > 0 && !hasNextInSame;
  const next = (() => {
    if (!thisMilestoneMaterials?.length) return null;
    let nm = m, ns = s + 1;
    if (!thisMilestoneMaterials[ns]) {
      nm = m + 1; ns = 0;
      // we only know existence from original snapshot; navigation will refetch
      if (!byMilestone[nm] || !byMilestone[nm][ns]) return null;
    }
    return { m: nm, s: ns };
  })();

  return (
    <article className="mb-10" key={`${roadmapId}-${m}-${s}`}>
      <ReaderHeroImageServer seed={`${roadmapId}-${m}-${s}`} />
      <h2 className="mt-6 text-lg font-bold text-slate-900">{material.title}</h2>
      <div className="mt-2 whitespace-pre-wrap text-slate-700 leading-7">{material.body}</div>
      {Array.isArray(material.points) && material.points.length ? (
        <div className="mt-4">
          {material.points.map((p: string, pi: number) => (
            <div key={pi} className="font-semibold text-slate-800 mt-3">{p}</div>
          ))}
        </div>
      ) : null}
      <FlashcardsInline initialCtx={{ title: material?.title || '', body: material?.body || '', points: Array.isArray(material?.points) ? material.points : [], roadmapId, m, s }} />
      <div className="mt-10 flex items-center justify-between">
        <span />
        {(() => {
          if (!isLastInMilestone && hasNextInSame) {
            return (
              <NextMaterialLink
                href={`/dashboard/roadmaps/${roadmapId}/read?m=${m}&s=${s + 1}`}
                roadmapId={roadmapId}
                m={m}
                s={s}
                className="inline-flex items-center gap-2 text-blue-700 font-semibold"
              >Materi Selanjutnya →</NextMaterialLink>
            );
          }
          if (isLastInMilestone && !quizPassed) {
            return (
              <NextMaterialLink
                href={`/dashboard/roadmaps/${roadmapId}/quiz?m=${m}`}
                roadmapId={roadmapId}
                m={m}
                s={s}
                className="inline-flex items-center gap-2 text-blue-700 font-semibold"
              >Lanjut ke Kuis →</NextMaterialLink>
            );
          }
            if (isLastInMilestone && quizPassed && hasNextMilestone) {
            return (
              <NextMaterialLink
                href={`/dashboard/roadmaps/${roadmapId}/read?m=${m + 1}&s=0`}
                roadmapId={roadmapId}
                m={m}
                s={s}
                className="inline-flex items-center gap-2 text-blue-700 font-semibold"
              >Lanjut ke Tahap Berikutnya →</NextMaterialLink>
            );
          }
          return (
            <Link href={`/dashboard/roadmaps/${roadmapId}`} className="inline-flex items-center gap-2 text-slate-700 font-semibold">
              Kembali ke Roadmap
            </Link>
          );
        })()}
      </div>
      {backgroundGen ? <div className="mt-3 text-xs text-slate-500">Menyiapkan materi berikutnya…</div> : null}
    </article>
  );
}
