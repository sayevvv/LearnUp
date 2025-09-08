// app/api/generate-roadmap-gh/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { githubChatCompletion } from "@/lib/ai/githubModels";

// Match the same schema as the Gemini route
const roadmapSchema = z.object({
  duration: z.string(),
  milestones: z.array(
    z.object({
      timeframe: z.string(),
      topic: z.string(),
      subbab: z.array(z.string()).min(3).max(6),
      estimated_dates: z.string(),
      daily_duration: z.string(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, details, level, goal } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(roadmapSchema);

    const promptTemplate = new PromptTemplate({
      template: `Anda adalah seorang ahli perancang kurikulum. Buat roadmap pembelajaran yang dipersonalisasi, detail, dan realistis.

Analisis permintaan pengguna berikut:
- Topik Utama: {topic}
- Level Pengguna Saat Ini: {level}
- Tujuan Akhir Spesifik: {goal}
- Detail dan Batasan Lainnya: {details}

Lakukan proses reasoning berikut:
1. Sesuaikan titik awal roadmap berdasarkan level pengguna. Jika bukan pemula, hindari materi yang terlalu dasar.
2. Prioritaskan topik yang relevan untuk mencapai tujuan akhir spesifik pengguna.
3. Perhatikan batasan waktu: periode belajar, hari yang tersedia, dan durasi belajar harian.
4. Pecah topik menjadi beberapa milestone yang logis dan progresif.
5. Untuk setiap milestone:
  a. Alokasikan timeframe yang realistis (misal: "Minggu 1").
  b. Buat 3-5 subbab (sub-chapter) berupa judul materi apa yang HARUS dipelajari. Gunakan bahasa ringkas, jelas, dan best-practice.
    - Larangan: Jangan masukkan tugas, latihan, quiz, ujian, atau projek pada daftar subbab.
    - Format subbab: array of string.
  c. Jika data ada, sertakan estimated_dates (rentang tanggal) dan daily_duration (durasi harian). Jika tidak, biarkan kosong.

Hasil akhir HARUS memperhitungkan semua batasan dan membantu pengguna mencapai tujuan akhir.

Hasilkan output HANYA dalam format JSON yang valid sesuai skema.

{format_instructions}

Permintaan Pengguna:
Topic: {topic}
Level: {level}
Goal: {goal}
Details: {details}`,
      inputVariables: ["topic", "level", "goal", "details"],
      partialVariables: { format_instructions: parser.getFormatInstructions() },
    });

    const levelText = (typeof level === 'string' && level.trim()) ? level.trim() : 'Tidak disebutkan (asumsikan pemula jika tidak jelas)';
    const goalText = (typeof goal === 'string' && goal.trim()) ? goal.trim() : 'Tidak disebutkan secara spesifik';

    const prompt = await promptTemplate.format({
      topic,
      level: levelText,
      goal: goalText,
      details: details || 'Tidak ada detail tambahan.',
    });

    // Call GitHub Models chat completion and parse JSON
    const content = await githubChatCompletion([
      { role: 'system', content: 'Anda mengembalikan JSON murni sesuai format yang diminta, tanpa teks lain.' },
      { role: 'user', content: prompt },
    ]);

    // Try parsing; if model returns code fences, strip them
    const jsonText = content.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(jsonText);

    // Validate shape
    const safe = roadmapSchema.safeParse(parsed);
    if (!safe.success) {
      return NextResponse.json({ error: 'Invalid output from model', issues: safe.error.flatten() }, { status: 422 });
    }

    return NextResponse.json(safe.data, { status: 200 });
  } catch (error: any) {
    console.error('Error generating roadmap (GH):', error?.message || error);
    return NextResponse.json({ error: 'Failed to generate roadmap (GH).' }, { status: 500 });
  }
}
