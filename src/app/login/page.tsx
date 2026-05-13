import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "로그인",
  noIndex: true,
  path: "/login",
});

export default function LoginPage() {
  return <LoginPanel />;
}
