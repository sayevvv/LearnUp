// app/dashboard/roadmaps/[id]/read/page.tsx
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound, redirect } from 'next/navigation';
import ReaderProgressClient from '@/components/ReaderProgressClient';
import ReaderAssistantBubble from '@/components/ReaderAssistantBubble';
import ReaderScrollReset from '@/components/ReaderScrollReset';
import NextMaterialLink from '@/components/NextMaterialLink';
import ReaderHeroImageServer from '@/components/ReaderHeroImageServer';
import ThirdPartyNoiseGuard from '@/components/ThirdPartyNoiseGuard';
import PrefetchImage from '@/components/PrefetchImage';
import ReaderRightTOC from '@/components/ReaderRightTOC';
import FlashcardsInline from '@/components/FlashcardsInline';
import PostStudyRatePrompt from '@/components/PostStudyRatePrompt';

export default async function ReadMaterialPage(props: any) {
  const { id } = await (props as any).params;
  const sp = await (props as any).searchParams;
  // Auth: require session
  const session = (await getServerSession(authOptions as any)) as any;
  const mParam = Number((sp?.m as any) ?? 0) || 0;
  const sParam = Number((sp?.s as any) ?? 0) || 0;
  if (!session?.user?.id) {
    const qs = `?m=${encodeURIComponent(mParam)}&s=${encodeURIComponent(sParam)}`;
    return redirect(`/login?callbackUrl=${encodeURIComponent(`/dashboard/roadmaps/${id}/read${qs}`)}`);
  }
  // Ownership: only allow owner to access
  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId: session.user.id }, include: { progress: true } });
  if (!roadmap) return notFound();
  const content: any = (roadmap as any).content || {};
  const byMilestone: any[][] = Array.isArray((content as any).materialsByMilestone) ? (content as any).materialsByMilestone : [];
  // Clamp m/s to valid bounds
  const m = Math.min(Math.max(0, mParam), Math.max(0, byMilestone.length - 1));
  const s = Math.min(
    Math.max(0, sParam),
    Math.max(0, ((byMilestone?.[m] as any[])?.length || 1) - 1)
  );
  const current = byMilestone?.[m]?.[s];

  const next = (() => {
    if (!byMilestone?.length) return null;
    let nm = m, ns = s + 1;
    if (!byMilestone[nm] || !byMilestone[nm][ns]) {
      nm = m + 1; ns = 0;
      if (!byMilestone[nm] || !byMilestone[nm][ns]) return null;
    }
    return { m: nm, s: ns };
  })();
  const prev = (() => {
    if (!byMilestone?.length) return null;
    let pm = m, ps = s - 1;
    if (!byMilestone[pm] || !byMilestone[pm][ps]) {
      pm = m - 1;
      if (pm < 0 || !byMilestone[pm] || byMilestone[pm].length === 0) return null;
      ps = byMilestone[pm].length - 1;
    }
    return { m: pm, s: ps };
  })();

  const thisMilestone: any[] = Array.isArray(byMilestone?.[m]) ? byMilestone[m] : [];
  const totalCurrentMilestone = thisMilestone.length;
  const indicator = totalCurrentMilestone > 0 ? `Subbab ${s + 1} dari ${totalCurrentMilestone}` : '';
  const hasNextInSameMilestone = !!thisMilestone?.[s + 1];
  const isLastInMilestone = totalCurrentMilestone > 0 && !hasNextInSameMilestone;
  const quizKey = `quiz-m-${m}`;
  const quizPassed = !!(roadmap as any).progress?.completedTasks?.[quizKey]?.passed;
  // Prepare next image prefetch (based on existing milestone vars)
  const nextSeed = hasNextInSameMilestone
    ? `${roadmap.id}-${m}-${s + 1}`
    : (Array.isArray(byMilestone?.[m + 1]) && byMilestone[m + 1].length > 0 ? `${roadmap.id}-${m + 1}-0` : undefined);
  const prefetchNext = nextSeed ? `https://picsum.photos/seed/${encodeURIComponent(nextSeed)}/1200/480` : undefined;

  // Enforce quiz gating: to access milestone m (>0), previous quiz must be passed
  if (m > 0) {
    const prevKey = `quiz-m-${m - 1}`;
    const passed = (roadmap as any).progress?.completedTasks?.[prevKey]?.passed === true;
    if (!passed) {
      redirect(`/dashboard/roadmaps/${roadmap.id}/quiz?m=${m - 1}`);
    }
  }

  return (
  <div id="reader-scroller" className="h-full overflow-y-auto bg-white">
      <header className="relative p-6 border-b border-slate-200">
        <Link href={`/dashboard/roadmaps/${roadmap.id}`} className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Kembali</span>
        </Link>
        <div className="text-center">
          <div className="text-sm text-slate-500">{roadmap.title}</div>
          <h1 className="text-xl font-bold text-slate-900">Materi Belajar</h1>
          {indicator ? <div className="text-xs text-slate-500 mt-1">{indicator}</div> : null}
        </div>
        {/* Optional right-side slot
        <div className="hidden sm:block absolute right-6 top-1/2 -translate-y-1/2 text-sm text-slate-600">Progress</div>
        */}
      </header>
  <div className="p-6 xl:flex xl:items-start xl:gap-6">
        {/* Left: TOC (smallest) */}
  <div className="hidden xl:block xl:w-[22rem] xl:flex-none">
          <ReaderRightTOC
            title={Array.isArray(content?.milestones) && content.milestones[m]?.topic ? `Tahap: ${content.milestones[m].topic}` : 'Dalam tahap ini'}
            items={(Array.isArray(byMilestone?.[m]) ? byMilestone[m] : []).map((it: any, idx: number) => ({
              label: String(it?.title || `Subbab ${idx + 1}`),
              href: `/dashboard/roadmaps/${roadmap.id}/read?m=${m}&s=${idx}`
            }))}
            currentIndex={s}
            variant="fixed"
          />
        </div>

        {/* Center: Main content (widest) */}
        <main className="min-w-0 xl:max-w-none xl:flex-1">
        {!current ? (
          <div className="text-slate-500">Materi belum disiapkan. Silakan kembali dan klik tombol Mulai Belajar.</div>
        ) : (
          <article className="mb-10" key={`${roadmap.id}-${m}-${s}`}>
            {/* Dispatch current context to the assistant bubble */}
            <script dangerouslySetInnerHTML={{ __html: `
              (function(){
                try{
                  const ev = new CustomEvent('reader:context', { detail: ${JSON.stringify({ title: current?.title || '', body: current?.body || '', points: Array.isArray(current?.points) ? current.points : [], roadmapId: roadmap.id, m, s })} });
                  window.dispatchEvent(ev);
                }catch(e){}
              })();
            `}} />
            <ReaderHeroImageServer seed={`${roadmap.id}-${m}-${s}`} />
            {/* Preload next material hero image to avoid blank on fast navigation */}
            <PrefetchImage src={prefetchNext} />
            <h2 className="mt-6 text-lg font-bold text-slate-900">{current.title}</h2>
            <div className="mt-2 whitespace-pre-wrap text-slate-700 leading-7">{current.body}</div>
            {Array.isArray(current.points) && current.points.length ? (
              <div className="mt-4">
                {current.points.map((p: string, pi: number) => (
                  <div key={pi} className="font-semibold text-slate-800 mt-3">{p}</div>
                ))}
              </div>
            ) : null}
            {/* Inline Flashcards, generated from current material context */}
            <FlashcardsInline initialCtx={{ title: current?.title || '', body: current?.body || '', points: Array.isArray(current?.points) ? current.points : [], roadmapId: roadmap.id, m, s }} />
            <div id="read-end-sentinel" className="mt-10 h-px" />
            <div className="mt-10 flex items-center justify-between">
              {/* Left: Previous material (if available) */}
              {prev ? (
                <Link
                  href={`/dashboard/roadmaps/${roadmap.id}/read?m=${prev.m}&s=${prev.s}`}
                  className="inline-flex items-center gap-2 text-blue-700 font-semibold"
                >
                  ← Materi Sebelumnya
                </Link>
              ) : (
                <span />
              )}
              {/* Right: Next/Quiz/Back logic */}
              {(() => {
                // If not last in current milestone, go to next material within the same milestone
        if (!isLastInMilestone && next) {
                  return (
                    <NextMaterialLink
          href={`/dashboard/roadmaps/${roadmap.id}/read?m=${m}&s=${s + 1}`}
                      roadmapId={roadmap.id}
                      m={m}
                      s={s}
                      className="inline-flex items-center gap-2 text-blue-700 font-semibold"
                    >
                      Materi Selanjutnya →
                    </NextMaterialLink>
                  );
                }
                // Last in milestone: by default, go to quiz for this node
                if (isLastInMilestone && !quizPassed) {
                  return (
                    <NextMaterialLink
                      href={`/dashboard/roadmaps/${roadmap.id}/quiz?m=${m}`}
                      roadmapId={roadmap.id}
                      m={m}
                      s={s}
                      className="inline-flex items-center gap-2 text-blue-700 font-semibold"
                    >
                      Lanjut ke Kuis →
                    </NextMaterialLink>
                  );
                }
                // If quiz already passed, go to next milestone's first material if available
                const hasNextMilestone = Array.isArray(byMilestone?.[m + 1]) && byMilestone[m + 1].length > 0;
                if (isLastInMilestone && quizPassed && hasNextMilestone) {
                  return (
                    <NextMaterialLink
                      href={`/dashboard/roadmaps/${roadmap.id}/read?m=${m + 1}&s=0`}
                      roadmapId={roadmap.id}
                      m={m}
                      s={s}
                      className="inline-flex items-center gap-2 text-blue-700 font-semibold"
                    >
                      Lanjut ke Tahap Berikutnya →
                    </NextMaterialLink>
                  );
                }
                // Otherwise, back to roadmap
                return (
                  <Link href={`/dashboard/roadmaps/${roadmap.id}`} className="inline-flex items-center gap-2 text-slate-700 font-semibold">
                    Kembali ke Roadmap
                  </Link>
                );
              })()}
            </div>
          </article>
        )}
        </main>

  {/* Right rail (reserved width on xl to balance layout) */}
  <div className="hidden xl:block xl:w-[22rem] xl:flex-none" />
      </div>
    <ReaderProgressClient roadmapId={roadmap.id} m={m} s={s} />
  {/* Ensure scroll resets to top on subbab change */}
  <ReaderScrollReset deps={[m, s]} behavior="smooth" />
  {/* Suppress noisy errors from browser extensions like QuillBot */}
  <ThirdPartyNoiseGuard />
  {/* Assistant bubble mounted globally so mobile gets floating launcher and overlay */}
  <ReaderAssistantBubble />
  {/* Encourage rating only when this roadmap comes from a public source (hide for self-generated) */}
  { (roadmap as any).sourceId ? (
    <PostStudyRatePrompt sourceRoadmapId={(roadmap as any).sourceId} sourceSlug={(roadmap as any).slug} />
  ) : null }
    </div>
  );
}
