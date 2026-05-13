import type { Metadata } from "next";
import { AdminAuditLogPanel } from "@/components/admin-audit-log-panel";

export const metadata: Metadata = {
  title: "운영 감사 로그",
};

export default function AdminLogsPage() {
  return <AdminAuditLogPanel />;
}
