import type { Metadata } from "next";
import { SignupPanel } from "@/components/signup-panel";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "회원가입",
  noIndex: true,
  path: "/signup",
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{
    intent?: string | string[];
    next?: string | string[];
  }>;
}) {
  const params = await searchParams;
  return (
    <SignupPanel
      intent={getSingleValue(params?.intent)}
      nextPath={getSingleValue(params?.next)}
    />
  );
}

function getSingleValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
