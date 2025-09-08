// app/api/generate-roadmap/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// Skema Zod: gunakan "subbab" sebagai daftar materi yang harus dipelajari (tanpa ujian/latihan)
const roadmapSchema = z.object({
  duration: z.string().describe("Estimasi durasi total pembelajaran, contoh: '3 Bulan', '6 Minggu'."),
  milestones: z.array(
    z.object({
      timeframe: z.string().describe("Jangka waktu yang spesifik dan realistis untuk milestone ini, contoh: 'Minggu 1', 'Minggu 2-3', '2 Akhir Pekan'."),
      topic: z.string().describe("Topik utama yang akan dipelajari pada jangka waktu tersebut."),
      subbab: z.array(z.string()).min(3).max(6).describe("Daftar subbab (sub-chapter) materi yang harus dipelajari di milestone ini. Fokus pada konsep/materi; JANGAN masukkan ujian/quiz/latihan/projek di sini."),
      estimated_dates: z.string().describe("Estimasi rentang tanggal untuk milestone ini, contoh: '12 Agu - 18 Agu 2025'. Kosongkan jika tidak ada informasi tanggal dari pengguna."),
      daily_duration: z.string().describe("Estimasi durasi belajar harian untuk milestone ini, contoh: '2 jam/hari'. Kosongkan jika tidak ada informasi dari pengguna."),
    })
  ).describe("Daftar milestone pembelajaran."),
});

export async function POST(req: NextRequest) {
  try {
  const body = await req.json();
  const { topic, details, level, goal } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(roadmapSchema);

  // Prompt diperbarui: gunakan "subbab" (materi belajar), hindari ujian/latihan/projek di bawah node
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
    - Larangan: Jangan masukkan tugas, latihan, quiz, ujian, atau projek pada daftar subbab. Simpan itu sebagai fitur terpisah di masa depan.
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
    
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.5,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ]
    });
    
    const chain = promptTemplate.pipe(model).pipe(parser);

    const levelText = (typeof level === 'string' && level.trim()) ? level.trim() : 'Tidak disebutkan (asumsikan pemula jika tidak jelas)';
    const goalText = (typeof goal === 'string' && goal.trim()) ? goal.trim() : 'Tidak disebutkan secara spesifik';

    const result = await chain.invoke({
      topic: topic,
      level: levelText,
      goal: goalText,
      details: details || 'Tidak ada detail tambahan.',
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Error generating roadmap:", error);
    return NextResponse.json({ error: "Failed to generate roadmap." }, { status: 500 });
  }
}
