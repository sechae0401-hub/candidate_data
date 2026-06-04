import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// .env.local 파일에서 환경변수 읽기
const envPath = resolve(process.cwd(), ".env.local");
const envFile = readFileSync(envPath, "utf-8");

const env = Object.fromEntries(
  envFile
    .split("\n")
    .filter((line) => line.trim() && !line.startsWith("#"))
    .map((line) => {
      const [key, ...rest] = line.split("=");
      return [key.trim(), rest.join("=").trim()];
    }),
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("🗑️  테스트 데이터 삭제 시작...");

const { error: e1 } = await supabase.from("new_categories").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (e1) { console.error("new_categories 삭제 실패:", e1.message); process.exit(1); }
console.log("✅ new_categories 삭제 완료");

const { error: e2 } = await supabase.from("classification_results").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (e2) { console.error("classification_results 삭제 실패:", e2.message); process.exit(1); }
console.log("✅ classification_results 삭제 완료");

const { error: e3 } = await supabase.from("sessions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
if (e3) { console.error("sessions 삭제 실패:", e3.message); process.exit(1); }
console.log("✅ sessions 삭제 완료");

console.log("\n🎉 완료! 이제 실제 데이터를 업로드할 수 있습니다.");
