import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { PrismaClient } from "@prisma/client";
import { assertSameOrigin } from "@/lib/security";

const prisma = new PrismaClient();

function isMaterialsComplete(content: any): { ready: boolean; reason?: string } {
  try {
    const milestones: any[] = Array.isArray(content?.milestones) ? content.milestones : [];
    const mats: any[][] = Array.isArray(content?.materialsByMilestone) ? content.materialsByMilestone : [];
    // If there are no milestones, consider not ready to avoid empty publishes
    if (!milestones.length) return { ready: false, reason: 'Roadmap belum memiliki milestone.' };
    for (let i = 0; i < milestones.length; i++) {
      const m: any = milestones[i] || {};
      const expected = Array.isArray(m.subbab)
        ? m.subbab.length
        : (Array.isArray(m.sub_tasks) ? m.sub_tasks.length : 0);
      if (expected > 0) {
        const mi = Array.isArray(mats[i]) ? mats[i] : [];
        if (mi.length < expected) return { ready: false, reason: 'Materi belajar belum lengkap. Silakan generate materi dahulu.' };
      }
    }
    if (content?._generation?.inProgress) return { ready: false, reason: 'Proses generate materi masih berjalan. Tunggu hingga selesai.' };
    return { ready: true };
  } catch {
    return { ready: false, reason: 'Tidak dapat memverifikasi materi. Coba generate ulang.' };
  }
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest, ctx: any) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { publish } = await req.json();

  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId } });
  if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (publish) {
    if ((roadmap as any).sourceId) {
      return NextResponse.json({ error: "Forked roadmap cannot be published" }, { status: 400 });
    }
    // Gate: ensure learning materials are generated and complete before publishing
    const check = isMaterialsComplete((roadmap as any).content);
    if (!check.ready) {
      return NextResponse.json({ error: check.reason || 'Silakan generate materi belajar terlebih dahulu sebelum mempublikasikan.' }, { status: 400 });
    }
    // ensure unique slug
    let base = slugify(roadmap.title);
    if (!base) base = `roadmap-${roadmap.id.slice(0, 6)}`;
    let slug = base;
    let i = 1;
  while (await (prisma as any).roadmap.findFirst({ where: { slug } })) {
      slug = `${base}-${i++}`;
    }
  const updated = await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { published: true, slug, publishedAt: new Date() } });
    // Revalidate public cache tags
    try {
      revalidateTag('public-roadmaps');
      revalidateTag(`public-roadmap:${updated.slug}`);
    } catch {}
    return NextResponse.json(updated);
  } else {
  const updated = await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { published: false, publishedAt: null, verified: false } });
    try {
      revalidateTag('public-roadmaps');
      if (updated.slug) revalidateTag(`public-roadmap:${updated.slug}`);
    } catch {}
    return NextResponse.json(updated);
  }
}
