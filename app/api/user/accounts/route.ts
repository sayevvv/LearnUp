// app/api/user/accounts/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { provider: true },
  });

  const providers = accounts.map((a) => a.provider);
  const hasOAuth = providers.some((p) => p !== 'credentials');
  return NextResponse.json({ hasOAuth, providers }, { status: 200 });
}
