import type { Provider } from "@supabase/supabase-js";

export type SocialProviderKey = "google" | "kakao" | "naver";

export type SocialProviderConfig = {
  key: SocialProviderKey;
  label: string;
  provider: Provider;
  helper: string;
};

export function createSocialProviders(
  naverProviderValue: string | undefined,
): SocialProviderConfig[] {
  const providers: SocialProviderConfig[] = [
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
  ];
  const naverProvider = naverProviderValue?.trim();

  if (naverProvider && /^custom:[a-z0-9][a-z0-9_-]{0,63}$/iu.test(naverProvider)) {
    providers.push({
      key: "naver",
      label: "Naver",
      provider: naverProvider as Provider,
      helper: "Supabase custom OAuth provider",
    });
  }

  return providers;
}

export const socialProviders = createSocialProviders(
  process.env.NEXT_PUBLIC_SUPABASE_NAVER_PROVIDER,
);
