import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/security';

export async function POST(req: NextRequest, ctx: any) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions as any);
  if (!(session as any)?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session as any).user.id as string;

  // Ensure the roadmap is public and not owned by the same user
  const src = await (prisma as any).roadmap.findUnique({ where: { id }, select: { id: true, published: true, userId: true, title: true, content: true } });
  if (!src || !src.published) return NextResponse.json({ error: 'Roadmap tidak lagi publik dan tidak dapat disimpan.' }, { status: 403 });
  if ((src as any).userId === userId) return NextResponse.json({ error: 'Tidak bisa menyimpan roadmap milik sendiri' }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const t: any = tx as any;
    // Record save for metrics/idempotency UI
    await t.roadmapSave.upsert({ where: { roadmapId_userId: { roadmapId: id, userId } }, update: {}, create: { roadmapId: id, userId } });
    // Create or reuse a private fork owned by the user
    let clone = await t.roadmap.findFirst({ where: { userId, sourceId: id } });
    if (!clone) {
      clone = await t.roadmap.create({
        data: {
          title: (src as any).title,
          content: (src as any).content as any,
          userId,
          sourceId: id,
          published: false,
          slug: null,
          publishedAt: null,
          progress: { create: { completedTasks: {}, percent: 0 } },
        },
        include: { progress: true },
      });
    }
    // Update aggregates.savesCount
    const saves = await t.roadmapSave.count({ where: { roadmapId: id } });
    await t.roadmapAggregates.upsert({
      where: { roadmapId: id },
      update: { savesCount: saves },
      create: { roadmapId: id, savesCount: saves },
    });
    return { cloneId: (clone as any).id };
  });

  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: NextRequest, ctx: any) {
  // Read-only; no need for same-origin here since it doesn't mutate, but keep it simple and permissive
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ saved: false });
  // Consider saved if a private fork exists for this source
  const existingClone = await (prisma as any).roadmap.findFirst({ where: { userId, sourceId: id }, select: { id: true } });
  return NextResponse.json({ saved: !!existingClone, cloneId: existingClone?.id || null });
}

export async function DELETE(req: NextRequest, ctx: any) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions as any);
  if (!(session as any)?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session as any).user.id as string;

  await prisma.$transaction(async (tx) => {
    const t: any = tx as any;
    // Remove bookmark metric
    await t.roadmapSave.deleteMany({ where: { roadmapId: id, userId } });
    // Delete private fork if exists
    const clone = await t.roadmap.findFirst({ where: { userId, sourceId: id }, select: { id: true } });
    if (clone?.id) {
      await t.roadmap.delete({ where: { id: clone.id } });
    }
    // Update aggregates.savesCount
    const saves = await t.roadmapSave.count({ where: { roadmapId: id } });
    await t.roadmapAggregates.upsert({
      where: { roadmapId: id },
      update: { savesCount: saves },
      create: { roadmapId: id, savesCount: saves },
    });
  });

  return NextResponse.json({ ok: true });
}
