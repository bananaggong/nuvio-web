import type { CSSProperties } from "react";

export const px = (value: number) =>
  `clamp(${value}px, ${(value / 14.4).toFixed(6)}vw, ${(value * 4 / 3).toFixed(6)}px)`;

export const channelGuestScaleRootStyle = {
  "--channel-font-14": px(14),
  "--channel-font-16": px(16),
  "--channel-font-24": px(24),
} as CSSProperties;

export const channelGuestContentStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
} as CSSProperties;
