// app/api/generate-title/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import { sanitizeString, rateLimit, getClientIp, isSameOrigin } from "@/lib/security";

const titleSchema = z.object({
  title: z
    .string()
    .describe(
      "Judul singkat (3-8 kata), natural, jelas, dan relevan dengan topik."
    ),
});

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req as any)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
    const ip = getClientIp(req as any);
    const rl = rateLimit(`title:${ip}`, 20, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const body = await req.json();
    const { topic, details } = body;

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(titleSchema);

    const promptTemplate = new PromptTemplate({
      template: `Anda adalah copywriter dan kurator judul. Buat satu judul terbaik yang ringkas untuk sebuah roadmap pembelajaran berdasarkan konteks berikut.

Topik Utama: {topic}
Detail Tambahan: {details}

Aturan:
- Bahasa alami, jelas, dan menarik untuk pembelajar Indonesia.
- 3–8 kata saja.
- Hindari tanda kutip dan karakter dekoratif.
- Jangan gunakan kata 'Roadmap' kecuali perlu.

Keluarkan HANYA dalam JSON valid sesuai format.

{format_instructions}`,
      inputVariables: ["topic", "details"],
      partialVariables: { format_instructions: parser.getFormatInstructions() },
    });

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const chain = promptTemplate.pipe(model).pipe(parser);

    const result = await chain.invoke({
      topic: sanitizeString(String(topic), { maxLen: 200 }),
      details: details ? sanitizeString(String(details), { maxLen: 800 }) : "",
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error generating title:", error);
    return NextResponse.json({ error: "Failed to generate title." }, { status: 500 });
  }
}
