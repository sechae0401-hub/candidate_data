import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";

import { runWithGptRetry, type GptRetryOptions } from "@/lib/gpt-retry";
import { readGeminiEnv } from "@/shared/env/read-server-env";

let geminiClient: GoogleGenerativeAI | undefined;

function getGeminiClient() {
  if (!geminiClient) {
    const env = readGeminiEnv();
    geminiClient = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  return geminiClient;
}

export async function runGeminiJsonRequest(
  input: string,
  options: GptRetryOptions = {},
): Promise<{ output_text: string | null }> {
  const env = readGeminiEnv();

  return runWithGptRetry(async () => {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({
      model: env.GEMINI_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(input);
    const text = result.response.text();

    return { output_text: text };
  }, options);
}
