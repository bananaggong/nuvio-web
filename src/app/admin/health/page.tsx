import type { Metadata } from "next";
import { AdminSystemHealthPanel } from "@/components/admin-system-health-panel";

export const metadata: Metadata = {
  title: "시스템 상태",
};

export default function AdminHealthPage() {
  return <AdminSystemHealthPanel />;
}
