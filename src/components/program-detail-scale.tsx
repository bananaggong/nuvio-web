"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

const FIGMA_DESKTOP_WIDTH = 1440;
const MAX_DESKTOP_WIDTH = 1920;
const DESKTOP_BREAKPOINT = 1100;
const MAX_SCALE = MAX_DESKTOP_WIDTH / FIGMA_DESKTOP_WIDTH;

type ZoomStyle = CSSProperties & {
  zoom?: number;
};

export function ProgramDetailScale({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (window.innerWidth < DESKTOP_BREAKPOINT) {
        setScale(1);
        return;
      }

      setScale(Math.min(MAX_SCALE, window.innerWidth / FIGMA_DESKTOP_WIDTH));
    }

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="mx-auto w-fit max-w-full" style={{ zoom: scale } as ZoomStyle}>
      {children}
    </div>
  );
}
