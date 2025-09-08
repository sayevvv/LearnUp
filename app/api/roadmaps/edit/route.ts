// app/api/roadmaps/edit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { sanitizeString, rateLimit, getClientIp, isSameOrigin } from "@/lib/security";

// Roadmap schema reused from generation endpoint
const roadmapSchema = z.object({
  duration: z.string(),
  milestones: z.array(
    z.object({
      timeframe: z.string(),
      topic: z.string(),
      // Accept new 'subbab' and keep backward compat with legacy 'sub_tasks'
      subbab: z.array(z.string()).optional(),
      sub_tasks: z.array(z.string()).optional(),
      estimated_dates: z.string().optional(),
      daily_duration: z.string().optional(),
    })
  ),
});

const editResponseSchema = z.object({
  updated: roadmapSchema,
  summary: z.string().describe("Ringkasan singkat perubahan yang diterapkan"),
});

export async function POST(req: NextRequest) {
  try {
    // CSRF basic: enforce same-origin for browsers
    if (!isSameOrigin(req as any)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    // Rate limit per IP
    const ip = getClientIp(req as any);
    const rl = rateLimit(`edit:${ip}`, 15, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi nanti." }, { status: 429 });
    }

    const body = await req.json();
    const { current, instruction, promptMode, constraints } = body ?? {};

    if (!current || !instruction) {
      return NextResponse.json({ error: "current roadmap and instruction are required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(editResponseSchema);

    const promptTemplate = new PromptTemplate({
      template: `Anda adalah asisten perancang kurikulum. Tugas Anda: **edit dan tingkatkan** roadmap pembelajaran berdasarkan instruksi pengguna, TANPA mengubah struktur dasar JSON.

Konteks:
- Mode Prompt: {promptMode}
- Batasan (bila ada): {constraints}

Roadmap Saat Ini (JSON):
{current}

Instruksi Pengguna:
{instruction}

Instruksi untuk Anda:
1. Terapkan perubahan yang diminta dengan aman dan konsisten.
2. Hormati batasan jadwal pada mode advanced (hari tersedia, tanggal, durasi harian). Jika tidak relevan, biarkan seperti adanya.
3. Jaga agar jumlah milestone tetap wajar; boleh tambah/kurangi bila diperlukan.
4. Pastikan setiap milestone memiliki timeframe realistis dan daftar subbab (materi) yang jelas; JANGAN memasukkan ujian/latihan/projek pada subbab.
5. Kembalikan hanya JSON sesuai format di bawah ini. Jangan menyertakan komentar atau teks lain.

{format_instructions}
`,
      inputVariables: ["current", "instruction", "promptMode", "constraints"],
      partialVariables: { format_instructions: parser.getFormatInstructions() },
    });

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.4,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

  const chain = promptTemplate.pipe(model).pipe(parser);

    const result = await chain.invoke({
      current: JSON.stringify(current),
      instruction: sanitizeString(String(instruction), { maxLen: 2000 }),
      promptMode: sanitizeString(String(promptMode || "simple"), { maxLen: 16 }),
      constraints: constraints ? JSON.stringify(constraints) : "{}",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error editing roadmap:", error);
    return NextResponse.json({ error: "Failed to edit roadmap." }, { status: 500 });
  }
}
