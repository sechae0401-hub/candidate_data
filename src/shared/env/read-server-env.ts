export interface OpenAiServerEnv {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
}

export interface GeminiServerEnv {
  GEMINI_API_KEY: string;
  GEMINI_MODEL: string;
}

export interface SupabaseServerEnv {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
}

export type AiProvider = "openai" | "gemini";

type EnvSource = Record<string, string | undefined>;

function requireEnv(name: keyof (OpenAiServerEnv & SupabaseServerEnv), env: EnvSource) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

function requireString(name: string, env: EnvSource) {
  const value = env[name];

  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }

  return value;
}

export function readOpenAiEnv(env: EnvSource = process.env): OpenAiServerEnv {
  return {
    OPENAI_API_KEY: requireEnv("OPENAI_API_KEY", env),
    OPENAI_MODEL: requireEnv("OPENAI_MODEL", env),
  };
}

export function readSupabaseEnv(env: EnvSource = process.env): SupabaseServerEnv {
  return {
    SUPABASE_SERVICE_ROLE_KEY: requireEnv("SUPABASE_SERVICE_ROLE_KEY", env),
    SUPABASE_URL: requireEnv("SUPABASE_URL", env),
  };
}

export function readServerEnv(env: EnvSource = process.env): OpenAiServerEnv & SupabaseServerEnv {
  return {
    ...readOpenAiEnv(env),
    ...readSupabaseEnv(env),
  };
}

export function readGeminiEnv(env: EnvSource = process.env): GeminiServerEnv {
  return {
    GEMINI_API_KEY: requireString("GEMINI_API_KEY", env),
    GEMINI_MODEL: env["GEMINI_MODEL"] ?? "gemini-2.0-flash",
  };
}

export function readAiProvider(env: EnvSource = process.env): AiProvider {
  return env["AI_PROVIDER"] === "gemini" ? "gemini" : "openai";
}
