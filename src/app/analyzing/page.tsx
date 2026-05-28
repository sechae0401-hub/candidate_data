import { SessionGuard } from "@/components/session-guard";
import { AnalyzingWorkspace } from "@/classify/analyzing-workspace";

export default function AnalyzingPage() {
  return (
    <SessionGuard>
      <AnalyzingWorkspace />
    </SessionGuard>
  );
}
