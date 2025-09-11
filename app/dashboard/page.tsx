// app/dashboard/page.tsx
import { prisma } from '@/lib/prisma';
import InProgressScroller from '@/components/InProgressScroller';
import DeveloperChoiceSidebar from '../../components/DeveloperChoiceSidebar';
import DashboardTabs from '@/components/DashboardTabs';
import Link from 'next/link';
import GuardedLink from '@/components/GuardedLink';
import DashboardHydrator from '@/components/DashboardHydrator';
import LidmInfoButton from '@/components/LidmInfoButton';

// Async section components (server) ------------------
async function InProgressSection({ promise }: { promise: Promise<any[]> }) {
  const data = await promise;
  if (!data?.length) return null;
  return <InProgressScroller items={data as any} />;
}

async function TabsSection({ popularPromise, forYouPromise }: { popularPromise: Promise<any[]>; forYouPromise: Promise<any[]> }) {
  const [popular, forYou] = await Promise.all([popularPromise, forYouPromise]);
  return <DashboardTabs popular={popular} forYou={forYou} />;
}

async function RecommendedTopics({ promise }: { promise: Promise<any[]> }) {
  const topics = await promise;
  if (!topics?.length) return <span className="text-xs text-slate-500">Belum ada</span>;
  return (
    <>
      {topics.map((t: any) => (
        <Link key={t.id} href={`/dashboard/browse?topic=${encodeURIComponent(t.slug)}`} className="px-2 py-1 rounded-full border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#0f0f0f] dark:text-neutral-200 dark:hover:bg-[#1a1a1a]">
          {t.name}
        </Link>
      ))}
    </>
  );
}

// --- Data loaders (can be cached / streamed) ---
async function loadInProgress(userId?: string) {
  if (!userId) return [];
  try {
    const items = await (prisma as any).roadmap.findMany({
      where: { userId, progress: { is: { percent: { gt: 0, lt: 100 } } } },
      orderBy: { progress: { updatedAt: 'desc' } },
      take: 8,
      select: { id: true, title: true, slug: true, published: true, user: { select: { name: true, image: true } }, progress: { select: { percent: true, updatedAt: true } } },
    });
    return items;
  } catch { return []; }
}

async function loadRecommendedTopics() {
  try {
    const rows = await (prisma as any).roadmapTopic.groupBy({ by: ['topicId'], _count: { topicId: true }, orderBy: { _count: { topicId: 'desc' } }, take: 8 });
    const ids = rows.map((r: any) => r.topicId);
    const topics = await (prisma as any).topic.findMany({ where: { id: { in: ids } } });
    const byId: Record<string, any> = Object.fromEntries((topics as any).map((t: any) => [t.id, t]));
    return rows.map((r: any) => byId[r.topicId]).filter(Boolean);
  } catch { return []; }
}

async function loadPopular() {
  try {
    const items = await (prisma as any).roadmap.findMany({
      where: { published: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 12,
      select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } },
    });
    return items;
  } catch { return []; }
}

async function loadForYou(userId?: string) {
  if (!userId) return [];
  try {
    const my = await (prisma as any).roadmap.findMany({ where: { userId }, select: { id: true } });
    const myIds = my.map((m: any) => m.id);
    if (!myIds.length) return [];
    const myTopics = await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: myIds } }, select: { topicId: true } });
    const topicIds = Array.from(new Set(myTopics.map((t: any) => t.topicId)));
    if (!topicIds.length) return [];
    const candidates = await (prisma as any).roadmapTopic.findMany({ where: { topicId: { in: topicIds } }, select: { roadmapId: true } });
    const roadmapIds = Array.from(new Set(candidates.map((c: any) => c.roadmapId)));
    const items = await (prisma as any).roadmap.findMany({ where: { id: { in: roadmapIds }, published: true }, select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } }, take: 12 });
    return items;
  } catch { return []; }
}

export const revalidate = 60; // cache static-ish parts for 1 minute

export default async function DashboardHomePage() {
  // Only render shell + minimal popular/topics (fast query) then hydrate client side
  const popularInitial = await loadPopular();
  const topicsInitial = await loadRecommendedTopics();

  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-black">
      {/* Hero CTA */}
      <section className="relative overflow-hidden">
        {/* Decorative mesh gradient background */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Layered radial blobs for mesh effect */}
          <div className="absolute -top-40 -left-32 w-[65%] max-w-[900px] aspect-square bg-[radial-gradient(circle_at_center,theme(colors.blue.800)_0%,transparent_70%)] blur-3xl opacity-40" />
          <div className="absolute top-1/3 -right-40 w-[60%] max-w-[800px] aspect-square bg-[radial-gradient(circle_at_center,theme(colors.sky.400)_0%,transparent_70%)] blur-3xl opacity-35" />
          <div className="absolute bottom-[-25%] left-1/4 w-[55%] max-w-[780px] aspect-square bg-[radial-gradient(circle_at_center,theme(colors.blue.900)_0%,transparent_75%)] blur-[110px] opacity-50" />
          {/* White highlight to make light tones more dominant */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[55%] max-w-[780px] aspect-square bg-[radial-gradient(circle_at_center,white_0%,rgba(255,255,255,0.6)_35%,transparent_70%)] blur-[90px] opacity-50 mix-blend-screen" />
          {/* Secondary subtle white mist */}
          <div className="absolute bottom-0 right-1/3 w-[40%] aspect-square bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.9)_0%,transparent_65%)] blur-[100px] opacity-40 mix-blend-screen" />
          {/* Overlay gradient tuned lighter */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-sky-300/25 to-white/50 mix-blend-plus-lighter opacity-70" />
          {/* Soft radial mask for fade edges (lighter center) */}
          <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,white_70%,transparent_90%)] bg-white/20 dark:bg-white/10" />
        </div>
        <div className="mx-auto max-w-5xl px-6 py-14 sm:py-16 text-center relative">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Buat <span className="bg-gradient-to-r from-blue-800 via-blue-600 to-sky-400 bg-clip-text text-transparent">Rencana Belajarmu Sendiri</span>
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-600 dark:text-neutral-300 max-w-2xl mx-auto">Mulai perjalanan belajar terstruktur yang disesuaikan dengan tujuanmu, dan kembangkan skill secara fokus.</p>
          <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
            <GuardedLink
              href="/dashboard/new"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-800 via-blue-600 to-sky-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-0"
            >
              Buat Rencana Belajar
            </GuardedLink>
            <div className="inline-flex">
              <LidmInfoButton />
            </div>
          </div>
        </div>
      </section>

  <div className="px-4 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Main feed */}
        <div>
          {/* In-Progress horizontal scroller */}
          <DashboardHydrator initialPopular={popularInitial} initialTopics={topicsInitial} />
        </div>

    {/* Right column */}
  <aside className="sticky top-6 self-start">
          <div className="rounded-2xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Recommended Topics</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {/* Recommended topics */}
              <RecommendedTopics promise={Promise.resolve(topicsInitial)} />
            </div>
          </div>

          <DeveloperChoiceSidebar />
        </aside>
        </div>
      </div>
    </div>
  );
}
