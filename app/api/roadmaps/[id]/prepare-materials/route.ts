import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { assertSameOrigin } from "@/lib/security";

export async function POST(_req: NextRequest, ctx: any) {
  try { assertSameOrigin(_req as any); } catch (e: any) { return NextResponse.json({ error: 'Forbidden' }, { status: e?.status || 403 }); }
  const { id } = await (ctx as any).params;
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(_req.url);
  const force = url.searchParams.get('force') === '1';
  const reset = url.searchParams.get('reset') === '1';
  // Optional single-node generation params
  const mParam = url.searchParams.get('m'); // milestone index
  const sParam = url.searchParams.get('s'); // sub-index within milestone
  const singleMode = mParam !== null && sParam !== null;

  // Fetch roadmap owned by the user
  const roadmap = await (prisma as any).roadmap.findFirst({ where: { id, userId: session.user.id } });
  if (!roadmap) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const content = (roadmap as any).content || {};
  const milestones: any[] = Array.isArray(content?.milestones) ? content.milestones : [];
  if (milestones.length === 0) return NextResponse.json({ error: "No milestones" }, { status: 400 });

  // Block regeneration for published roadmaps entirely
  if ((roadmap as any).published) {
    return NextResponse.json({ error: 'Roadmap sudah dipublikasikan dan tidak dapat di-generate ulang.' }, { status: 400 });
  }

  function isMaterialsComplete(content0: any): boolean {
    try {
      const ms: any[] = Array.isArray(content0?.milestones) ? content0.milestones : [];
      const mats: any[][] = Array.isArray(content0?.materialsByMilestone) ? content0.materialsByMilestone : [];
      if (!ms.length) return false;
      for (let i = 0; i < ms.length; i++) {
        const m: any = ms[i] || {};
        const expected = Array.isArray(m.subbab)
          ? m.subbab.length
          : (Array.isArray(m.sub_tasks) ? m.sub_tasks.length : 0);
        if (expected > 0) {
          const got = Array.isArray(mats[i]) ? mats[i].length : 0;
          if (got < expected) return false;
        }
      }
      return true;
    } catch { return false; }
  }

  // Gate: only one generation per user at a time (stale after 45 minutes)
  const others = await (prisma as any).roadmap.findMany({ where: { userId: session.user.id }, select: { id: true, content: true } });
  const now = Date.now();
  const hasActiveOther = others.some((r: any) => {
    if (String(r.id) === String(id)) return false;
    const gen = (r?.content as any)?._generation || {};
    if (!gen?.inProgress) return false;
    const startedAt = gen?.startedAt ? Date.parse(gen.startedAt) : 0;
    // consider stale if older than 45 minutes
    return startedAt && (now - startedAt) < 45 * 60 * 1000;
  });
  if (hasActiveOther) {
    return NextResponse.json({ error: 'Terdapat proses generate materi lain yang masih berjalan. Selesaikan atau tunggu hingga selesai sebelum memulai yang baru.' }, { status: 409 });
  }

  // If already prepared and complete (only check for full generation mode), return unless forcing regeneration
  if (!singleMode && !force && isMaterialsComplete(content)) {
    return NextResponse.json({ ok: true, alreadyPrepared: true });
  }

  const model = new ChatGoogleGenerativeAI({
    model: "gemini-1.5-flash-latest",
    apiKey: process.env.GOOGLE_API_KEY,
    temperature: 0.6,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });

  const prompt = new PromptTemplate({
    template: `Anda adalah mentor. Tulis materi belajar yang jelas dan ramah pemula untuk satu milestone.

Milestone: {topic}
Subbab:
{subbab}

Instruksi:
- Jelaskan konsep inti secara runtut dan praktis, gunakan bahasa Indonesia yang natural.
- Sertakan 2-3 paragraf narasi. Tambahkan 1-2 poin materi (bullet) yang menekankan inti konsep.
- Jangan menambahkan tugas/ujian/latihan/projek.
- Kembalikan hanya teks panjang untuk "body" dan bullet dalam format: Body:\n<paragraf>\n\nPoin:\n- <poin a>\n- <poin b>
`,
    inputVariables: ["topic", "subbab"],
  });

  // Optionally clear progress and materials when resetting (only for full mode)
  if (!singleMode) {
    try {
      if (reset) {
        try {
          await (prisma as any).roadmapProgress.upsert({
            where: { roadmapId: id },
            update: { completedTasks: {}, percent: 0 },
            create: { roadmapId: id, completedTasks: {}, percent: 0 },
          });
        } catch {}
      }
      const base = reset ? { ...(content || {}), materialsByMilestone: [] } : (content || {});
      const mark = { ...base, _generation: { inProgress: true, startedAt: new Date().toISOString() } };
      await (prisma as any).roadmap.update({ where: { id: (roadmap as any).id }, data: { content: mark } });
    } catch {}
  }

  // SINGLE NODE MODE IMPLEMENTATION
  if (singleMode) {
    const mi = Math.max(0, Math.min(milestones.length - 1, Number(mParam) || 0));
    const milestone = milestones[mi];
    if (!milestone) return NextResponse.json({ error: 'Milestone tidak ditemukan' }, { status: 404 });
    const subs: string[] = Array.isArray(milestone.subbab)
      ? milestone.subbab
      : Array.isArray(milestone.sub_tasks)
        ? (milestone.sub_tasks as any[]).map((t) => (typeof t === 'string' ? t : t?.task)).filter(Boolean)
        : [];
    if (!subs.length) return NextResponse.json({ error: 'Milestone belum punya subbab' }, { status: 400 });
    const si = Math.max(0, Math.min(subs.length - 1, Number(sParam) || 0));
    const subTitle = subs[si];
    if (!subTitle) return NextResponse.json({ error: 'Subbab tidak ditemukan' }, { status: 404 });

    const existingMats: any[][] = Array.isArray((content as any).materialsByMilestone) ? (content as any).materialsByMilestone : [];
    const currentList: any[] = Array.isArray(existingMats[mi]) ? existingMats[mi] : [];
    const already = currentList.find((it) => it?.subIndex === si);
    if (already && !force) {
      return NextResponse.json({ ok: true, skipped: true, milestoneIndex: mi, subIndex: si });
    }

    // Acquire short-term lock to avoid rapid duplicate calls
    try {
      const lockMark = { ...(content || {}), _generation: { inProgress: true, startedAt: new Date().toISOString(), single: true } };
      await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: lockMark } });
    } catch {}

    const pTxt = await prompt.format({ topic: `${milestone.topic} — ${subTitle}`, subbab: `- ${subTitle}` });
    let item: any = null;
    try {
      const res = await model.invoke([{ role: 'user', content: pTxt }] as any);
      let text = (res as any)?.content?.[0]?.text || (res as any)?.content || '';
      text = String(text).slice(0, 5000);
      const hero = `https://source.unsplash.com/1200x500/?${encodeURIComponent(subTitle)}`;
      const safeTitle = String(subTitle || '').slice(0, 200);
      item = { milestoneIndex: mi, subIndex: si, title: safeTitle, body: String(text || '').trim(), points: [], heroImage: hero };
    } catch (e: any) {
      // release lock
      try {
        const release = { ...(content || {}), _generation: { inProgress: false, finishedAt: new Date().toISOString(), single: true } };
        await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: release } });
      } catch {}
      const msg = String(e?.message || 'Gagal membuat materi');
      const is429 = /429|rate|quota|exhaust/i.test(msg);
      return NextResponse.json({ ok: false, error: is429 ? 'Server sibuk. Coba lagi.' : msg }, { status: is429 ? 429 : 500 });
    }

    // Persist item (replace or insert at correct index)
    const newMats = [...existingMats];
    const ml = Array.isArray(newMats[mi]) ? [...newMats[mi]] : [];
    const replacedIdx = ml.findIndex((x) => x?.subIndex === si);
    if (replacedIdx >= 0) ml[replacedIdx] = item; else {
      // keep order by subIndex
      ml.push(item);
      ml.sort((a, b) => (a.subIndex || 0) - (b.subIndex || 0));
    }
    newMats[mi] = ml;
    const newContent = { ...(content || {}), materialsByMilestone: newMats, _generation: { inProgress: false, finishedAt: new Date().toISOString(), single: true } };
    await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: newContent } });
    return NextResponse.json({ ok: true, mode: 'single', milestoneIndex: mi, subIndex: si, item });
  }

  const materialsByMilestone: any[][] = [];
  try {
    for (let i = 0; i < milestones.length; i++) {
      const m = milestones[i];
      const list: string[] = Array.isArray(m.subbab)
        ? m.subbab
        : Array.isArray(m.sub_tasks)
          ? (m.sub_tasks as any[]).map((t) => (typeof t === 'string' ? t : t?.task)).filter(Boolean)
          : [];
      const items: any[] = [];
      for (let j = 0; j < list.length; j++) {
        const sub = list[j];
        const details = `- ${sub}`;
        const p = await prompt.format({ topic: `${m.topic} — ${sub}`, subbab: details });
        try {
          const res = await model.invoke([{ role: 'user', content: p }] as any);
          let text = (res as any)?.content?.[0]?.text || (res as any)?.content || '';
          text = String(text).slice(0, 5000); // cap body length per subbab
          const hero = `https://source.unsplash.com/1200x500/?${encodeURIComponent(sub)}`;
          const safeTitle = String(sub || '').slice(0, 200);
          items.push({ milestoneIndex: i, subIndex: j, title: safeTitle, body: String(text || '').trim(), points: [], heroImage: hero });
        } catch (e: any) {
          // Persist what we have so far and return a busy error
          materialsByMilestone.push(items);
          const partialContent = { ...(content || {}), materialsByMilestone };
          await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: { ...partialContent, _generation: { inProgress: false, finishedAt: new Date().toISOString() } } } });
          const msg = String(e?.message || 'Gagal membuat materi');
          const is429 = e?.status === 429 || /rate|quota|exhaust/i.test(msg) || /429/.test(msg);
          return NextResponse.json(
            { ok: false, partial: true, error: is429 ? 'Server sedang sibuk. Coba lagi sebentar.' : 'Terjadi kesalahan saat membuat materi.', count: materialsByMilestone.reduce((a, b) => a + b.length, 0) },
            { status: is429 ? 429 : 503 }
          );
        }
      }
      materialsByMilestone.push(items);
    }
  } catch (e: any) {
    const msg = String(e?.message || 'Gagal menyiapkan materi');
    const is429 = e?.status === 429 || /rate|quota|exhaust/i.test(msg) || /429/.test(msg);
    const partialContent = { ...(content || {}), materialsByMilestone };
    // Save partial progress if any
    try { await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: { ...partialContent, _generation: { inProgress: false, finishedAt: new Date().toISOString() } } } }); } catch {}
    return NextResponse.json(
      { ok: false, partial: true, error: is429 ? 'Server sedang sibuk. Coba lagi sebentar.' : 'Terjadi kesalahan saat menyiapkan materi.', count: materialsByMilestone.reduce((a, b) => a + b.length, 0) },
      { status: is429 ? 429 : 503 }
    );
  }

  // Save back into content.materials
  const newContent = { ...(content || {}), materialsByMilestone, _generation: { inProgress: false, finishedAt: new Date().toISOString() } };
  await (prisma as any).roadmap.update({ where: { id: roadmap.id }, data: { content: newContent } });

  return NextResponse.json({ ok: true, count: materialsByMilestone.reduce((a, b) => a + b.length, 0) });
}
