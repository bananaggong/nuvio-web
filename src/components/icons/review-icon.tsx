import type { CSSProperties, HTMLAttributes } from "react";

import { nuvioIcons } from "@/components/icons/nuvio-icons";

const reviewIconMask = {
  WebkitMaskImage: `url(${nuvioIcons.review})`,
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  maskImage: `url(${nuvioIcons.review})`,
  maskPosition: "center",
  maskRepeat: "no-repeat",
  maskSize: "contain",
} satisfies CSSProperties;

type ReviewIconProps = Omit<HTMLAttributes<HTMLSpanElement>, "children"> & {
  size?: number | string;
};

export function ReviewIcon({
  className,
  size = 20,
  style,
  ...props
}: ReviewIconProps) {
  const dimension = typeof size === "number" ? `${size}px` : size;
  const labelled = Boolean(props["aria-label"]);

  return (
    <span
      {...props}
      aria-hidden={labelled ? undefined : true}
      className={`inline-block shrink-0 bg-current ${className ?? ""}`}
      role={props.role ?? (labelled ? "img" : undefined)}
      style={{
        ...reviewIconMask,
        height: dimension,
        width: dimension,
        ...style,
      }}
    />
  );
}
