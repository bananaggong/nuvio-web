import type { Metadata } from "next";
import { AdminMagazineList } from "@/components/admin-magazine-list";

export const metadata: Metadata = {
  title: "소식지 관리",
};

export default function AdminMagazinePage() {
  return <AdminMagazineList />;
}
