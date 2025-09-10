// app/dashboard/roadmaps/[id]/quiz/page.tsx
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import QuizClient from '@/components/QuizClient';

async function getRoadmap(id: string) {
  return prisma.roadmap.findUnique({ where: { id } });
}

export default async function QuizPage(props: any) {
  const { id } = await (props as any).params;
  const sp = await (props as any).searchParams;
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user?.id) return notFound();
  const roadmap = await prisma.roadmap.findFirst({ where: { id, userId: session.user.id } });
  if (!roadmap) return notFound();
  const rawM = Number((sp?.m as any) ?? 0) || 0;
  const content0: any = (roadmap as any).content || {};
  const byM0: any[][] = Array.isArray(content0.materialsByMilestone) ? content0.materialsByMilestone : [];
  const m = Math.min(Math.max(0, rawM), Math.max(0, byM0.length - 1));
  const quizNumber = m + 1;
  const content: any = content0;
  const byMilestone: any[][] = content.materialsByMilestone || [];
  const milestones: any[] = Array.isArray(content.milestones) ? content.milestones : [];
  const milestone = milestones[m];
  const topic = milestone?.topic || roadmap.title;
  const isMatch = ((m + 1) % 2) === 0; // 1-based parity: even => matching
  const hasNextMaterial = Array.isArray(byMilestone?.[m + 1]) && byMilestone[m + 1].length > 0;
  const nextTopic = milestones[m + 1]?.topic as string | undefined;
  const nextHref = hasNextMaterial ? `/dashboard/roadmaps/${roadmap.id}/read?m=${m + 1}&s=0` : undefined;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <header className="relative p-6 border-b border-slate-200">
        <Link href={`/dashboard/roadmaps/${roadmap.id}`} className="absolute left-6 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-slate-700 hover:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Kembali</span>
        </Link>
        <div className="text-center">
          <div className="text-xs font-medium tracking-wide text-slate-500 uppercase">Kuis {quizNumber}</div>
          <h1 className="text-xl font-bold text-slate-900">{(roadmap as any).title}</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto p-6">
        <h2 className="text-lg font-semibold text-slate-900">{topic}</h2>
  <p className="mt-1 text-sm text-slate-600">{isMatch ? 'Jodohkan istilah dengan definisinya. Nilai minimal 60% untuk membuka tahap berikutnya.' : 'Jawab pertanyaan pilihan ganda. Nilai minimal 60% untuk membuka tahap berikutnya.'}</p>
        <div className="mt-6">
          <QuizClient
            roadmapId={roadmap.id}
            milestoneIndex={m}
            topic={topic}
            nextHref={nextHref}
            nextTopic={nextTopic}
          />
        </div>
      </main>
    </div>
  );
}
