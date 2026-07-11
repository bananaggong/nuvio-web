"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type ProgramStateMaps = {
  alerts?: Record<string, boolean>;
  bookmarks?: Record<string, boolean>;
  tracks?: Record<string, boolean>;
};

export function ProgramDetailActions({
  hostName,
  programId,
  title,
}: {
  hostName?: string;
  programId: number | string;
  title: string;
}) {
  const id = String(programId);
  const [bookmarked, setBookmarked] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");
  const messageHref = useMemo(() => {
    const params = new URLSearchParams({
      programId: id,
      programTitle: title,
    });
    if (hostName) params.set("hostName", hostName);
    return `/mypage/messages?${params.toString()}`;
  }, [hostName, id, title]);

  useEffect(() => {
    let active = true;

    async function loadBookmarkState() {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (!sessionResponse.ok) return;

        const sessionPayload = (await sessionResponse.json()) as {
          data?: { user?: { id?: string } | null };
        };
        if (!sessionPayload.data?.user) return;

        const response = await fetch("/api/me/program-state", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ProgramStateMaps;
        };
        if (active) setBookmarked(Boolean(payload.data?.bookmarks?.[id]));

        void fetch("/api/me/program-state", {
          body: JSON.stringify({
            enabled: true,
            kind: "trackingEnabled",
            programId: id,
          }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        }).catch(() => undefined);
      } catch {
        // Signed-out users can still browse and share programs.
      }
    }

    void loadBookmarkState();

    return () => {
      active = false;
    };
  }, [id]);

  async function toggleBookmark() {
    if (pending) return;

    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    setPending(true);
    setStatus(nextBookmarked ? "저장했습니다." : "저장을 취소했습니다.");

    try {
      const response = await fetch("/api/me/program-state", {
        body: JSON.stringify({
          enabled: nextBookmarked,
          kind: "bookmarked",
          programId: id,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });

      if (response.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent(
          window.location.pathname,
        )}`;
        return;
      }

      const payload = (await response.json()) as {
        data?: ProgramStateMaps;
      };

      if (!response.ok || !payload.data) throw new Error("Save failed.");

      setBookmarked(Boolean(payload.data.bookmarks?.[id]));
    } catch {
      setBookmarked(bookmarked);
      setStatus("저장 상태를 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function shareProgram() {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        setStatus("공유 창을 열었습니다.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("공유 링크를 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus("공유 링크를 복사하지 못했습니다.");
    }
  }

  return (
    <div className="flex w-[99px] shrink-0 items-center justify-between text-[#CAC4BC] max-[1099px]:w-[132px]">
      <button
        aria-label="공유하기"
        className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0 max-[1099px]:size-11"
        onClick={() => void shareProgram()}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="size-5"
          height={21}
          src={nuvioIcons.share}
          width={21}
        />
      </button>
      <button
        aria-label={bookmarked ? "저장 취소" : "저장하기"}
        aria-pressed={bookmarked}
        className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0 disabled:cursor-wait disabled:opacity-60 max-[1099px]:size-11"
        disabled={pending}
        onClick={() => void toggleBookmark()}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="h-5 w-[17px]"
          height={20}
          src={bookmarked ? nuvioIcons.bookmarkFilled : nuvioIcons.bookmark}
          width={17}
        />
      </button>
      <Link
        aria-label="프로그램 관리자 메시지함 열기"
        className="inline-flex size-[21px] items-center justify-center border-0 bg-transparent p-0 max-[1099px]:size-11"
        href={messageHref}
      >
        <Image
          alt=""
          aria-hidden="true"
          className="size-5"
          height={21}
          src={nuvioIcons.mail}
          width={21}
        />
      </Link>
      <span aria-live="polite" className="sr-only">
        {status}
      </span>
    </div>
  );
}
