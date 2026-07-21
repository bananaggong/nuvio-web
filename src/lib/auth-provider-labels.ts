const providerLabels = {
  "custom:naver": "네이버",
  email: "이메일/비밀번호",
  google: "Google",
  kakao: "카카오",
} as const;

const providerOrder = ["kakao", "custom:naver", "google", "email"] as const;

export type KnownAuthProvider = keyof typeof providerLabels;

export function getAuthProviderLabel(provider: string): string | null {
  const normalizedProvider = normalizeAuthProvider(provider);
  return normalizedProvider ? providerLabels[normalizedProvider] : null;
}

export function getAuthProviderLabels(providers: Iterable<string>): string[] {
  const normalizedProviders = new Set<KnownAuthProvider>();
  for (const provider of providers) {
    const normalizedProvider = normalizeAuthProvider(provider);
    if (normalizedProvider) normalizedProviders.add(normalizedProvider);
  }

  return providerOrder.flatMap((provider) =>
    normalizedProviders.has(provider) ? [providerLabels[provider]] : [],
  );
}

function normalizeAuthProvider(provider: string): KnownAuthProvider | null {
  const normalizedProvider = provider.trim().toLowerCase();
  if (normalizedProvider === "naver") return "custom:naver";
  return normalizedProvider in providerLabels
    ? (normalizedProvider as KnownAuthProvider)
    : null;
}
