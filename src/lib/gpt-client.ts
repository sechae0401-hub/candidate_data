import "server-only";

import OpenAI from "openai";

import { runWithGptRetry, type GptRetryOptions } from "@/lib/gpt-retry";
import { readServerEnv } from "@/shared/env/server";

let openAiClient: OpenAI | undefined;

export function getOpenAiClient() {
  if (!openAiClient) {
    const env = readServerEnv();
    openAiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }

  return openAiClient;
}

export async function runOpenAiJsonRequest(
  input: string,
  options: GptRetryOptions = {},
) {
  const client = getOpenAiClient();
  const env = readServerEnv();

  return runWithGptRetry(
    () =>
      client.responses.create({
        model: env.OPENAI_MODEL,
        input,
      }),
    options,
  );
}
