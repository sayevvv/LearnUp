import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { assertSameOrigin } from '@/lib/security';

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const rows = await (prisma as any).roadmapTopic.findMany({
    where: { roadmapId: id },
    include: { topic: true },
    orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }],
  });
  return NextResponse.json({
    topics: rows.map((r: any) => ({
  id: r.topic?.id,
      slug: r.topic?.slug,
      name: r.topic?.name,
      isPrimary: !!r.isPrimary,
      confidence: r.confidence ?? 0,
      source: r.source || 'ai',
    })),
  });
}

export async function POST(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const session = await getServerSession(authOptions as any) as any;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // ensure roadmap belongs to the user
  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId: (session as any).user.id }, select: { id: true } });
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const topicIds = Array.isArray(body?.topicIds) ? (body.topicIds as string[]) : [];
  const primaryId = typeof body?.primaryId === 'string' ? (body.primaryId as string) : undefined;
  if (topicIds.length === 0) return NextResponse.json({ error: 'No topics' }, { status: 400 });

  // Validate topics exist
  const valid = await (prisma as any).topic.findMany({ where: { id: { in: topicIds } }, select: { id: true } });
  const validIds = new Set(valid.map((t: any) => t.id));
  const filtered = topicIds.filter((id) => validIds.has(id));
  if (filtered.length === 0) return NextResponse.json({ error: 'Invalid topics' }, { status: 400 });

  // Remove previous author selections
  await (prisma as any).roadmapTopic.deleteMany({ where: { roadmapId: id, source: 'author' } });

  // Insert new selections
  for (const tid of filtered) {
    await (prisma as any).roadmapTopic.upsert({
      where: { roadmapId_versionId_topicId: { roadmapId: id, versionId: null, topicId: tid } },
      update: { source: 'author', isPrimary: primaryId ? tid === primaryId : false, confidence: 0.9 },
      create: { roadmapId: id, versionId: null, topicId: tid, source: 'author', isPrimary: primaryId ? tid === primaryId : false, confidence: 0.9 },
    });
  }

  return NextResponse.json({ ok: true });
}
