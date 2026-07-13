"use client";

import { ChevronDown } from "lucide-react";
import { useState, type CSSProperties } from "react";

export const channelReviewCollapseThreshold = 180;

type ChannelReviewBodyProps = {
  body: string;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  style?: CSSProperties;
  toggleClassName?: string;
  toggleIconSize?: number | string;
  toggleStyle?: CSSProperties;
};

export function ChannelReviewBody({
  body,
  className,
  contentClassName,
  contentStyle,
  style,
  toggleClassName,
  toggleIconSize = "1em",
  toggleStyle,
}: ChannelReviewBodyProps) {
  const [expanded, setExpanded] = useState(false);
  const canToggle = shouldCollapseChannelReview(body);
  const iconDimension = typeof toggleIconSize === "number" ? `${toggleIconSize}px` : toggleIconSize;

  return (
    <div className={className} style={style}>
      <p
        className={`${contentClassName ?? ""} ${canToggle && !expanded ? "line-clamp-4" : ""}`.trim()}
        style={contentStyle}
      >
        {body}
      </p>
      {canToggle ? (
        <button
          aria-expanded={expanded}
          className={toggleClassName}
          onClick={() => setExpanded((current) => !current)}
          style={toggleStyle}
          type="button"
        >
          {expanded ? "접기" : "펼치기"}
          <ChevronDown
            aria-hidden="true"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            style={{ height: iconDimension, width: iconDimension }}
          />
        </button>
      ) : null}
    </div>
  );
}

export function shouldCollapseChannelReview(body: string): boolean {
  const normalizedBody = body.trim().replace(/\s+/gu, " ");
  return Array.from(normalizedBody).length > channelReviewCollapseThreshold;
}
