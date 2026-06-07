import type { Metadata } from "next";
import { HostFormBuilder } from "@/components/host-form-builder";
import { requireHostConsoleAccess } from "@/lib/host-route-guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "신청폼 편집 | 누비오 호스트",
  description: "선택한 신청폼의 블록과 질문을 편집하는 화면입니다.",
};

export default async function HostFormEditPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const decodedFormId = decodeURIComponent(formId);
  await requireHostConsoleAccess(
    `/host/forms/${encodeURIComponent(decodedFormId)}`,
  );

  return (
    <>
      <HostFormBuilder formId={decodedFormId} />
    </>
  );
}
