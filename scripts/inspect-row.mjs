import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8");
const env = Object.fromEntries(
  envFile.split("\n").filter(l => l.trim() && !l.startsWith("#"))
    .map(l => { const [k, ...v] = l.split("="); return [k.trim(), v.join("=").trim()]; })
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: sessions } = await supabase
  .from("sessions").select("id, cohort_name, analyzed_at").order("analyzed_at", { ascending: false }).limit(1);

const session = sessions?.[0];
if (!session) { console.log("세션 없음"); process.exit(0); }
console.log(`세션: ${session.cohort_name} (${session.id})\n`);

const { data: rows } = await supabase
  .from("classification_results")
  .select("row_index, interview_content, notes, primary_cause, secondary_action, detail_tags, competing_course, reasoning, needs_review")
  .eq("session_id", session.id)
  .in("row_index", [8, 9, 41, 100, 102])
  .order("row_index");

for (const row of rows ?? []) {
  console.log(`=== ${row.row_index}행 ===`);
  console.log(`인터뷰: ${row.interview_content}`);
  console.log(`특이사항: ${row.notes}`);
  console.log(`1차 원인: ${row.primary_cause}`);
  console.log(`2차 행동: ${row.secondary_action}`);
  console.log(`세부 태그: ${row.detail_tags}`);
  console.log(`타 과정: ${row.competing_course}`);
  console.log(`판단 근거: ${row.reasoning}`);
  console.log(`검토 필요: ${row.needs_review}`);
  console.log();
}
