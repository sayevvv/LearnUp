// app/api/generate-explanation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

// Skema output yang sederhana, hanya berisi teks penjelasan
const explanationSchema = z.object({
  explanation: z.string().describe("Penjelasan materi yang detail dan mudah dipahami untuk pemula."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, details } = body;

    if (!topic || !details) {
      return NextResponse.json({ error: "Topic and details are required" }, { status: 400 });
    }

    const parser = StructuredOutputParser.fromZodSchema(explanationSchema);

    // Prompt khusus untuk menjadi "guru" atau "mentor"
    const promptTemplate = new PromptTemplate({
        template: `Anda adalah seorang mentor dan guru yang ahli dalam menjelaskan konsep teknis kepada pemula.
        
        Tugas Anda adalah mengambil sebuah topik dan ringkasan singkat, lalu mengembangkannya menjadi penjelasan yang detail, komprehensif, dan mudah dipahami.
        
        Gunakan analogi, contoh sederhana, dan jelaskan "mengapa" konsep ini penting. Susun dalam format paragraf yang mengalir dengan baik.

        Topik: {topic}
        Ringkasan Singkat: {details}

        Sekarang, jabarkan materi tersebut menjadi penjelasan yang panjang dan mendalam.
        
        {format_instructions}
        `,
        inputVariables: ["topic", "details"],
        partialVariables: { format_instructions: parser.getFormatInstructions() },
    });
    
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-1.5-flash-latest",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0.7, // Beri sedikit lebih banyak kreativitas untuk penjelasan
    });
    
    const chain = promptTemplate.pipe(model).pipe(parser);

    const result = await chain.invoke({
      topic: topic,
      details: details,
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error("Error generating explanation:", error);
    return NextResponse.json({ error: "Failed to generate explanation." }, { status: 500 });
  }
}