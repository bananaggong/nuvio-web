import type { Metadata } from "next";
import { AdminMagazineEditor } from "@/components/admin-magazine-editor";

export const metadata: Metadata = {
  title: "새 소식지 작성",
};

export default function AdminMagazineNewPage() {
  return <AdminMagazineEditor />;
}
