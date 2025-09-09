import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next"; // Impor getServerSession
import { authOptions } from "@/auth.config";      // Impor authOptions yang sudah kita buat
import { prisma } from "@/lib/prisma";
import crypto from 'crypto';
import { classifyHeuristic } from '@/lib/topics/classifier';
import { ensureTopics } from '@/lib/topics/seed';
import { assertSameOrigin } from "@/lib/security";

export async function POST(req: NextRequest) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  // Gunakan getServerSession dengan authOptions untuk mendapatkan sesi
  const session = await getServerSession(authOptions);

  const sessUser: any = session?.user as any;
  if (!sessUser?.id) {
    // Jika tidak ada sesi atau user id, tolak permintaan
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Missing title or content" }, { status: 400 });
    }

    // Pastikan user benar-benar ada di database untuk menghindari FK error
  let userId = sessUser.id as string;
  let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user && sessUser?.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: sessUser.email } });
      if (byEmail) {
        user = byEmail;
        userId = byEmail.id;
      }
    }
    if (!user) {
      return NextResponse.json({ error: "User not found. Please sign in again." }, { status: 401 });
    }

    // Idempotency: compute content hash
    let hash: string | null = null;
    try { hash = crypto.createHash('sha256').update(JSON.stringify(content ?? {})).digest('hex'); } catch {}

    if (hash) {
      const same = await (prisma as any).roadmap.findFirst({ where: { userId, title, contentHash: hash }, include: { progress: true }, orderBy: { createdAt: 'desc' } });
      if (same) return NextResponse.json(same, { status: 200, headers: { 'x-deduped': 'true' } });
    } else {
      // Fallback JSON compare if hash not available
      const lastSameTitle = await (prisma as any).roadmap.findFirst({ where: { userId, title }, orderBy: { createdAt: 'desc' }, include: { progress: true } });
      if (lastSameTitle) {
        try {
          const a = JSON.stringify(lastSameTitle.content ?? {});
          const b = JSON.stringify(content ?? {});
          if (a === b) return NextResponse.json(lastSameTitle, { status: 200, headers: { 'x-deduped': 'true' } });
        } catch {}
      }
    }

  const newRoadmap = await (prisma as any).roadmap.create({
      data: {
        title,
        content,
    contentHash: hash,
        userId, // id yang terverifikasi benar-benar ada di DB
        progress: {
          create: {
            completedTasks: {},
            percent: 0,
          },
        },
      },
      include: { progress: true },
    });

    // Synchronous AI topic classification so chips appear immediately after save
    try {
      const titleText = newRoadmap.title || 'Roadmap';
      const milestones = Array.isArray((newRoadmap as any)?.content?.milestones)
        ? (newRoadmap as any).content.milestones.map((m: any) => m?.topic).filter(Boolean)
        : [];
      const labels = classifyHeuristic({ title: titleText, summary: '', milestones });
      const slugs = [labels.primary, ...labels.secondary];
      await ensureTopics(slugs);
      const topics = await (prisma as any).topic.findMany({ where: { slug: { in: slugs } } });
      const bySlug: Record<string, any> = Object.fromEntries(topics.map((t: any) => [t.slug, t]));
      // Clear previous AI labels (none expected on new)
      await (prisma as any).roadmapTopic.deleteMany({ where: { roadmapId: newRoadmap.id, source: 'ai' } });
      const rows = [
        { slug: labels.primary, conf: labels.confidence.primary, primary: true },
        ...labels.secondary.map((s: string) => ({ slug: s, conf: labels.confidence.secondary?.[s] ?? 0.5, primary: false })),
      ];
      for (const r of rows) {
        const t = bySlug[r.slug];
        if (!t) continue;
        const existing = await (prisma as any).roadmapTopic.findFirst({ where: { roadmapId: newRoadmap.id, topicId: t.id, versionId: null } });
        if (existing) {
          await (prisma as any).roadmapTopic.update({ where: { id: existing.id }, data: { confidence: r.conf, isPrimary: r.primary, source: 'ai' } });
        } else {
          await (prisma as any).roadmapTopic.create({ data: { roadmapId: newRoadmap.id, versionId: null, topicId: t.id, confidence: r.conf, isPrimary: r.primary, source: 'ai' } });
        }
      }
    } catch {}

    // Fire-and-forget generation of first node (m=0,s=0) only.
    try {
      const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
      // Do not await; non-blocking.
      fetch(`${base}/api/roadmaps/${newRoadmap.id}/prepare-materials?m=0&s=0`, { method: 'POST' })
        .catch(() => { /* silent */ });
    } catch { /* ignore */ }

    return NextResponse.json(newRoadmap, { status: 201 });

  } catch (error) {
    console.error("Error saving roadmap:", error);
    return NextResponse.json({ error: "Failed to save roadmap." }, { status: 500 });
  }
}