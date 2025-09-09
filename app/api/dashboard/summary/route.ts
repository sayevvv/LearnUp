import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth.config';
import { loadInProgress, loadForYou, loadPopular, loadRecommendedTopics } from '@/lib/dashboardData';

export const revalidate = 30; // short cache for popular & topics

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions as any);
  const userId = (session as any)?.user?.id;

  // Parallel but segregate personalized vs cached
  const [popular, topics, inProgress, forYou] = await Promise.all([
    loadPopular(),
    loadRecommendedTopics(),
    loadInProgress(userId),
    loadForYou(userId),
  ]);

  return NextResponse.json({ popular, topics, inProgress, forYou });
}
