import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { readSupabaseEnv } from "@/shared/env/server";
import type { Database } from "@/shared/types/database.types";

let supabaseServerClient: SupabaseClient<Database> | undefined;

export function getSupabaseServerClient() {
  if (!supabaseServerClient) {
    const env = readSupabaseEnv();

    supabaseServerClient = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseServerClient;
}
