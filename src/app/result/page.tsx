import { SessionGuard } from "@/components/session-guard";
import { ResultWorkspace } from "@/result/result-workspace";

export default function ResultPage() {
  return (
    <SessionGuard>
      <ResultWorkspace />
    </SessionGuard>
  );
}
