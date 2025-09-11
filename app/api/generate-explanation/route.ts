// app/api/generate-explanation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// Skema output sederhana
const explanationSchema = z.object({
  explanation: z.string().describe("Penjelasan materi yang bersih (tanpa heading 'Body :' atau artefak), rapi, detail, dan mudah dipahami pemula."),
});

function cleanText(raw: string): string {
  let txt = raw
    // Hilangkan label umum yang sering bocor
    .replace(/^\s*Body\s*:?/i, '')
    .replace(/^\s*Penjelasan\s*:?/i, '')
    // Hilangkan bullet salah format seperti '* *'
    .replace(/\*\s*\*/g, '')
    // Normalisasi bold markdown yang rusak (misal ** kata **)
    .replace(/\*\*\s+/g, '**')
    .replace(/\s+\*\*/g, '**')
    // Hilangkan bold kosong
    .replace(/\*\*\s*\*\*/g, '')
    // Spasi berlebih
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Jika masih diawali tanda kutip atau backtick aneh, bersihkan ringan
  txt = txt.replace(/^"+/, '').replace(/"+$/, '');
  return txt.trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, details } = body;

    if (!topic || !details) {
      return NextResponse.json({ error: "Topic and details are required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(explanationSchema);

    // Prompt diperketat untuk menghindari kebocoran format & enforce Bahasa Indonesia
    const promptTemplate = new PromptTemplate({
      template: `Anda adalah mentor ahli yang menjelaskan konsep teknis kepada pemula dalam Bahasa Indonesia yang jelas, natural, dan runtut.

ATURAN:
1. Gunakan Bahasa Indonesia. Jangan gunakan bahasa Inggris kecuali istilah teknis yang tidak wajar diterjemahkan.
2. Jangan tampilkan heading seperti "Body:", "Penjelasan:", atau label lain—langsung mulai dengan isi.
3. Jangan gunakan daftar bullet kecuali benar-benar perlu. Jika konsep enumerasi penting, gunakan kalimat transisi atau bullet konsisten dengan dash (-) bukan asterisk ganda.
4. Jangan menghasilkan markdown dekoratif yang tidak diperlukan (hindari ** tebal ** kecuali menyorot istilah penting). Jangan ada blok kode kecuali diminta (tidak diminta di sini).
5. Struktur ideal: (a) Konteks & definisi inti (b) Mengapa penting (c) Cara kerja / inti konsep (d) Contoh sederhana (e) Kesalahan umum / tips praktis (f) Ringkas ulang inti.
6. Panjang: komprehensif namun fokus. Hindari pengulangan tidak perlu.
7. Hindari filler seperti "Dalam konteks ini" berulang.
8. Output HARUS sesuai skema JSON (field explanation), tanpa menambahkan field lain.

TOPIK: {topic}
RINGKASAN AWAL: {details}

Tulis penjelasan sesuai aturan.
{format_instructions}`,
      inputVariables: ["topic", "details"],
      partialVariables: { format_instructions: parser.getFormatInstructions() },
    });
    
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7, // Beri sedikit lebih banyak kreativitas untuk penjelasan
    });
    
    const chain = promptTemplate.pipe(model).pipe(parser);

  const result = await chain.invoke({ topic, details });
  const cleaned = { explanation: cleanText(result.explanation || '') };
  return NextResponse.json(cleaned, { status: 200 });

  } catch (error) {
    console.error("Error generating explanation:", error);
    return NextResponse.json({ error: "Failed to generate explanation." }, { status: 500 });
  }
}