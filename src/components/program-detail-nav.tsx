"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type ProgramDetailNavTab = {
  href: string;
  label: string;
};

function getSectionId(href: string) {
  return href.startsWith("#") ? href.slice(1) : "";
}

function getActivationLine() {
  if (typeof window === "undefined") return 104;

  if (window.matchMedia("(max-width: 767px)").matches) {
    return 104;
  }

  return Math.max(56, window.innerWidth * 0.04861) + 42;
}

export function ProgramDetailNav({ tabs }: { tabs: ProgramDetailNavTab[] }) {
  const [activeHref, setActiveHref] = useState(tabs[0]?.href ?? "");
  const frameRef = useRef<number | null>(null);
  const tabRefs = useRef(new Map<string, HTMLAnchorElement>());

  const sectionIds = useMemo(
    () =>
      tabs
        .map((tab) => ({ href: tab.href, id: getSectionId(tab.href) }))
        .filter((tab) => tab.id),
    [tabs],
  );

  const updateActiveTab = useCallback(() => {
    const markerY = getActivationLine();
    let nextHref = tabs[0]?.href ?? "";

    for (const tab of sectionIds) {
      const section = document.getElementById(tab.id);
      if (!section) continue;

      if (section.getBoundingClientRect().top <= markerY) {
        nextHref = tab.href;
      }
    }

    setActiveHref((currentHref) =>
      currentHref === nextHref ? currentHref : nextHref,
    );
  }, [sectionIds, tabs]);

  const scheduleUpdate = useCallback(() => {
    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      updateActiveTab();
    });
  }, [updateActiveTab]);

  useEffect(() => {
    scheduleUpdate();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("hashchange", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("hashchange", scheduleUpdate);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [scheduleUpdate]);

  useEffect(() => {
    tabRefs.current.get(activeHref)?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [activeHref]);

  return (
    <nav
      aria-label="프로그램 상세 메뉴"
      className="sticky top-[max(56px,4.861vw)] z-30 flex h-[33px] w-full items-center gap-[21px] overflow-x-auto border-y-[0.5px] border-[#F5E1D3] bg-white/95 pt-1.5 backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-md:top-[56px] max-md:gap-4"
    >
      {tabs.map((tab) => {
        const isActive = tab.href === activeHref;

        return (
          <a
            aria-current={isActive ? "page" : undefined}
            className={`relative inline-flex h-[27px] shrink-0 items-center justify-center whitespace-nowrap text-xs ${
              isActive
                ? "pb-3 font-semibold leading-[1.253] text-[#5B3A29] after:absolute after:bottom-[-1px] after:left-0 after:h-0.5 after:w-full after:bg-[#FE701E]"
                : "pb-2 font-normal leading-[1.6] text-[#CAC4BC]"
            }`}
            href={tab.href}
            key={tab.href}
            onClick={() => setActiveHref(tab.href)}
            ref={(element) => {
              if (element) {
                tabRefs.current.set(tab.href, element);
              } else {
                tabRefs.current.delete(tab.href);
              }
            }}
          >
            {tab.label}
          </a>
        );
      })}
    </nav>
  );
}
