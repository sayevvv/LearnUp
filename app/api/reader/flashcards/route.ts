import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { githubChatCompletion } from '@/lib/ai/githubModels';
import { assertSameOrigin, sanitizeString } from '@/lib/security';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const session = (await getServerSession(authOptions as any)) as any;
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
  const body = await req.json();
  const { context, limit = 5, roadmapId: ridTop, m: mTop, s: sTop } = body || ({} as any);
    let c = context as any;
    const hasClientCtx = !!(c && (c.title || c.body || (Array.isArray(c.points) && c.points.length)));
    const idCandidate = (c?.roadmapId as string) || (ridTop as string);
    const mCandidate = Number.isInteger(c?.m) ? Number(c?.m) : Number.isInteger(mTop) ? Number(mTop) : undefined;
    const sCandidate = Number.isInteger(c?.s) ? Number(c?.s) : Number.isInteger(sTop) ? Number(sTop) : undefined;
    if (!hasClientCtx && idCandidate != null && mCandidate != null && sCandidate != null) {
      try {
  const roadmap = await prisma.roadmap.findFirst({ where: { id: String(idCandidate), userId } });
        const content: any = (roadmap as any)?.content || {};
        const byMilestone: any[][] = Array.isArray(content?.materialsByMilestone) ? content.materialsByMilestone : [];
        const m = Math.min(Math.max(0, Number(mCandidate)), Math.max(0, byMilestone.length - 1));
        const s = Math.min(Math.max(0, Number(sCandidate)), Math.max(0, ((byMilestone?.[m] as any[])?.length || 1) - 1));
        const cur = byMilestone?.[m]?.[s];
        if (cur) {
          c = { title: String(cur?.title || ''), body: String(cur?.body || ''), points: Array.isArray(cur?.points) ? cur.points : [] };
        }
      } catch {}
    }

  const title = sanitizeString(String(c?.title || ''), { maxLen: 200 });
  const bodyText = String(c?.body || '').slice(0, 3500);
    const points: string[] = Array.isArray(c?.points) ? c.points.map((p: any) => sanitizeString(String(p), { maxLen: 200 })) : [];
    if (!title && !bodyText && !points.length) return NextResponse.json({ cards: [] });

  const ctx = [`Judul: ${title}`, `Isi:\n${bodyText}`, points.length ? `Poin:\n- ${points.join('\n- ')}` : ''].filter(Boolean).join('\n\n');
    const n = Math.max(1, Math.min(10, Number(limit) || 5));
    const prompt = `Buat ${n} flashcard singkat dari materi berikut. Balas HANYA JSON valid:
{"cards": [{"front": "pertanyaan singkat (4–10 kata)", "back": "jawaban ringkas (<= 15 kata, 1 kalimat)"}]}

Aturan:
- Bahasa Indonesia natural.
- Fokus pada konsep inti/definisi/perbandingan sederhana.
- Tanpa markdown, bullet, nomor, atau penjelasan tambahan.
- Jika konteks kurang, balas {"cards": []}.

MATERI:
${ctx}`.slice(0, 6000);
  const raw = String(await githubChatCompletion([{ role: 'user', content: prompt } as any])).trim();
    let parsed: any = null;
    try { parsed = JSON.parse(raw); } catch {
      // try to extract the first JSON object/array blob
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try { parsed = JSON.parse(match[1]); } catch {}
      }
    }
    let cards: any[] = [];
    if (Array.isArray(parsed)) cards = parsed;
    else if (parsed && Array.isArray(parsed.cards)) cards = parsed.cards;
    cards = cards.map((c: any) => ({ front: sanitizeString(String(c?.front || ''), { maxLen: 200 }).trim(), back: sanitizeString(String(c?.back || ''), { maxLen: 300 }).trim() }))
                 .filter((c: any) => c.front && c.back)
                 .slice(0, n);
    return NextResponse.json({ cards });
  } catch (e) {
    console.error('reader/flashcards error', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
