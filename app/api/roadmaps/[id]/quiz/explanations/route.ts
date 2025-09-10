import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { PromptTemplate } from '@langchain/core/prompts';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Generate short explanations for MCQ questions using Gemini, grounded by milestone materials
export async function POST(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = (await getServerSession(authOptions as any)) as any;
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const m = Number((body?.milestoneIndex ?? 0) as number);
    if (Number.isNaN(m)) return NextResponse.json({ error: 'Bad request' }, { status: 400 });

  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId } });
    if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const content: any = (roadmap as any).content || {};
    const byMilestone: any[][] = Array.isArray(content.materialsByMilestone) ? content.materialsByMilestone : [];
    const materials = byMilestone[m] || [];
    const quizzes: any[] = Array.isArray(content.quizzesByMilestone) ? content.quizzesByMilestone : [];
    const stored = quizzes[m];
    const mcq = Array.isArray(stored)
      ? stored
      : stored?.type === 'mcq'
        ? (stored.data || [])
        : [];

    if (!mcq.length) return NextResponse.json({ error: 'No MCQ found for this milestone' }, { status: 400 });

    // Build context from materials to ground explanations
    const contextParts: string[] = materials.map((it: any, idx: number) => {
      const pts = Array.isArray(it.points) && it.points.length ? `\nPoin:\n- ${it.points.join('\n- ')}` : '';
      const title = String(it.title || '').slice(0, 120);
      const body = String(it.body || '').slice(0, 2000);
      return `Subbab ${idx + 1}: ${title}\nBody:\n${body}${pts}`;
    });
    const context = contextParts.join('\n\n---\n\n');

    // Prepare prompt for batch explanations
    const prompt = new PromptTemplate({
      template: `Anda adalah mentor yang menjelaskan jawaban untuk soal pilihan ganda secara singkat dan berbasis konteks.

KONTEKS MATERI (landasan penjelasan, jangan tambah pengetahuan luar ini):
{context}

Berikut daftar soal beserta pilihan jawaban dan indeks jawaban benar. Untuk SETIAP SOAL, tulis 1-3 kalimat penjelasan kenapa jawaban benar tersebut benar. Hindari menyebut "opsi A/B/C"; jelaskan konsepnya langsung, ringkas, dan dalam Bahasa Indonesia.

FORMAT OUTPUT: Kembalikan HANYA JSON array of strings, urutan sama dengan soal. Contoh: ["penjelasan 1","penjelasan 2", ...]

SOAL:
{questions}
`,
      inputVariables: ['context', 'questions'],
    });

    const questionsPayload = JSON.stringify(
      mcq.map((q: any) => ({ q: q.q, choices: q.choices, answer: q.answer }))
    );

    const input = await prompt.format({ context, questions: questionsPayload });
    const model = new ChatGoogleGenerativeAI({ model: 'gemini-1.5-flash-latest', apiKey: process.env.GOOGLE_API_KEY, temperature: 0.2 });

    // Invoke Gemini
    const res = await model.invoke([{ role: 'user', content: input } as any]);
    let text = String((res as any)?.content ?? (res as any)?.lc_kwargs?.content ?? '').trim();
    if (!text && (res as any)?.additional_kwargs?.content) text = String((res as any)?.additional_kwargs?.content);
    if (text.startsWith('```')) {
      const first = text.indexOf('\n');
      const last = text.lastIndexOf('```');
      if (first !== -1 && last !== -1) text = text.slice(first + 1, last).trim();
    }
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);

    let arr: any = [];
    try { arr = JSON.parse(text); } catch {}
    const explanations: string[] = Array.isArray(arr) ? arr.map((s: any) => String(s || '').trim()).slice(0, mcq.length) : [];

    // Ensure length matches
    while (explanations.length < mcq.length) explanations.push('');

    return NextResponse.json({ explanations });
  } catch (e) {
    console.error('explanations error', e);
    return NextResponse.json({ error: 'Failed to generate explanations' }, { status: 500 });
  }
}
