// app/dashboard/roadmaps/open/[id]/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export default async function OpenSavedRoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user?.id) redirect('/login?callbackUrl=/dashboard/roadmaps');
  const { id } = await params; // id is the source roadmapId
  const userId = session.user.id as string;

  // If a clone already exists, use it
  const existing = await (prisma as any).roadmap.findFirst({ where: { userId, sourceId: id }, select: { id: true } });
  if (existing?.id) redirect(`/dashboard/roadmaps/${existing.id}`);

  // Otherwise, try to clone from a published source
  const source = await (prisma as any).roadmap.findFirst({ where: { id, published: true }, select: { id: true, title: true, content: true } });
  if (!source) redirect('/dashboard/roadmaps');

  const clone = await (prisma as any).roadmap.create({
    data: {
      title: (source as any).title,
      content: (source as any).content as any,
      userId,
      sourceId: id,
      published: false,
      slug: null,
      publishedAt: null,
      progress: { create: { completedTasks: {}, percent: 0 } },
    },
    select: { id: true },
  });

  redirect(`/dashboard/roadmaps/${clone.id}`);
}
