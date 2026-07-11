"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { px } from "@/components/channel-guest-shared";
import {
  channelGuestHref,
  channelHomeLabel,
  getChannelMenuDisplayLabel,
  getVisibleChannelMenuItems,
  type ChannelMenuKind,
} from "@/lib/channel-menu";
import type { Village } from "@/lib/village-types";

type ChannelGuestProfileHeaderProps = {
  activeTab?: "home" | ChannelMenuKind;
  homeHref: string;
  village: Village;
  wide?: boolean;
};

const compactProfileStyle = {
  maxWidth: `calc(100% - ${px(336)})`,
  width: px(1104),
};

const wideProfileStyle = {
  maxWidth: `calc(100% - ${px(298)})`,
  width: px(1142),
};

export function ChannelGuestProfileHeader({
  activeTab = "home",
  homeHref,
  village,
  wide = false,
}: ChannelGuestProfileHeaderProps) {
  const menuItems = getVisibleChannelMenuItems(village);
  const tabsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const centerActiveTab = () => {
      const tabs = tabsRef.current;
      if (!tabs || !window.matchMedia("(max-width: 1100px)").matches) return;

      const active = tabs.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;

      tabs.scrollTo({
        behavior: "auto",
        left: active.offsetLeft - (tabs.clientWidth - active.clientWidth) / 2,
      });
    };
    const frame = window.requestAnimationFrame(centerActiveTab);
    window.addEventListener("resize", centerActiveTab);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", centerActiveTab);
    };
  }, [activeTab]);

  return (
    <section
      className="channel-guest-profile mx-auto flex items-end border-b border-[#6D7A8A]"
      style={{
        ...(wide ? wideProfileStyle : compactProfileStyle),
        gap: px(39),
        minHeight: px(185.658),
        padding: `${px(22)} ${px(58)} 0`,
      }}
    >
      <div
        className="channel-guest-profile-avatar relative shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]"
        style={{
          height: px(128),
          marginBottom: px(22),
          width: px(128),
        }}
      >
        {village.profileImage ? (
          <Image
            alt={`${village.name} profile`}
            className="object-cover"
            fill
            sizes="(max-width: 1100px) 80px, 170px"
            src={village.profileImage}
          />
        ) : (
          <span
            className="flex h-full w-full items-center justify-center font-semibold leading-none text-[#6D7A8A]"
            style={{ fontSize: px(24) }}
          >
            {(village.name || village.logoText || "N").slice(0, 1)}
          </span>
        )}
      </div>

      <div className="channel-guest-profile-body flex min-w-0 flex-col" style={{ gap: px(4) }}>
        <div className="channel-guest-profile-details flex min-w-0 flex-col" style={{ gap: px(4) }}>
          <div className="channel-guest-profile-title flex min-w-0 items-end" style={{ gap: px(8) }}>
            <h1 className="min-w-0 text-[length:var(--channel-font-24)] font-medium leading-[1.253] text-[#0D0D0C]">
              {village.name}
            </h1>
            <span
              className="shrink-0 text-[length:var(--channel-font-14)] font-medium leading-[1.253] text-[#6D7A8A]"
              style={{ paddingBottom: px(2) }}
            >
              {village.city || village.region}
            </span>
          </div>
          <p className="channel-guest-profile-summary max-w-[60ch] truncate text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {village.tagline || village.summary}
          </p>
          <div className="channel-guest-profile-meta flex min-w-0 items-center" style={{ gap: px(8) }}>
            <Image
              alt=""
              height={12}
              src={nuvioIcons.channelLink}
              style={{ height: px(12), width: px(12) }}
              width={12}
            />
            <span className="text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
              {village.region}
            </span>
            <span className="channel-guest-profile-slug min-w-0 truncate text-[length:var(--channel-font-16)] font-medium leading-[1.253] text-[#6D7A8A]">
              {village.slug}
            </span>
          </div>
          <div
            className="channel-guest-profile-actions flex items-center"
            style={{ gap: px(8), marginTop: px(4), paddingLeft: px(2) }}
          >
            <Image
              alt="알림"
              height={20}
              src={nuvioIcons.bell}
              style={{ height: px(20), width: px(19) }}
              width={19}
            />
            <Image
              alt="메시지"
              height={18}
              src={nuvioIcons.message}
              style={{ height: px(18), width: px(18) }}
              width={18}
            />
          </div>
        </div>

        <nav
          aria-label="채널 메뉴"
          className="channel-guest-tabs flex items-end"
          ref={tabsRef}
          style={{ gap: px(40), paddingTop: px(14) }}
        >
          <ChannelGuestTab
            active={activeTab === "home"}
            href={homeHref}
            label={channelHomeLabel}
          />
          {menuItems.map((item) => (
            <ChannelGuestTab
              active={activeTab === item.kind}
              href={channelGuestHref(item.kind, village)}
              key={item.id}
              label={getChannelMenuDisplayLabel(item)}
            />
          ))}
        </nav>
      </div>
    </section>
  );
}

function ChannelGuestTab({
  active = false,
  href,
  label,
}: {
  active?: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`channel-guest-tab flex shrink-0 items-center justify-center whitespace-nowrap text-[length:var(--channel-font-16)] font-semibold leading-[1.253] text-[#5B3A29] ${
        active ? "border-b-2 border-[#FF9A3D]" : ""
      }`}
      href={href}
      style={{
        height: px(36),
        paddingBottom: px(8),
        paddingTop: active ? px(5) : px(8),
      }}
    >
      {label}
    </Link>
  );
}
