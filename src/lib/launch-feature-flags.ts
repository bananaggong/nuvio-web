function isEnabled(value: string | undefined): boolean {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

export const launchFeatureFlags = {
  coupons: false,
  promotions: false,
  reviews: isEnabled(process.env.NEXT_PUBLIC_ENABLE_REVIEWS),
} as const;

export function isLaunchFeatureEnabled(
  feature: keyof typeof launchFeatureFlags,
) {
  return launchFeatureFlags[feature];
}
