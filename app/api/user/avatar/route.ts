// app/api/user/avatar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { isSameOrigin, rateLimit, getClientIp } from '@/lib/security';

// For demo, we accept a JSON body with an https URL (already uploaded) or base64 (data URL) limited size.
// In production, prefer direct upload to object storage (S3/GCS) with signed URLs.

const MAX_BASE64_SIZE = 1024 * 1024 * 2; // 2MB approx

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSameOrigin(req as any)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }
  const ip = getClientIp(req as any);
  const rl = rateLimit(`avatar:${ip}`, 5, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Terlalu banyak percobaan' }, { status: 429 });
  }

  let url: string | null = null;
  try {
    const body = await req.json();
    const inputUrl: string | undefined = body?.url;
    const dataUrl: string | undefined = body?.dataUrl;

    if (inputUrl) {
      // Only allow https
      try {
        const u = new URL(inputUrl);
        if (u.protocol !== 'https:') throw new Error('Only https allowed');
        url = u.toString().slice(0, 1024);
      } catch {
        return NextResponse.json({ error: 'URL tidak valid' }, { status: 400 });
      }
    } else if (dataUrl && dataUrl.startsWith('data:image/')) {
      if (dataUrl.length > MAX_BASE64_SIZE * 1.35) {
        return NextResponse.json({ error: 'Gambar terlalu besar' }, { status: 413 });
      }
      // For demo we store data URL directly (not ideal). In prod, upload to storage and save https URL.
      url = dataUrl;
    } else {
      return NextResponse.json({ error: 'Masukkan url https atau dataUrl' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: userId }, data: { image: url! } });
  return NextResponse.json({ success: true, image: url }, { status: 200 });
}
