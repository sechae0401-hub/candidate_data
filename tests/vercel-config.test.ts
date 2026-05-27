import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("vercel cron pings the lightweight health route daily", async () => {
  const raw = await readFile(new URL("../vercel.json", import.meta.url), "utf8");
  const config = JSON.parse(raw) as {
    crons: Array<{ path: string; schedule: string }>;
    functions: Record<string, { maxDuration: number }>;
  };

  assert.deepEqual(config.crons, [{ path: "/api/ping", schedule: "0 0 * * *" }]);
  assert.equal(config.functions["src/app/api/classify/route.ts"]?.maxDuration, 9);
});
