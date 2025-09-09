import { prisma } from './prisma';
import { cache } from 'react';

// Non-personal data (can be cached briefly)
export const loadRecommendedTopics = cache(async () => {
  try {
    const rows = await (prisma as any).roadmapTopic.groupBy({ by: ['topicId'], _count: { topicId: true }, orderBy: { _count: { topicId: 'desc' } }, take: 8 });
    const ids = rows.map((r: any) => r.topicId);
    const topics = await (prisma as any).topic.findMany({ where: { id: { in: ids } } });
    const byId: Record<string, any> = Object.fromEntries((topics as any).map((t: any) => [t.id, t]));
    return rows.map((r: any) => byId[r.topicId]).filter(Boolean);
  } catch { return []; }
});

export const loadPopular = cache(async () => {
  try {
    const items = await (prisma as any).roadmap.findMany({
      where: { published: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 12,
      select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } },
    });
    return items;
  } catch { return []; }
});

// Personalized (no cache)
export async function loadInProgress(userId?: string) {
  if (!userId) return [];
  try {
    return await (prisma as any).roadmap.findMany({
      where: { userId, progress: { is: { percent: { gt: 0, lt: 100 } } } },
      orderBy: { progress: { updatedAt: 'desc' } },
      take: 8,
      select: { id: true, title: true, slug: true, published: true, user: { select: { name: true, image: true } }, progress: { select: { percent: true, updatedAt: true } } },
    });
  } catch { return []; }
}

export async function loadForYou(userId?: string) {
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
    return await (prisma as any).roadmap.findMany({ where: { id: { in: roadmapIds }, published: true }, select: { id: true, title: true, slug: true, verified: true, user: { select: { name: true, image: true } } }, take: 12 });
  } catch { return []; }
}
