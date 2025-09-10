import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { PrismaClient } from "@prisma/client";
import { assertSameOrigin } from "@/lib/security";

const prisma = new PrismaClient();

function calcPercent(content: any, completedMap: Record<string, boolean>) {
  try {
    const milestones = content?.milestones || [];
    let total = 0; let done = 0;
    milestones.forEach((m: any, mi: number) => {
      const tasks = (Array.isArray(m?.subbab) ? m.subbab : (m?.sub_tasks || []));
      tasks.forEach((_t: any, ti: number) => {
        total += 1;
        const key = `m-${mi}-t-${ti}`;
        if (completedMap[key]) done += 1;
      });
    });
    if (total === 0) return 0;
    return Math.round((done / total) * 1000) / 10; // one decimal
  } catch {
    return 0;
  }
}

export async function GET(_req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId }, include: { progress: true } });
  if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(roadmap.progress);
}

export async function POST(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { assertSameOrigin(req as any); } catch (e: any) {
    return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 });
  }
  const body = await req.json();
  const { milestoneIndex, taskIndex, done } = body as { milestoneIndex: number; taskIndex: number; done: boolean };

  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId } });
  if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const key = `m-${milestoneIndex}-t-${taskIndex}`;
  const existing = await (prisma as any).roadmapProgress.findUnique({ where: { roadmapId: roadmap.id } });
  const completedMap: Record<string, boolean> = (existing?.completedTasks as any) || {};
  if (done) completedMap[key] = true; else delete completedMap[key];

  const percent = calcPercent(roadmap.content, completedMap);
  const updated = await (prisma as any).roadmapProgress.upsert({
    where: { roadmapId: roadmap.id },
    create: { roadmapId: roadmap.id, completedTasks: completedMap, percent },
    update: { completedTasks: completedMap, percent },
  });

  return NextResponse.json(updated);
}
