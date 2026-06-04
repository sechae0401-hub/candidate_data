import "server-only";

import OpenAI from "openai";

import { runGeminiJsonRequest } from "@/lib/gemini-client";
import { runWithGptRetry, type GptRetryOptions } from "@/lib/gpt-retry";
import { readAiProvider, readOpenAiEnv } from "@/shared/env/server";

let openAiClient: OpenAI | undefined;

export function getOpenAiClient() {
  if (!openAiClient) {
    const env = readOpenAiEnv();
    openAiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  return openAiClient;
}

export async function runOpenAiJsonRequest(
  input: string,
  options: GptRetryOptions = {},
) {
  const client = getOpenAiClient();
  const env = readOpenAiEnv();

  return runWithGptRetry(async () => {
    const response = await client.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [{ role: "user", content: input }],
      response_format: { type: "json_object" },
    });
    return { output_text: response.choices[0]?.message?.content ?? null };
  }, options);
}

export async function runAiJsonRequest(
  input: string,
  options: GptRetryOptions = {},
) {
  const provider = readAiProvider();

  if (provider === "gemini") {
    return runGeminiJsonRequest(input, options);
  }

  return runOpenAiJsonRequest(input, options);
}
