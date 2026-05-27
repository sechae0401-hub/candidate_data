export interface OpenAiServerEnv {
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;
}

export interface SupabaseServerEnv {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
}

type EnvSource = Record<string, string | undefined>;

function requireEnv(name: keyof (OpenAiServerEnv & SupabaseServerEnv), env: EnvSource) {
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
