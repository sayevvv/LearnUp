import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin, rateLimit, getClientIp } from '@/lib/security';

function wilsonLowerBound(p: number, n: number, z = 1.96) {
  if (n === 0) return 0;
  const denom = 1 + (z * z) / n;
  const centre = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);
  return (centre - margin) / denom;
}

function bayesianAverage(avg: number, n: number, prior = 3.5, weight = 10) {
  return (prior * weight + avg * n) / (weight + n);
}

async function ensurePublishedAndNotAuthor(roadmapId: string, userId: string) {
  const rp = await prisma.roadmap.findUnique({ where: { id: roadmapId } });
  if (!rp || !rp.published) return { ok: false, status: 403, msg: 'Roadmap belum dipublikasikan' } as const;
  if ((rp as any).userId === userId) return { ok: false, status: 403, msg: 'Author tidak dapat memberi rating' } as const;
  // If versioning added later, return versionId here
  return { ok: true, versionId: null as string | null } as const;
}

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id as string | undefined;
  // Only expose aggregates for published roadmaps
  const rp = await (prisma as any).roadmap.findUnique({ where: { id } });
  if (!rp || !(rp as any).published) return NextResponse.json({ aggregate: { avg: 0, count: 0, histogram: [0,0,0,0,0], saves: 0, forks: 0 }, myRating: null });

  const agg = await (prisma as any).roadmapAggregates.findUnique({ where: { roadmapId: id } });
  let my = null;
  if (userId && (rp as any).userId !== userId) {
    my = await (prisma as any).roadmapRating.findFirst({ where: { roadmapId: id, userId, versionId: null } });
  }
  return NextResponse.json({
    aggregate: {
      avg: agg?.avgStars ?? 0,
      count: agg?.ratingsCount ?? 0,
      histogram: [agg?.h1 ?? 0, agg?.h2 ?? 0, agg?.h3 ?? 0, agg?.h4 ?? 0, agg?.h5 ?? 0],
      saves: agg?.savesCount ?? 0,
      forks: agg?.forksCount ?? 0,
    },
    myRating: my ? { stars: my.stars, review: my.review } : null,
  });
}

export async function POST(req: NextRequest, ctx: any) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  // Basic rate limit per IP
  const ip = getClientIp(req as any);
  const rl = rateLimit(`rating:${ip}`, 20, 60_000);
  if (!rl.allowed) return NextResponse.json({ error: 'Terlalu banyak percobaan, coba lagi nanti' }, { status: 429, headers: { 'Retry-After': Math.ceil((rl.resetAt - Date.now())/1000).toString() } });
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions as any);
  if (!(session as any)?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session as any).user.id as string;
  const body = await req.json().catch(() => ({}));
  const stars = Number(body?.stars);
  const review = typeof body?.review === 'string' ? String(body.review).slice(0, 500) : null;
  if (!(stars >= 1 && stars <= 5)) return NextResponse.json({ error: 'stars harus 1..5' }, { status: 400 });

  const chk = await ensurePublishedAndNotAuthor(id, userId);
  if (!chk.ok) return NextResponse.json({ error: chk.msg }, { status: chk.status });

  // Upsert rating (idempotent per user per roadmap), but avoid composite upsert with nullable versionId
  const existing = await (prisma as any).roadmapRating.findFirst({
    where: { roadmapId: id, userId, versionId: chk.versionId },
    select: { id: true },
  });
  if (existing) {
    await (prisma as any).roadmapRating.update({ where: { id: existing.id }, data: { stars, review } });
  } else {
    await (prisma as any).roadmapRating.create({ data: { roadmapId: id, versionId: chk.versionId, userId, stars, review } });
  }

  // Recompute aggregates
  const grouped = await (prisma as any).roadmapRating.groupBy({
    by: ['stars'],
    _count: { stars: true },
    where: { roadmapId: id, versionId: chk.versionId },
  });
  const hist = [0, 0, 0, 0, 0];
  grouped.forEach((g: any) => { hist[g.stars - 1] = g._count.stars; });
  const total = hist.reduce((a, b) => a + b, 0);
  const avg = total ? hist.reduce((acc, c, i) => acc + c * (i + 1), 0) / total : 0;
  const p = avg ? (avg - 1) / 4 : 0;
  const wilson = wilsonLowerBound(p, total);
  const bayes = bayesianAverage(avg, total);

  await (prisma as any).roadmapAggregates.upsert({
    where: { roadmapId: id },
    update: { versionId: chk.versionId, avgStars: avg, ratingsCount: total, h1: hist[0], h2: hist[1], h3: hist[2], h4: hist[3], h5: hist[4], wilsonScore: wilson, bayesianScore: bayes },
    create: { roadmapId: id, versionId: chk.versionId, avgStars: avg, ratingsCount: total, h1: hist[0], h2: hist[1], h3: hist[2], h4: hist[3], h5: hist[4], wilsonScore: wilson, bayesianScore: bayes },
  });

  return NextResponse.json({ ok: true });
}
