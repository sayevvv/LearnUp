// app/api/generate-explanation-short/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// Return a concise 3-4 sentence explanation
const summarySchema = z.object({
  explanation: z.string().describe("Ringkasan singkat (3-4 kalimat) yang padat dan mudah dipahami."),
});

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
      template: `Anda adalah mentor yang menjelaskan topik secara ringkas.

Tuliskan ringkasan 3-4 kalimat yang padat dan jelas tentang topik berikut.
Fokus pada inti konsep dan manfaat praktis. Hindari daftar poin; gunakan paragraf yang mengalir.

Topik: {topic}
Rangkuman Subtopik (opsional): {details}

Keluaran harus singkat, mudah dipahami pemula, dan langsung ke intinya.

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

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error generating short explanation:", error);
    return NextResponse.json({ error: "Failed to generate short explanation." }, { status: 500 });
  }
}
