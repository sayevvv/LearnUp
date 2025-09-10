import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { PrismaClient } from "@prisma/client";
import { assertSameOrigin } from "@/lib/security";

const prisma = new PrismaClient();

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roadmap = await (prisma as any).roadmap.findFirst({
  where: { id, userId },
    include: { progress: true, user: { select: { name: true, image: true, id: true } } },
  });
  if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Attach minimal source info if this is a forked roadmap
  let source: any = null;
  try {
    if ((roadmap as any).sourceId) {
      source = await (prisma as any).roadmap.findUnique({ where: { id: (roadmap as any).sourceId }, select: { id: true, published: true, slug: true, title: true, user: { select: { id: true, name: true, image: true } } } });
    }
  } catch {}
  return NextResponse.json({ ...(roadmap as any), source });
}

export async function DELETE(_req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  try { assertSameOrigin(_req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const session = await getServerSession(authOptions);
  const userId2 = (session as any)?.user?.id as string | undefined;
  if (!userId2) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await (prisma as any).roadmap.findFirst({ where: { id, userId: userId2 }, select: { id: true, sourceId: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // If this is a private clone saved from a public roadmap, also remove the save bookmark and update aggregates
  await (prisma as any).$transaction(async (tx: any) => {
    await tx.roadmap.delete({ where: { id } });
    const sourceId = (existing as any).sourceId as string | null;
    if (sourceId) {
      // Remove the user's save record to hide it from "Disimpan dari Luar"
  await tx.roadmapSave.deleteMany({ where: { roadmapId: sourceId, userId: userId2 } });
      // Update aggregates for the source
      const saves = await tx.roadmapSave.count({ where: { roadmapId: sourceId } });
      await tx.roadmapAggregates.upsert({
        where: { roadmapId: sourceId },
        update: { savesCount: saves },
        create: { roadmapId: sourceId, savesCount: saves },
      });
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
