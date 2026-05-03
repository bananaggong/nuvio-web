import type { Metadata } from "next";
import { LoginPanel } from "@/components/login-panel";

export const metadata: Metadata = {
  title: "로그인",
};

export default function LoginPage() {
  return <LoginPanel />;
}
