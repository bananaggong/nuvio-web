import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "운영자 콘솔",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
