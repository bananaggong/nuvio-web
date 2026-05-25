import type { Metadata } from "next";
import { MypageMemberInformation } from "@/components/mypage";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "회원 정보",
  noIndex: true,
  path: "/mypage/member-information",
});

type MypageMemberInformationRouteProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MypageMemberInformationRoute({
  searchParams,
}: MypageMemberInformationRouteProps) {
  const params = await searchParams;
  const addressSearch = params?.addressSearch;
  const edit = params?.edit;
  const selectedAddress = params?.selectedAddress;

  return (
    <MypageMemberInformation
      initialAddressSearchOpen={
        Array.isArray(addressSearch)
          ? addressSearch.includes("1")
          : addressSearch === "1"
      }
      initialEditMode={Array.isArray(edit) ? edit.includes("1") : edit === "1"}
      initialSelectedAddress={
        Array.isArray(selectedAddress) ? selectedAddress[0] ?? "" : selectedAddress ?? ""
      }
    />
  );
}
