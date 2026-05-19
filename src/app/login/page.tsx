import type { Metadata } from "next";
import {
  LoginPanel,
  type LoginIntent,
} from "@/components/login-panel";
import { createSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = createSeoMetadata({
  title: "로그인",
  noIndex: true,
  path: "/login",
});

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};

  return (
    <LoginPanel
      initialParams={{
        errorMessage: params.error ? "소셜 로그인 처리 중 문제가 발생했습니다." : "",
        intent: normalizeIntent(getFirstParam(params.intent)),
        mode: getFirstParam(params.mode) === "email" ? "email" : "choice",
        nextPath: getSafeNextPath(getFirstParam(params.next)),
      }}
    />
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeNextPath(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function normalizeIntent(value: string | undefined): LoginIntent | null {
  return value === "participant" || value === "host" ? value : null;
}
