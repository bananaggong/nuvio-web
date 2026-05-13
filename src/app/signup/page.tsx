import type { Metadata } from "next";
import { SignupPanel } from "@/components/signup-panel";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "회원가입",
  noIndex: true,
  path: "/signup",
});

export default function SignupPage() {
  return <SignupPanel />;
}
