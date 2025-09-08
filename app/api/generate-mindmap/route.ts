// app/api/generate-mindmap/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// Zod Schema untuk mindmap yang bercabang
const mindmapSchema = z.object({
  topic: z.string().describe("Topik utama dari mindmap."),
  subtopics: z.array(
    z.object({
      id: z.number().describe("ID unik untuk sub-topik."),
      topic: z.string().describe("Judul sub-topik."),
      details: z.string().describe("Detail atau penjelasan singkat untuk sub-topik."),
      dependencies: z.array(z.number()).describe("Daftar ID sub-topik lain yang menjadi prasyarat."),
    })
  ).describe("Daftar sub-topik dalam mindmap."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, details } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(mindmapSchema);

    const promptTemplate = new PromptTemplate({
        template: `Anda adalah seorang ahli dalam memecah topik kompleks menjadi bagian-bagian yang lebih kecil dalam format mindmap.

        Buatkan mindmap yang detail dan bercabang untuk topik berikut:
        - Topik Utama: {topic}
        - Konteks/Detail Tambahan: {details}

        Lakukan proses reasoning berikut:
        1.  Identifikasi konsep-konsep inti dari topik utama.
        2.  Pecah setiap konsep inti menjadi sub-topik yang lebih spesifik.
        3.  Tentukan hubungan dan dependensi antar sub-topik. Mana yang harus dipelajari lebih dulu?
        4.  Susun dalam struktur mindmap dengan ID unik untuk setiap sub-topik.

        Setelah selesai, hasilkan output HANYA dalam format JSON yang valid.
        
        {format_instructions}
        
        Permintaan:
        Topic: {topic}
        Details: {details}`,
        inputVariables: ["topic", "details"],
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

    const result = await chain.invoke({
      topic: topic,
      details: details || "Tidak ada detail tambahan.",
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Error generating mindmap:", error);
    return NextResponse.json({ error: "Failed to generate mindmap." }, { status: 500 });
  }
}