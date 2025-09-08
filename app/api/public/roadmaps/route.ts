import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const sort = (searchParams.get('sort') || 'newest').toLowerCase();
    const page = Math.max(Number(searchParams.get('page') || 1), 1);
    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') || 12), 1), 50);
    const take = pageSize;
    const skip = (page - 1) * pageSize;

  let orderBy: any = { publishedAt: 'desc' };
    if (sort === 'oldest') orderBy = { publishedAt: 'asc' };
    else if (sort === 'title_asc') orderBy = { title: 'asc' };
    else if (sort === 'title_desc') orderBy = { title: 'desc' };
  else if (sort === 'verified') orderBy = [{ verified: 'desc' }, { publishedAt: 'desc' }];

    const where: any = { published: true, ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}) };
    const [items, total] = await Promise.all([
  (prisma as any).roadmap.findMany({ where, orderBy, take, skip, select: { id: true, userId: true, title: true, slug: true, publishedAt: true, verified: true, user: { select: { name: true } }, content: true } }),
      (prisma as any).roadmap.count({ where }),
    ]);

    // Fetch topics for these items
    const ids = items.map((i: any) => i.id);
    const topicRows = ids.length
      ? await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: { in: ids } }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] })
      : [];
    const topicsByRoadmap: Record<string, Array<{ slug: string; name: string; isPrimary: boolean }>> = {};
    for (const r of topicRows) {
      const arr = (topicsByRoadmap[r.roadmapId] ||= []);
      if (r.topic) arr.push({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary });
    }
    // Fetch rating aggregates
    const aggRows = ids.length
      ? await (prisma as any).roadmapAggregates.findMany({ where: { roadmapId: { in: ids } } })
      : [];
    const aggById: Record<string, { avgStars?: number; ratingsCount?: number }> = Object.fromEntries(
      aggRows.map((a: any) => [a.roadmapId, { avgStars: a.avgStars ?? 0, ratingsCount: a.ratingsCount ?? 0 }])
    );

  const itemsWithTopics = items.map((i: any) => ({
      ...i,
      topics: (topicsByRoadmap[i.id] || []).slice(0, 5),
      avgStars: aggById[i.id]?.avgStars ?? 0,
      ratingsCount: aggById[i.id]?.ratingsCount ?? 0,
    }));

    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return NextResponse.json({ items: itemsWithTopics, total, page, pageSize, totalPages }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
