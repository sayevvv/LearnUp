import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/lib/security";

// Note: Relax ctx typing to avoid RouteContext ParamCheck mismatch in Next 15.
export async function POST(_req: NextRequest, ctx: any) {
  try { assertSameOrigin(_req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only allow forking published roadmaps not owned by the user
  const source = await (prisma as any).roadmap.findFirst({ where: { id, published: true } });
  if (!source) return NextResponse.json({ error: "Source not found or not published" }, { status: 404 });
  if (source.userId === session.user.id) return NextResponse.json({ error: "Cannot save your own roadmap" }, { status: 400 });

  // Idempotency: if the user already forked this source, return that roadmap instead of creating a duplicate
  const existing = await (prisma as any).roadmap.findFirst({ where: { userId: session.user.id, sourceId: source.id }, include: { progress: true } });
  if (existing) {
    // Still ensure aggregates.forksCount is up to date
    try {
      const count = await (prisma as any).roadmap.count({ where: { sourceId: source.id } });
      await (prisma as any).roadmapAggregates.upsert({
        where: { roadmapId: source.id },
        update: { forksCount: count },
        create: { roadmapId: source.id, forksCount: count },
      });
    } catch {}
    return NextResponse.json(existing, { status: 200, headers: { 'x-deduped': 'true' } });
  }

  try {
    const cloned = await (prisma as any).roadmap.create({
      data: {
        title: source.title,
        content: source.content as any,
        userId: session.user.id,
        sourceId: source.id,
        published: false,
        slug: null,
        publishedAt: null,
        progress: { create: { completedTasks: {}, percent: 0 } },
      },
      include: { progress: true },
    });

    // Update fork aggregate for the source roadmap
    try {
      const count = await (prisma as any).roadmap.count({ where: { sourceId: source.id } });
      await (prisma as any).roadmapAggregates.upsert({
        where: { roadmapId: source.id },
        update: { forksCount: count },
        create: { roadmapId: source.id, forksCount: count },
      });
    } catch {}

    return NextResponse.json(cloned, { status: 201 });
  } catch (e: any) {
    // Unique constraint hit (userId, sourceId). Return existing
    const existing2 = await (prisma as any).roadmap.findFirst({ where: { userId: session.user.id, sourceId: source.id }, include: { progress: true } });
    if (existing2) return NextResponse.json(existing2, { status: 200, headers: { 'x-deduped': 'true' } });
    throw e;
  }
}
