import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("server-only guard is declared in the Supabase server client", async () => {
  const file = await readFile(new URL("../src/shared/supabase/server.ts", import.meta.url), "utf8");

  assert.match(file, /import "server-only";/);
});
