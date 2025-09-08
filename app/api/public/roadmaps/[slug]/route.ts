import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, ctx: any) {
  try {
  const { slug } = await (ctx as any).params;
  const roadmap = await (prisma as any).roadmap.findFirst({ where: { slug, published: true }, select: { id: true, title: true, content: true, user: { select: { name: true, id: true } }, published: true, slug: true, verified: true } });
    if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // join topics
    try {
      const rows = await (prisma as any).roadmapTopic.findMany({ where: { roadmapId: roadmap.id }, include: { topic: true }, orderBy: [{ isPrimary: 'desc' }, { confidence: 'desc' }] });
      (roadmap as any).topics = rows.filter((r: any) => r.topic).map((r: any) => ({ slug: r.topic.slug, name: r.topic.name, isPrimary: !!r.isPrimary }));
    } catch {}
    return NextResponse.json(roadmap, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
