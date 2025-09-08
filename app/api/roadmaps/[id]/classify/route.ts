import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { classifyHeuristic } from '@/lib/topics/classifier';
import { ensureTopics } from '@/lib/topics/seed';

export async function POST(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  // Try to use provided body; else fallback to DB
  const body = await req.json().catch(() => ({}));
  let title = typeof body?.title === 'string' ? body.title : undefined;
  const summary = typeof body?.summary === 'string' ? body.summary : undefined;
  let milestones = Array.isArray(body?.milestones) ? body.milestones as string[] : undefined;

  if (!title) {
    try {
      const r = await (prisma as any).roadmap.findUnique({ where: { id }, select: { title: true, content: true } });
      title = r?.title ?? 'Roadmap';
      const ms = Array.isArray((r as any)?.content?.milestones)
        ? (r as any).content.milestones.map((m: any) => m?.topic).filter(Boolean)
        : [];
      milestones = milestones ?? ms;
    } catch {}
  }

  const result = classifyHeuristic({ title: title || 'Roadmap', summary: summary || '', milestones: milestones || [] });

  // Ensure topics exist (seed expected to have created these)
  const slugs = [result.primary, ...result.secondary];
  try { await ensureTopics(slugs); } catch {}
  const topics = await (prisma as any).topic.findMany({ where: { slug: { in: slugs } } });
  const bySlug: Record<string, any> = Object.fromEntries(topics.map((t: any) => [t.slug, t]));

  // Clear previous AI labels
  await (prisma as any).roadmapTopic.deleteMany({ where: { roadmapId: id, source: 'ai' } });

  // Upsert new labels
  const rows = [
    { slug: result.primary, conf: result.confidence.primary, primary: true },
    ...result.secondary.map((s: string) => ({ slug: s, conf: result.confidence.secondary?.[s] ?? 0.5, primary: false })),
  ];
  for (const r of rows) {
    const t = bySlug[r.slug];
    if (!t) continue;
    const existing = await (prisma as any).roadmapTopic.findFirst({ where: { roadmapId: id, topicId: t.id, versionId: null } });
    if (existing) {
      await (prisma as any).roadmapTopic.update({ where: { id: existing.id }, data: { confidence: r.conf, isPrimary: r.primary, source: 'ai' } });
    } else {
      await (prisma as any).roadmapTopic.create({ data: { roadmapId: id, versionId: null, topicId: t.id, confidence: r.conf, isPrimary: r.primary, source: 'ai' } });
    }
  }

  return NextResponse.json({ ok: true, labels: result });
}
