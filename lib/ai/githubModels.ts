import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function githubChatCompletion(messages: ChatMessage[], model = "openai/gpt-5-mini") {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN env var");
  const endpoint = process.env.GITHUB_MODELS_ENDPOINT || "https://models.github.ai/inference";

  const client = ModelClient(endpoint, new AzureKeyCredential(token));
  const response = await client.path("/chat/completions").post({ body: { messages, model } });
  if (isUnexpected(response)) {
    throw new Error(response.body?.error?.message || "GitHub Models error");
  }
  const text = response.body?.choices?.[0]?.message?.content || "";
  return text;
}
