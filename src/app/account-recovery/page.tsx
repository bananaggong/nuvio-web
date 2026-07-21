import type { Metadata } from "next";
import { AccountRecoveryPanel } from "@/components/account-recovery-panel";
import { AuthHeader } from "@/components/auth-ui";
import type { LoginIntent } from "@/components/login-panel";
import { createSeoMetadata } from "@/lib/seo";
import { isSafeRelativePath } from "@/lib/url-security";

export const metadata: Metadata = createSeoMetadata({
  title: "가입 계정 찾기",
  noIndex: true,
  path: "/account-recovery",
});

type AccountRecoveryPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountRecoveryPage({
  searchParams,
}: AccountRecoveryPageProps) {
  const params = (await searchParams) ?? {};
  const intent = normalizeIntent(getFirstParam(params.intent));
  const nextPath = getSafeNextPath(getFirstParam(params.next));
  const loginPath = getLoginPath(nextPath, intent);

  return (
    <div className="min-h-screen bg-white">
      <AuthHeader backHref={loginPath} />
      <div className="min-h-[calc(100vh-3.5rem)]">
        <AccountRecoveryPanel
          intent={intent}
          loginPath={loginPath}
          nextPath={nextPath}
        />
      </div>
    </div>
  );
}

function getFirstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSafeNextPath(value: string | undefined): string | null {
  return value && isSafeRelativePath(value) ? value : null;
}

function normalizeIntent(value: string | undefined): LoginIntent | null {
  return value === "apply" || value === "participant" || value === "host"
    ? value
    : null;
}

function getLoginPath(nextPath: string | null, intent: LoginIntent | null) {
  const params = new URLSearchParams();
  if (intent) params.set("intent", intent);
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}
