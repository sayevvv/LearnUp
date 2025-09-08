import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { revalidateTag } from 'next/cache';

export async function POST(req: NextRequest, ctx: any) {
  try {
    const session = (await getServerSession(authOptions as any)) as any;
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if ((session.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { id } = await (ctx as any).params;
    let verified = true;
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      verified = Boolean((body as any)?.verified ?? true);
    } else {
      const fd = await req.formData().catch(() => null as any);
      const v = fd?.get('verified');
      if (typeof v === 'string') verified = v === 'true' || v === '1' || v.toLowerCase() === 'on';
    }
    // Only allow verifying already published roadmaps
    const r = await (prisma as any).roadmap.findUnique({ where: { id }, select: { published: true } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!r.published) return NextResponse.json({ error: 'Not published' }, { status: 400 });
    const updated = await (prisma as any).roadmap.update({ where: { id }, data: { verified } });
    try { await (prisma as any).roadmapAggregates.update({ where: { roadmapId: id }, data: { updatedAt: new Date() } }); } catch {}
    try {
      revalidateTag('public-roadmaps');
      if (updated.slug) revalidateTag(`public-roadmap:${updated.slug}`);
    } catch {}
    return NextResponse.json({ ok: true, verified: updated.verified });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
