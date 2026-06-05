import { SessionGuard } from "@/components/session-guard";
import { DashboardWorkspace } from "@/result/dashboard-workspace";

export default function DashboardPage() {
  return (
    <SessionGuard>
      <DashboardWorkspace />
    </SessionGuard>
  );
}
