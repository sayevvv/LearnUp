// app/dashboard/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import RoadmapCard from '@/components/RoadmapCard';
import InProgressScroller from '@/components/InProgressScroller';
import DeveloperChoiceSidebar from '../../components/DeveloperChoiceSidebar';
import DashboardTabs from '@/components/DashboardTabs';
import GuardedLink from '@/components/GuardedLink';
import LandingHeader from '@/components/LandingHeader';
import Image from 'next/image';

export default async function DashboardHomePage() {
  const session = (await getServerSession(authOptions as any)) as any;
  const s: any = session || {};
  // Guests can browse popular and for-you (limited). Some sections may be empty.

  // Simplified flow: no redirect here. Users may arrive from onboarding after login.

  // Query sections: In-Progress, Recommended Topics, Popular, For You
  const [inProgress, recommendedTopics, popular, forYou] = await Promise.all([
    // Roadmaps currently being learned by the user (0% < progress < 100%)
    (async () => {
      try {
        const items = await (prisma as any).roadmap.findMany({
          where: { userId: s.user.id, progress: { is: { percent: { gt: 0, lt: 100 } } } },
          orderBy: { progress: { updatedAt: 'desc' } },
          take: 12,
          select: { id: true, title: true, slug: true, published: true, user: { select: { name: true, image: true } }, progress: { select: { percent: true, updatedAt: true } } },
        });
        const ids = items.map((i: any) => i.id);
        const topicRows = ids.length ? await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: ids } }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] }) : [];
        const byRoadmap: Record<string, any[]> = {};
        for (const r of topicRows) {
          (byRoadmap[r.roadmapId] ||= []).push({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary });
        }
        const aggRows = ids.length ? await (prisma as any).roadmapAggregates.findMany({ where: { roadmapId: { in: ids } } }) : [];
        const aggById: Record<string, { avgStars?: number; ratingsCount?: number }> = Object.fromEntries(
          aggRows.map((a: any) => [a.roadmapId, { avgStars: a.avgStars ?? 0, ratingsCount: a.ratingsCount ?? 0 }])
        );
        return items.map((i: any) => ({
          ...i,
          topics: (byRoadmap[i.id] || []).slice(0, 5),
          avgStars: aggById[i.id]?.avgStars ?? 0,
          ratingsCount: aggById[i.id]?.ratingsCount ?? 0,
        }));
      } catch {
        return [];
      }
    })(),
    // Recommend topics by global usage
    (async () => {
      try {
        const rows = await (prisma as any).roadmapTopic.groupBy({ by: ['topicId'], _count: { topicId: true }, orderBy: { _count: { topicId: 'desc' } }, take: 8 });
        const ids = rows.map((r: any) => r.topicId);
        const topics = await (prisma as any).topic.findMany({ where: { id: { in: ids } } });
        const byId: Record<string, any> = Object.fromEntries((topics as any).map((t: any) => [t.id, t]));
        return rows.map((r: any) => byId[r.topicId]).filter(Boolean);
      } catch { return []; }
    })(),
    // Popular public roadmaps
    (async () => {
      try {
        const items = await (prisma as any).roadmap.findMany({
          where: { published: true },
          orderBy: [{ createdAt: 'desc' }],
          take: 24,
          select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } },
        });
        const agg = await (prisma as any).roadmapAggregates.findMany({ where: { roadmapId: { in: items.map((i: any) => i.id) } } });
        const byId: Record<string, any> = Object.fromEntries(agg.map((a: any) => [a.roadmapId, a]));
        const topicRows = items.length ? await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: items.map((i: any) => i.id) } }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] }) : [];
        const topicsByRoadmap: Record<string, Array<{ slug: string; name: string; isPrimary: boolean }>> = {};
        for (const r of topicRows) {
          const arr = (topicsByRoadmap[r.roadmapId] ||= []);
          if (r.topic) arr.push({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary });
        }
        return items
          .map((i: any) => ({ ...i, avgStars: byId[i.id]?.avgStars ?? 0, ratingsCount: byId[i.id]?.ratingsCount ?? 0, bayesianScore: byId[i.id]?.bayesianScore ?? 0 }))
          .map((i: any) => ({ ...i, topics: (topicsByRoadmap[i.id] || []).slice(0, 5) }))
          .sort((a: any, b: any) => (b.bayesianScore ?? 0) - (a.bayesianScore ?? 0) || (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0))
          .slice(0, 12);
      } catch { return []; }
    })(),
    // For You
    (async () => {
      try {
        const my = await (prisma as any).roadmap.findMany({ where: { userId: s.user.id }, select: { id: true } });
        const myIds = my.map((m: any) => m.id);
        const myTopics = await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: myIds } }, select: { topicId: true } });
        const topicIds = Array.from(new Set(myTopics.map((t: any) => t.topicId)));
        const candidates = await (prisma as any).roadmapTopic.findMany({ where: { topicId: { in: topicIds } }, select: { roadmapId: true } });
        const roadmapIds = Array.from(new Set(candidates.map((c: any) => c.roadmapId)));
  const items = await (prisma as any).roadmap.findMany({ where: { id: { in: roadmapIds }, published: true }, select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } }, take: 12 });
        const agg = await (prisma as any).roadmapAggregates.findMany({ where: { roadmapId: { in: items.map((i: any) => i.id) } } });
        const byId: Record<string, any> = Object.fromEntries(agg.map((a: any) => [a.roadmapId, a]));
        const topicRows = items.length ? await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: items.map((i: any) => i.id) } }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] }) : [];
        const byRoadmap2: Record<string, any[]> = {};
        for (const r of topicRows) {
          (byRoadmap2[r.roadmapId] ||= []).push({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary });
        }
        return items.map((i: any) => ({ ...i, avgStars: byId[i.id]?.avgStars ?? 0, ratingsCount: byId[i.id]?.ratingsCount ?? 0, topics: (byRoadmap2[i.id] || []).slice(0, 5) }));
      } catch { return []; }
    })(),
  ]);

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      {/* Global header with login button for guests */}
      <div className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-black/60 backdrop-blur">
          <Link href="/dashboard" className="text-base font-semibold text-slate-900 dark:text-white">NextStep</Link>
          {s?.user?.id ? (
            <Link
              href="/dashboard/profile"
              className="group inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/60 px-2 py-1 pr-3 text-sm text-slate-700 backdrop-blur hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-neutral-200 dark:hover:bg-white/10"
            >
              {/* Avatar */}
              {s.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.user.image}
                  alt={s.user.name || 'User'}
                  className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-semibold dark:bg-white dark:text-black">
                  {(s.user?.name || 'U').charAt(0).toUpperCase()}
                </span>
              )}
              <span className="hidden md:inline-block max-w-[140px] truncate font-medium">{s.user?.name || 'Profil'}</span>
            </Link>
          ) : (
            <Link href="/login?callbackUrl=%2Fdashboard" className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200">Masuk</Link>
          )}
        </div>
      </div>
      {/* Hero CTA */}
      <div className="relative">
        {/* Hero image using next/image for optimization & priority to improve LCP */}
        <div className="relative h-48 md:h-60 w-full overflow-hidden">
          <Image
            src="/assets/login.jpg"
            alt="Hero"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 100vw"
            className="object-cover"
            placeholder="blur"
            blurDataURL="/assets/placeholder_edit.png"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="max-w-6xl mx-auto w-full px-6">
            <div className="text-white text-center">
              <h1 className="text-2xl md:text-3xl font-bold">Buat roadmap-mu sendiri</h1>
              <p className="mt-1 text-sm md:text-base text-white/90">Mulai perjalanan belajar sesuai tujuanmu.</p>
              <div className="mt-4">
                <GuardedLink href="/dashboard/new" className="group relative inline-flex items-center justify-center">
                  {/* Glow/backlight */}
                  <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 opacity-60 blur-md transition-all duration-300 group-hover:opacity-80 group-hover:blur-lg group-active:opacity-100 group-active:blur-xl" aria-hidden />
                  {/* Button body */}
                  <span className="relative rounded-xl bg-white/95 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-white/60 transition-transform duration-150 group-hover:scale-[1.02] group-active:scale-95 dark:bg-white/10 dark:text-white dark:ring-white/20">
                    Buat Roadmap
                  </span>
                </GuardedLink>
              </div>
            </div>
          </div>
        </div>
      </div>

  <div className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main feed */}
        <div>
          {/* In-Progress horizontal scroller */}
          {Array.isArray(inProgress) && inProgress.length > 0 ? (
            <InProgressScroller items={inProgress as any} />
          ) : null}

          <DashboardTabs forYou={forYou} popular={popular} />
        </div>

    {/* Right column */}
  <aside className="sticky top-6 self-start">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Recommended Topics</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendedTopics.length === 0 ? (
                <span className="text-xs text-slate-500">Belum ada</span>
              ) : recommendedTopics.map((t: any) => (
                <Link key={t.id} href={`/dashboard/browse?topic=${encodeURIComponent(t.slug)}`} className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100">{t.name}</Link>
              ))}
            </div>
          </div>

          <DeveloperChoiceSidebar />
        </aside>
        </div>
      </div>
    </div>
  );
}
