"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type UserNotification = {
  body: string;
  createdAt: string;
  href: string;
  id: string;
  readAt: string;
  title: string;
  type: string;
};

type NotificationsPayload = {
  data?: UserNotification[];
  meta?: {
    unreadCount?: number;
  };
};

export function NotificationBellPopover({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async (showSpinner = true) => {
    if (!signedIn) return;
    if (showSpinner) setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/me/notifications", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load notifications.");
      }

      const payload = (await response.json()) as NotificationsPayload;
      const nextNotifications = payload.data ?? [];
      setNotifications(nextNotifications);
      setUnreadCount(
        typeof payload.meta?.unreadCount === "number"
          ? payload.meta.unreadCount
          : nextNotifications.filter((item) => !item.readAt).length,
      );
    } catch {
      setErrorMessage("알림을 불러오지 못했어요.");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;
    const timeoutId = window.setTimeout(() => {
      void loadNotifications(false);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadNotifications, signedIn]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [open]);

  async function markRead(ids: string[]) {
    if (!ids.length) return;

    await fetch("/api/me/notifications", {
      body: JSON.stringify({ ids }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) =>
        ids.includes(item.id) && !item.readAt ? { ...item, readAt: now } : item,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - ids.length));
  }

  async function markAllRead() {
    await fetch("/api/me/notifications", {
      body: JSON.stringify({ markAllRead: true }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }).catch(() => null);

    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.readAt ? item : { ...item, readAt: now })),
    );
    setUnreadCount(0);
  }

  function toggleOpen() {
    if (!signedIn) return;
    setOpen((value) => {
      const next = !value;
      if (next) void loadNotifications(true);
      return next;
    });
  }

  if (!signedIn) {
    return (
      <Link
        aria-label="알림"
        className="inline-flex size-[2.153vw] min-h-[26px] min-w-[26px] items-center justify-center transition-opacity hover:opacity-75"
        href="/login?next=/mypage"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="size-[1.389vw] min-h-[20px] min-w-[20px]"
          height={21}
          src={nuvioIcons.bell}
          width={20}
        />
      </Link>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
        className="relative inline-flex size-[2.153vw] min-h-[26px] min-w-[26px] items-center justify-center transition-opacity hover:opacity-75"
        onClick={toggleOpen}
        type="button"
      >
        <Image
          alt=""
          aria-hidden="true"
          className="size-[1.389vw] min-h-[20px] min-w-[20px]"
          height={21}
          src={nuvioIcons.bell}
          width={20}
        />
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-[0.208vw] top-[0.208vw] size-[0.486vw] min-h-[7px] min-w-[7px] rounded-full bg-[#FF6B1A]"
          />
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-[-2.222vw] top-[calc(100%+0.972vw)] z-[90] w-[22.222vw] min-w-[320px] overflow-hidden rounded-[0.694vw] border border-[#F1E0D3] bg-white shadow-[0_18px_48px_rgba(91,58,41,0.16)]">
          <div className="flex items-center justify-between border-b border-[#F1E7DF] px-[1.111vw] py-[0.903vw]">
            <div>
              <p className="text-[0.972vw] font-bold leading-none text-[#4B3328] max-[1100px]:text-sm">
                알림
              </p>
              <p className="mt-[0.347vw] text-[0.694vw] font-medium text-[#8B98A8] max-[1100px]:text-[10px]">
                {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "새 알림이 없어요"}
              </p>
            </div>
            {unreadCount > 0 ? (
              <button
                className="text-[0.694vw] font-semibold text-[#FF6B1A] transition-opacity hover:opacity-70 max-[1100px]:text-[10px]"
                onClick={markAllRead}
                type="button"
              >
                모두 읽음
              </button>
            ) : null}
          </div>

          <div className="max-h-[23.611vw] min-h-[12.5vw] overflow-y-auto py-[0.347vw]">
            {loading ? (
              <div className="flex h-[12.5vw] min-h-[180px] items-center justify-center text-[0.833vw] font-medium text-[#9BA8B7] max-[1100px]:text-xs">
                알림을 불러오는 중이에요.
              </div>
            ) : errorMessage ? (
              <div className="flex h-[12.5vw] min-h-[180px] items-center justify-center px-[1.111vw] text-center text-[0.833vw] font-medium text-[#9BA8B7] max-[1100px]:text-xs">
                {errorMessage}
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex h-[12.5vw] min-h-[180px] flex-col items-center justify-center gap-[0.625vw] text-center">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="size-[1.944vw] min-h-[28px] min-w-[28px] opacity-35"
                  height={28}
                  src={nuvioIcons.notificationDot}
                  width={28}
                />
                <p className="text-[0.833vw] font-medium text-[#C4CCD5] max-[1100px]:text-xs">
                  아직 알림이 없어요.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={markRead}
                />
              ))
            )}
          </div>

          <Link
            className="flex min-h-[2.778vw] items-center justify-center border-t border-[#F1E7DF] text-[0.764vw] font-semibold text-[#6D7A8A] transition-colors hover:bg-[#FFF7EF] hover:text-[#FF6B1A] max-[1100px]:text-[11px]"
            href="/mypage/messages"
            onClick={() => setOpen(false)}
          >
            메시지함에서 보기
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: UserNotification;
  onRead: (ids: string[]) => Promise<void>;
}) {
  const unread = !notification.readAt;
  const href = notification.href || "/mypage/messages";

  return (
    <Link
      className="grid grid-cols-[0.486vw_1fr] gap-[0.694vw] px-[1.111vw] py-[0.833vw] transition-colors hover:bg-[#FFF7EF]"
      href={href}
      onClick={() => {
        if (unread) void onRead([notification.id]);
      }}
    >
      <span
        aria-hidden="true"
        className={`mt-[0.278vw] size-[0.486vw] min-h-[7px] min-w-[7px] rounded-full ${
          unread ? "bg-[#FF6B1A]" : "bg-[#E6DED7]"
        }`}
      />
      <span className="min-w-0">
        <span className="block truncate text-[0.833vw] font-bold leading-[1.35] text-[#4B3328] max-[1100px]:text-xs">
          {notification.title}
        </span>
        <span className="mt-[0.278vw] line-clamp-2 block text-[0.694vw] font-medium leading-[1.55] text-[#6D7A8A] max-[1100px]:text-[10px]">
          {notification.body}
        </span>
        <span className="mt-[0.347vw] block text-[0.625vw] font-medium text-[#C4BDB6] max-[1100px]:text-[9px]">
          {formatRelativeTime(notification.createdAt)}
        </span>
      </span>
    </Link>
  );
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "방금 전";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < day * 7) return `${Math.floor(diffMs / day)}일 전`;

  return new Intl.DateTimeFormat("ko-KR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}
