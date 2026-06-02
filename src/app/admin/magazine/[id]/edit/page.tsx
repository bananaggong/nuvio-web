import type { Metadata } from "next";
import { AdminMagazineEditor } from "@/components/admin-magazine-editor";

export const metadata: Metadata = {
  title: "소식지 수정",
};

export default async function AdminMagazineEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminMagazineEditor postId={id} />;
}
