// app/dashboard/browse/page.tsx
import Link from 'next/link';
import RoadmapCard from '@/components/RoadmapCard';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import BrowseSignupClient from './signup-client';

type BrowseParams = { q?: string; sort?: string; page?: string; pageSize?: string };
async function getData(params: BrowseParams) {
  const q = params.q?.toString() || '';
  const sort = (params.sort?.toString() || 'newest').toLowerCase();
  const page = Math.max(Number(params.page || 1), 1);
  const pageSize = Math.min(Math.max(Number(params.pageSize || 12), 1), 50);
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  let orderBy: any = { publishedAt: 'desc' };
  if (sort === 'oldest') orderBy = { publishedAt: 'asc' };
  else if (sort === 'title_asc') orderBy = { title: 'asc' };
  else if (sort === 'title_desc') orderBy = { title: 'desc' };
  else if (sort === 'verified') orderBy = [{ verified: 'desc' }, { publishedAt: 'desc' }];

  const where: any = { published: true, ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}) };

  try {
    const [items, total] = await Promise.all([
      (prisma as any).roadmap.findMany({
        where,
        orderBy,
        take,
        skip,
        select: {
          id: true,
          userId: true,
          title: true,
          slug: true,
          publishedAt: true,
          verified: true,
          user: { select: { name: true, image: true } },
          content: true,
        },
      }),
      (prisma as any).roadmap.count({ where }),
    ]);

    const ids = items.map((i: any) => i.id);
    const topicRows = ids.length
      ? await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: ids } }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] })
      : [];
    const topicsByRoadmap: Record<string, Array<{ slug: string; name: string; isPrimary: boolean }>> = {};
    for (const r of topicRows) {
      const arr = (topicsByRoadmap[r.roadmapId] ||= []);
      if (r.topic) arr.push({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary });
    }

    const aggRows = ids.length
      ? await (prisma as any).roadmapAggregates.findMany({ where: { roadmapId: { in: ids } } })
      : [];
    const aggById: Record<string, { avgStars?: number; ratingsCount?: number }> = Object.fromEntries(
      aggRows.map((a: any) => [a.roadmapId, { avgStars: a.avgStars ?? 0, ratingsCount: a.ratingsCount ?? 0 }])
    );

    const itemsWithMeta = items.map((i: any) => ({
      ...i,
      topics: (topicsByRoadmap[i.id] || []).slice(0, 5),
      avgStars: aggById[i.id]?.avgStars ?? 0,
      ratingsCount: aggById[i.id]?.ratingsCount ?? 0,
    }));

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    return { items: itemsWithMeta, total, page, pageSize, totalPages };
  } catch {
    return { items: [], total: 0, page, pageSize, totalPages: 1 };
  }
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = (sp?.q as string) || '';
  const sort = (sp?.sort as string) || 'newest';
  const page = (sp?.page as string) || '1';
  const pageSize = (sp?.pageSize as string) || '12';
  const [data, session] = await Promise.all([
    getData({ q, sort, page, pageSize }),
    getServerSession(authOptions as any),
  ]);
  const s: any = session || {};

  const isLoggedIn = !!s?.user?.id;
  return (
    <div className="h-full overflow-y-auto bg-white dark:bg-slate-900">
      <header className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">Jelajahi Roadmap</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400 hidden sm:block">Koleksi roadmap yang dipublikasikan pengguna.</p>
        <form action="" className="mt-4 flex items-center gap-3">
          <input name="q" defaultValue={q} placeholder="Cari roadmap…" className="w-full max-w-md px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400" />
          <select name="sort" defaultValue={sort} className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="title_asc">Judul A-Z</option>
            <option value="title_desc">Judul Z-A</option>
          </select>
          <input type="hidden" name="pageSize" value={pageSize} />
        </form>
      </header>
      <div className="flex gap-8 p-6 md:p-8">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
          {data?.items?.map((item: any) => {
            const own = s?.user?.id && s.user.id === item.userId;
            return (
              <div key={item.id} className="h-full">
                <RoadmapCard
                  item={item}
                  hideInlineTopics={false}
                  hideRatings={own}
                  own={!!own}
                  showBottomChip
                  bottomMetaAlign
                />
              </div>
            );
          })}
        </div>
        {!isLoggedIn && (
          <div className="hidden xl:block w-80 shrink-0 pt-2">
            <BrowseSignupClient />
          </div>
        )}
      </div>
      {/* Pagination */}
      <div className="px-8 pb-10 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <div>Halaman {data?.page || page} dari {data?.totalPages || 1}</div>
        <div className="flex items-center gap-2">
          {Number(data?.page || page) > 1 ? (
            <Link href={{ pathname: '/dashboard/browse', query: { q, sort, page: String(Number(data?.page || page) - 1), pageSize } }} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Sebelumnya</Link>
          ) : <span className="px-3 py-1.5 rounded border border-transparent text-slate-400">Sebelumnya</span>}
          {Number(data?.page || page) < Number(data?.totalPages || 1) ? (
            <Link href={{ pathname: '/dashboard/browse', query: { q, sort, page: String(Number(data?.page || page) + 1), pageSize } }} className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Berikutnya</Link>
          ) : <span className="px-3 py-1.5 rounded border border-transparent text-slate-400">Berikutnya</span>}
        </div>
      </div>
    </div>
  );
}
