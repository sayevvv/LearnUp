import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth.config';
import { prisma } from '@/lib/prisma';
import { PromptTemplate } from '@langchain/core/prompts';
import { githubChatCompletion } from '@/lib/ai/githubModels';
import { assertSameOrigin } from '@/lib/security';
import { deriveMatchingPairs } from '@/lib/quiz';

// Ensure JSON saved to Prisma doesn't contain undefined or sparse array holes
function sanitizeForJson(value: any): any {
  if (value === undefined) return null;
  if (Array.isArray(value)) {
    const arr: any[] = new Array(value.length);
    for (let i = 0; i < value.length; i++) arr[i] = sanitizeForJson(value[i]);
    return arr;
  }
  if (value && typeof value === 'object') {
    const out: any = {};
    for (const k of Object.keys(value)) out[k] = sanitizeForJson(value[k]);
    return out;
  }
  return value;
}

export async function GET(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = (await getServerSession(authOptions as any)) as any;
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const m = Number(url.searchParams.get('m') || '0');

  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId } });
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const content: any = (roadmap as any).content || {};
  const byMilestone: any[][] = Array.isArray(content.materialsByMilestone) ? content.materialsByMilestone : [];
  const materials = byMilestone[m] || [];
  // Build context strictly from generated materials of this milestone's subbab
  const contextParts: string[] = materials.map((it, idx) => {
    const pts = Array.isArray(it.points) && it.points.length ? `\nPoin:\n- ${it.points.join('\n- ')}` : '';
    const title = String(it.title || '').slice(0, 120);
    const body = String(it.body || '').slice(0, 2000);
    return `Subbab ${idx + 1}: ${title}\nBody:\n${body}${pts}`; // limit sizes to keep prompt bounded
  });
  const context = contextParts.join('\n\n---\n\n');

  const storedQuizzes: any[] = Array.isArray(content.quizzesByMilestone) ? content.quizzesByMilestone : [];
  const parityType: 'mcq' | 'match' = (m % 2 === 0) ? 'mcq' : 'match';
  // Helper to build/persist matching from context (threshold >= 2)
  async function buildAndPersistMatchFromContext(): Promise<Array<{term:string;definition:string}>|null> {
    try {
      const prompt = new PromptTemplate({
        template: `Dari konteks materi berikut, buat 2-6 pasangan istilah dan definisi/singkatnya. Pastikan definisi dapat diverifikasi dari konteks.
Kembalikan HANYA JSON valid array berisi objek: {"term":"...","definition":"..."}.

Konteks Materi:
{context}`,
        inputVariables: ['context']
      });
      const p = await prompt.format({ context });
      let text = String(await githubChatCompletion([{ role: 'user', content: p } as any])).trim();
      if (text.startsWith('```')) {
        const first = text.indexOf('\n');
        const last = text.lastIndexOf('```');
        if (first !== -1 && last !== -1) text = text.slice(first + 1, last).trim();
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [];
      let pairs = items
        .filter((it: any) => it && typeof it.term === 'string' && typeof it.definition === 'string')
        .map((it: any) => ({ term: String(it.term).slice(0, 120), definition: String(it.definition).slice(0, 240) }))
        .slice(0, 6);
      if (pairs.length < 2 && Array.isArray(materials) && materials.length) {
        const merged: any = { glossary: [], points: [], body: '' };
        for (const it of materials) {
          if (Array.isArray(it?.glossary)) merged.glossary.push(...it.glossary);
          if (Array.isArray(it?.points)) merged.points.push(...it.points);
          if (typeof it?.body === 'string') merged.body += (merged.body ? '\n\n' : '') + it.body;
        }
        const obj = deriveMatchingPairs(merged);
        pairs = Object.keys(obj).map(k => ({ term: k.slice(0,120), definition: String(obj[k]).slice(0,240) })).slice(0, 6);
      }
      if (pairs.length >= 2) {
  const newQuizzes: any[] = Array.isArray(content.quizzesByMilestone) ? [...content.quizzesByMilestone] : [];
  newQuizzes[m] = { type: 'match', data: pairs };
  const safeQuizzes = Array.from(newQuizzes, (x: any) => (x === undefined ? null : x));
  await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: sanitizeForJson({ ...(content || {}), quizzesByMilestone: safeQuizzes }) } });
        return pairs;
      }
    } catch {}
    return null;
  }

  // If stored quiz exists, return it — but if parity expects 'match' and stored is MCQ, try to upgrade to match once
  const stored = storedQuizzes[m];
  if (stored) {
    // Legacy array (assume MCQ)
    if (Array.isArray(stored) && stored.length) {
      if (parityType === 'match') {
        // Attempt upgrade to matching using context
        const upgraded = await buildAndPersistMatchFromContext();
        if (upgraded) return NextResponse.json({ type: 'match', pairs: upgraded });
      }
      return NextResponse.json({ type: 'mcq', questions: stored });
    }
    if (stored.type === 'mcq') {
      if (parityType === 'match') {
        const upgraded = await buildAndPersistMatchFromContext();
        if (upgraded) return NextResponse.json({ type: 'match', pairs: upgraded });
      }
      return NextResponse.json({ type: 'mcq', questions: stored.data || [] });
    }
    if (stored.type === 'match') {
      const pairs = Array.isArray(stored.data) ? stored.data : [];
      if (pairs.length >= 2) {
        return NextResponse.json({ type: 'match', pairs });
      }
      // Stored is empty or invalid; try to rebuild and persist
      const rebuilt = await buildAndPersistMatchFromContext();
      if (rebuilt && rebuilt.length >= 2) return NextResponse.json({ type: 'match', pairs: rebuilt });
      return NextResponse.json({ type: 'match', pairs: [] });
    }
  }
  if (!materials.length) {
    return NextResponse.json(parityType === 'mcq' ? { type: 'mcq', questions: [] } : { type: 'match', pairs: [] });
  }
  try {
    if (parityType === 'mcq') {
      const prompt = new PromptTemplate({
        template: `Buat PERSIS 5 soal pilihan ganda berbasis konteks berikut (tanpa pengetahuan di luar konteks).
Kembalikan HANYA JSON valid dengan format:
[
 {"q":"...","choices":["A","B","C","D"],"answer":0}
]
Aturan penting:
- Variasikan tipe soal: minimal 1 definisi/konsep dasar, 1 skenario/aplikasi, 1 perbedaan/perbandingan, 1 identifikasi pernyataan salah/benar, 1 interpretasi/urutan/proses jika konteks memungkinkan.
- Hindari pertanyaan seperti "Subbab mana yang membahas...", "Bagian mana...", atau yang menanyakan judul/nomor subbab.
- Pastikan hanya ADA 1 jawaban benar per soal; pilihan lain harus masuk akal dan bersumber dari konteks (bukan mengada-ada di luar konteks).
- Acak urutan pilihan; jangan gunakan pola jawaban (mis. semua di indeks 0).
- Tingkat kesulitan pemula-menengah, ringkas, dan dapat diverifikasi langsung dari konteks.
- Jangan sertakan pembahasan/penjelasan di luar JSON.

Konteks Materi:
{context}
`,
        inputVariables: ['context']
      });
      const p = await prompt.format({ context });
      let text = String(await githubChatCompletion([{ role: 'user', content: p } as any])).trim();
      if (text.startsWith('```')) {
        const first = text.indexOf('\n');
        const last = text.lastIndexOf('```');
        if (first !== -1 && last !== -1) text = text.slice(first + 1, last).trim();
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [];
      // Helper: shuffle choices while tracking correct index
      const shuffleWithAnswer = (choices: string[], answerIdx: number) => {
        const indexed = choices.map((c, i) => ({ c, i }));
        for (let i = indexed.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
        }
        const newChoices = indexed.map(x => x.c);
        const newAnswer = indexed.findIndex(x => x.i === answerIdx);
        return { newChoices, newAnswer: newAnswer >= 0 ? newAnswer : 0 };
      };
      const badStem = /subbab mana|bagian mana|judul subbab|judul bab|bagian berikut/i;
      const dedupe = new Set<string>();
      const cleaned = items
        .filter((it: any) => it && typeof it.q === 'string' && Array.isArray(it.choices) && typeof it.answer !== 'undefined')
        .map((it: any) => {
          const q = String(it.q).trim();
          let choices = it.choices.map((c: any) => String(c)).filter((s: string) => s && s.trim()).slice(0, 6);
          if (choices.length > 4) choices = choices.slice(0, 4);
          const rawAns = Math.max(0, Math.min((choices?.length || 1) - 1, Number(it.answer)));
          const { newChoices, newAnswer } = shuffleWithAnswer(choices, rawAns);
          return { q, choices: newChoices, answer: newAnswer };
        })
        .filter((it: any) => it.choices.length >= 3 && it.q.length >= 8 && !badStem.test(it.q))
        .filter((it: any) => {
          const key = it.q.toLowerCase();
          if (dedupe.has(key)) return false;
          dedupe.add(key);
          return true;
        })
        .slice(0, 5);
      if (cleaned.length) {
  const newQuizzes: any[] = Array.isArray(content.quizzesByMilestone) ? [...content.quizzesByMilestone] : [];
  newQuizzes[m] = { type: 'mcq', data: cleaned };
  const safeQuizzes = Array.from(newQuizzes, (x: any) => (x === undefined ? null : x));
  await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: sanitizeForJson({ ...(content || {}), quizzesByMilestone: safeQuizzes }) } });
        return NextResponse.json({ type: 'mcq', questions: cleaned });
      }
  } else {
      const prompt = new PromptTemplate({
    template: `Dari konteks materi berikut, buat 2-6 pasangan istilah dan definisi/singkatnya. Pastikan definisi dapat diverifikasi dari konteks.
Kembalikan HANYA JSON valid array berisi objek: {"term":"...","definition":"..."}.

Konteks Materi:
{context}`,
        inputVariables: ['context']
      });
      const p = await prompt.format({ context });
      let text = String(await githubChatCompletion([{ role: 'user', content: p } as any])).trim();
      if (text.startsWith('```')) {
        const first = text.indexOf('\n');
        const last = text.lastIndexOf('```');
        if (first !== -1 && last !== -1) text = text.slice(first + 1, last).trim();
      }
      const start = text.indexOf('[');
      const end = text.lastIndexOf(']');
      if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);
      const parsed = JSON.parse(text);
      const items = Array.isArray(parsed) ? parsed : [];
      const pairs = items
        .filter((it: any) => it && typeof it.term === 'string' && typeof it.definition === 'string')
        .map((it: any) => ({ term: String(it.term).slice(0, 120), definition: String(it.definition).slice(0, 240) }))
        .slice(0, 6);
      // Accept minimal viable 2+ pairs; if insufficient, fallback to deterministic derivation
      if (pairs.length >= 2) {
        const newQuizzes: any[] = Array.isArray(content.quizzesByMilestone) ? [...content.quizzesByMilestone] : [];
        newQuizzes[m] = { type: 'match', data: pairs };
        const safeQuizzes = Array.from(newQuizzes, (x: any) => (x === undefined ? null : x));
        await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: sanitizeForJson({ ...(content || {}), quizzesByMilestone: safeQuizzes }) } });
        return NextResponse.json({ type: 'match', pairs });
      }
      // Fallback: derive from materials when LLM doesn't provide enough pairs
      try {
        const merged: any = { glossary: [], points: [], body: '' };
        for (const it of materials) {
          if (Array.isArray(it?.glossary)) merged.glossary.push(...it.glossary);
          if (Array.isArray(it?.points)) merged.points.push(...it.points);
          if (typeof it?.body === 'string') merged.body += (merged.body ? '\n\n' : '') + it.body;
        }
        const obj = deriveMatchingPairs(merged);
        const dpairs = Object.keys(obj).map(k => ({ term: k.slice(0,120), definition: String(obj[k]).slice(0,240) })).slice(0, 6);
        if (dpairs.length >= 2) {
          const newQuizzes: any[] = Array.isArray(content.quizzesByMilestone) ? [...content.quizzesByMilestone] : [];
          newQuizzes[m] = { type: 'match', data: dpairs };
          const safeQuizzes = Array.from(newQuizzes, (x: any) => (x === undefined ? null : x));
          await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: sanitizeForJson({ ...(content || {}), quizzesByMilestone: safeQuizzes }) } });
          return NextResponse.json({ type: 'match', pairs: dpairs });
        }
        // Persist even single pair to avoid rework? Prefer minimum 2; else empty response.
      } catch {}
    }
  } catch {}
  // Default empty response respecting parity type
  return NextResponse.json(parityType === 'mcq' ? { type: 'mcq', questions: [] } : { type: 'match', pairs: [] });
}

export async function POST(req: NextRequest, ctx: any) {
  const { id } = await (ctx as any).params;
  const session = (await getServerSession(authOptions as any)) as any;
  const userId = (session as any)?.user?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try { assertSameOrigin(req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const body = await req.json();
  const {
    milestoneIndex,
    score,
    passed,
    answers,
    attemptId,
  } = body as { milestoneIndex: number; score?: number; passed?: boolean; answers?: Record<string, any>; attemptId?: string };

  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId }, include: { progress: true } });
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const safeMi = Math.max(0, Math.min(999, Number(milestoneIndex) || 0));
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const key = `quiz-m-${safeMi}`;
  const map = (roadmap as any).progress?.completedTasks || {};
  // Store last score and last answers; don't enforce pass gating here
  map[key] = {
    passed: !!passed, // kept for backward compatibility; UI no longer gates
    score: safeScore,
    answers: answers || null,
    attemptId: attemptId || null,
    updatedAt: new Date().toISOString(),
  };

  const updated = await (prisma as any).roadmapProgress.upsert({
    where: { roadmapId: id },
    create: { roadmapId: id, completedTasks: map, percent: (roadmap as any).progress?.percent || 0 },
    update: { completedTasks: map },
  });
  return NextResponse.json(updated);
}
