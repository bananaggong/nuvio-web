"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type PendingNavigation =
  | { href: string; kind: "external" | "internal" }
  | { kind: "history-back" };

type UnsavedChangesGuardProps = {
  cancelLabel?: string;
  confirmLabel?: string;
  message?: string;
  title?: string;
  when: boolean;
};

export function UnsavedChangesGuard({
  cancelLabel = "취소",
  confirmLabel = "나가기",
  message = "변경사항이 저장되지 않을 수 있습니다.",
  title = "입력을 취소하시겠습니까?",
  when,
}: UnsavedChangesGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const allowNavigationRef = useRef(false);
  const armedHistoryRef = useRef(false);
  const whenRef = useRef(when);

  useEffect(() => {
    whenRef.current = when;
  }, [when]);

  const openConfirm = useCallback((navigation: PendingNavigation) => {
    setPendingNavigation(navigation);
  }, []);

  const closeConfirm = useCallback(() => {
    setPendingNavigation(null);
  }, []);

  const confirmNavigation = useCallback(() => {
    const navigation = pendingNavigation;
    if (!navigation) return;

    allowNavigationRef.current = true;
    setPendingNavigation(null);

    window.setTimeout(() => {
      allowNavigationRef.current = false;
    }, 1600);

    if (navigation.kind === "history-back") {
      window.history.go(-2);
      return;
    }

    if (navigation.kind === "internal") {
      router.push(navigation.href);
      return;
    }

    window.location.href = navigation.href;
  }, [pendingNavigation, router]);

  useEffect(() => {
    if (!when) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!whenRef.current || allowNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [when]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!whenRef.current || allowNavigationRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      const targetUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      const samePageHashOnly =
        targetUrl.origin === currentUrl.origin &&
        targetUrl.pathname === currentUrl.pathname &&
        targetUrl.search === currentUrl.search &&
        targetUrl.hash &&
        targetUrl.hash !== currentUrl.hash;

      if (samePageHashOnly) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const isInternal = targetUrl.origin === window.location.origin;
      openConfirm(
        isInternal
          ? {
              href: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
              kind: "internal",
            }
          : { href: targetUrl.href, kind: "external" },
      );
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [openConfirm]);

  useEffect(() => {
    if (!when || armedHistoryRef.current) return;

    window.history.pushState({ nuvioUnsavedGuard: true }, "", window.location.href);
    armedHistoryRef.current = true;
  }, [pathname, when]);

  useEffect(() => {
    function handlePopState() {
      if (!whenRef.current || allowNavigationRef.current) return;

      window.history.pushState({ nuvioUnsavedGuard: true }, "", window.location.href);
      openConfirm({ kind: "history-back" });
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [openConfirm]);

  useEffect(() => {
    if (when) return;
    armedHistoryRef.current = false;
  }, [when]);

  if (!pendingNavigation) return null;

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 px-5"
      role="dialog"
    >
      <section className="w-[320px] overflow-hidden bg-white text-[#0D0D0C] shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="px-5 py-5">
          <h2 className="text-[16px] font-semibold leading-[1.4]">{title}</h2>
          <p className="mt-2 text-[15px] font-medium leading-[1.4]">{message}</p>
        </div>
        <div className="grid h-[51px] grid-cols-2 border-t border-[#D7D7D7]">
          <button
            className="border-r border-[#D7D7D7] text-[15px] font-semibold text-[#0D0D0C] transition hover:bg-[#F7F7F7]"
            onClick={closeConfirm}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className="text-[15px] font-semibold text-[#008CFF] transition hover:bg-[#F7F7F7]"
            onClick={confirmNavigation}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
