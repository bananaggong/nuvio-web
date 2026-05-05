import type { Provider } from "@supabase/supabase-js";

export type SocialProviderKey = "google" | "kakao" | "naver";

export type SocialProviderConfig = {
  key: SocialProviderKey;
  label: string;
  provider: Provider;
  helper: string;
};

export const socialProviders: SocialProviderConfig[] = [
  {
    key: "google",
    label: "Google",
    provider: "google",
    helper: "Google OAuth provider",
  },
  {
    key: "kakao",
    label: "Kakao",
    provider: "kakao",
    helper: "Kakao OAuth provider",
  },
  {
    key: "naver",
    label: "Naver",
    provider: getNaverProvider(),
    helper: "Supabase custom OAuth provider",
  },
];

function getNaverProvider(): Provider {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_NAVER_PROVIDER ?? "custom:naver"
  ) as Provider;
}
