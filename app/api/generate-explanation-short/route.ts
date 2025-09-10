// app/api/generate-explanation-short/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// Return a concise 3-4 sentence explanation
const summarySchema = z.object({
  explanation: z.string().describe("Ringkasan bersih (tanpa 'Body :' atau artefak) 3-4 kalimat yang padat dan mudah dipahami."),
});

function cleanText(raw: string): string {
  return raw
    .replace(/^\s*Body\s*:?/i, '')
    .replace(/^\s*Penjelasan\s*:?/i, '')
    .replace(/\*\s*\*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const topic = (body?.topic || "").toString();
    const details = (body?.details || "").toString();

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(summarySchema);

    const promptTemplate = new PromptTemplate({
      template: `Anda adalah mentor yang merangkum topik secara ringkas dalam Bahasa Indonesia.

ATURAN:
1. Output 3–4 kalimat terpadu (bukan bullet list).
2. Jangan gunakan heading seperti 'Body:' atau 'Penjelasan:'. Langsung mulai.
3. Fokus: definisi inti, manfaat praktis, konteks pemakaian.
4. Hindari istilah Inggris yang dapat diterjemahkan, kecuali istilah teknis mapan.
5. Nada: informatif, lugas, tanpa pengulangan.
6. Hanya kembalikan JSON sesuai skema.

TOPIK: {topic}
SUBTOPIK (opsional): {details}

Hasilkan ringkasan.
{format_instructions}`,
      inputVariables: ["topic", "details"],
      partialVariables: { format_instructions: parser.getFormatInstructions() },
    });

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.4,
    });

    const chain = promptTemplate.pipe(model).pipe(parser);
  const result = await chain.invoke({ topic, details });
  const cleaned = { explanation: cleanText(result.explanation || '') };
  return NextResponse.json(cleaned, { status: 200 });
  } catch (error) {
    console.error("Error generating short explanation:", error);
    return NextResponse.json({ error: "Failed to generate short explanation." }, { status: 500 });
  }
}
