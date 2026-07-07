export const launchFeatureFlags = {
  coupons: false,
  promotions: false,
  reviews: true,
  reviewReplies: false,
} as const;

export function isLaunchFeatureEnabled(
  feature: keyof typeof launchFeatureFlags,
) {
  return launchFeatureFlags[feature];
}
