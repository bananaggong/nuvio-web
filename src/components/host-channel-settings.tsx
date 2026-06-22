"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { fallbackChannel } from "@/components/host-channel-home";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

const colorSwatches = ["#FE701E", "#FF9A3D", "#5B3A29", "#6D7A8A", "#CAC4BC"];

export function HostChannelSettings() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const publicHref = useMemo(() => villagePath(channel.slug), [channel.slug]);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      try {
        const response = await fetch("/api/host/villages", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Village[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "연결된 채널을 불러오지 못했습니다.");
        }

        const channels = Array.isArray(payload.data) ? payload.data : [];
        if (!active) return;

        setChannel(channels[0] ?? fallbackChannel);
        setError(channels.length === 0 ? "연결된 채널이 없어 예시 정보로 표시 중입니다." : "");
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "연결된 채널을 불러오지 못했습니다.",
        );
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, []);

  function updateChannel(patch: Partial<Village>) {
    setMessage("");
    setError("");
    setSaved(false);
    setChannel((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateSlug(value: string) {
    updateChannel({ slug: createChannelSlug(value) });
  }

  function updateProgramIds(value: string) {
    updateChannel({
      programIds: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  async function saveChannel() {
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/host/villages", {
        body: JSON.stringify(channel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: Village;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "채널 설정을 저장하지 못했습니다.");
      }

      setChannel(payload.data);
      setSaved(true);
      setMessage("저장되었습니다.");
      window.setTimeout(() => setSaved(false), 1500);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "채널 설정을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1086)]">
      <section className="min-w-0 flex-1 overflow-x-hidden bg-white">
        <div className="w-full max-w-[var(--host-1230)]">
          <ChannelSettingsHeader channel={channel} publicHref={publicHref} />

          <section className="px-[var(--host-58)] pt-[var(--host-42)]">
            <h1 className="text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A]">
              채널 설정
            </h1>
            <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-normal leading-[1.6] text-[#6D7A8A]">
              채널 정보와 공개 페이지에 표시되는 기본 정보를 관리해요
            </p>

            {isLoading ? (
              <div className="mt-[var(--host-30)] flex h-[var(--host-82)] items-center gap-[var(--host-10)] border-y border-[#D9D9D9] text-[length:var(--host-14)] font-medium text-[#6D7A8A]">
                <Loader2 className="size-[var(--host-16)] animate-spin text-[#FE701E]" />
                채널 정보를 불러오는 중입니다.
              </div>
            ) : (
              <div className="mt-[var(--host-24)]">
                <SettingsGroup title="대표 정보">
                  <ChannelInlineField
                    helper="채널 홈과 검색 결과에 표시되는 이름이에요"
                    label="채널 이름"
                    onChange={(value) => updateChannel({ name: value })}
                    value={channel.name}
                  />
                  <ChannelInlineField
                    helper="공개 채널 주소에 쓰이는 값이에요"
                    label="URL 슬러그"
                    onChange={updateSlug}
                    prefix="/"
                    value={channel.slug}
                  />
                  <div className="grid grid-cols-2 gap-[var(--host-20)] max-md:grid-cols-1">
                    <ChannelInlineField
                      helper="광역 지역명"
                      label="지역명"
                      onChange={(value) => updateChannel({ region: value })}
                      value={channel.region}
                    />
                    <ChannelInlineField
                      helper="시군구명"
                      label="시군구"
                      onChange={(value) => updateChannel({ city: value })}
                      value={channel.city}
                    />
                  </div>
                </SettingsGroup>

                <SettingsGroup title="채널 소개">
                  <ChannelInlineField
                    helper="프로필 상단에 짧게 노출되는 문구예요"
                    label="한 줄 소개"
                    onChange={(value) => updateChannel({ tagline: value })}
                    value={channel.tagline}
                  />
                  <ChannelInlineArea
                    helper="채널 소개 영역과 미리보기 카드에 사용하는 문장입니다"
                    label="소개 내용"
                    onChange={(value) => updateChannel({ summary: value })}
                    value={channel.summary}
                  />
                </SettingsGroup>

                <SettingsGroup title="이미지와 색상">
                  <ChannelInlineField
                    helper="대표 원형 프로필과 공개 채널 카드에 표시돼요"
                    label="대표 이미지 URL"
                    onChange={(value) => updateChannel({ heroImage: value })}
                    value={channel.heroImage}
                  />
                  <div className="grid grid-cols-2 gap-[var(--host-20)] max-md:grid-cols-1">
                    <ChannelColorField
                      label="브랜드 색상"
                      onChange={(value) => updateChannel({ brandColor: value })}
                      value={channel.brandColor}
                    />
                    <ChannelColorField
                      label="강조 색상"
                      onChange={(value) => updateChannel({ accentColor: value })}
                      value={channel.accentColor}
                    />
                  </div>
                </SettingsGroup>

                <SettingsGroup title="연결 정보">
                  <ChannelInlineField
                    helper="프로그램 id 또는 slug를 쉼표로 구분해 입력해요"
                    label="연결 프로그램"
                    onChange={updateProgramIds}
                    value={channel.programIds.join(", ")}
                  />
                  <div className="grid grid-cols-2 gap-[var(--host-20)] max-md:grid-cols-1">
                    <ChannelInlineField
                      helper="게스트 문의에 사용할 전화번호"
                      label="문의 전화"
                      onChange={(value) => updateChannel({ contactPhone: value || undefined })}
                      value={channel.contactPhone ?? ""}
                    />
                    <ChannelInlineField
                      helper="게스트 문의에 사용할 이메일"
                      label="문의 이메일"
                      onChange={(value) => updateChannel({ contactEmail: value || undefined })}
                      value={channel.contactEmail ?? ""}
                    />
                  </div>
                  <ChannelInlineField
                    helper="카카오 채널 또는 외부 문의 링크"
                    label="연결 링크"
                    onChange={(value) => updateChannel({ kakaoUrl: value || undefined })}
                    value={channel.kakaoUrl ?? ""}
                  />
                </SettingsGroup>

                {(message || error) ? (
                  <p
                    className={`mt-[var(--host-16)] text-[length:var(--host-12)] font-medium leading-[1.6] ${
                      error ? "text-[#FE701E]" : "text-[#7A8B52]"
                    }`}
                  >
                    {error || message}
                  </p>
                ) : null}
              </div>
            )}
          </section>

          <footer className="mt-[var(--host-36)] flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-18)]">
            <button
              className="inline-flex h-[var(--host-29)] min-w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-14)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-wait disabled:opacity-45"
              disabled={isLoading || isSaving}
              onClick={saveChannel}
              type="button"
            >
              {isSaving ? "저장 중" : saved ? "완료" : "저장"}
            </button>
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function ChannelSettingsHeader({
  channel,
  publicHref,
}: {
  channel: Village;
  publicHref: string;
}) {
  return (
    <section className="relative h-[var(--host-216)] border-b border-[#6D7A8A] bg-white">
      <div className="flex items-start gap-[var(--host-42)] px-[var(--host-58)] pt-[var(--host-28)]">
        <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
          {channel.heroImage ? (
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="(min-width: 1920px) 170px, 128px"
              src={channel.heroImage}
            />
          ) : null}
        </div>

        <div className="min-w-0 pt-[var(--host-7)]">
          <div className="flex flex-wrap items-end gap-[var(--host-10)]">
            <h2 className="text-[length:var(--host-24)] font-medium leading-[1.253] text-[#0D0D0C]">
              {channel.name}
            </h2>
            <span className="pb-[var(--host-2)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              {channel.region}
            </span>
          </div>
          <p className="mt-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
            {channel.tagline || channel.summary}
          </p>
          <a
            className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
            href={publicHref}
            target="_blank"
          >
            <span className="text-[#FE701E]">ↄ</span>
            이름&nbsp;&nbsp; 연결링크
          </a>
          <button
            className="mt-[var(--host-18)] inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#6D7A8A] px-[var(--host-18)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC]"
            type="button"
          >
            이미지 변경
          </button>
        </div>
      </div>
    </section>
  );
}

function SettingsGroup({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-[#D9D9D9] py-[var(--host-24)] first:border-t-0 first:pt-0">
      <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
        {title}
      </h2>
      <div className="mt-[var(--host-18)] grid gap-[var(--host-22)]">{children}</div>
    </section>
  );
}

function ChannelInlineField({
  helper,
  label,
  onChange,
  prefix,
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  prefix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-[var(--host-7)]">
      <span className="text-[length:var(--host-14)] font-medium leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <span className="flex h-[var(--host-34)] items-center rounded-[4px] border border-[#AEB8C2] bg-white px-[var(--host-14)] focus-within:border-[#FE701E]">
        {prefix ? (
          <span className="mr-[var(--host-4)] text-[length:var(--host-14)] font-medium text-[#CAC4BC]">
            {prefix}
          </span>
        ) : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC]"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </span>
      <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#CAC4BC]">
        {helper}
      </span>
    </label>
  );
}

function ChannelInlineArea({
  helper,
  label,
  onChange,
  value,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-[var(--host-7)]">
      <span className="text-[length:var(--host-14)] font-medium leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <textarea
        className="min-h-[var(--host-82)] rounded-[4px] border border-[#AEB8C2] bg-white px-[var(--host-14)] py-[var(--host-10)] text-[length:var(--host-14)] font-medium leading-[1.6] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
      <span className="text-[length:var(--host-12)] font-normal leading-[1.253] text-[#CAC4BC]">
        {helper}
      </span>
    </label>
  );
}

function ChannelColorField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="grid gap-[var(--host-7)]">
      <span className="text-[length:var(--host-14)] font-medium leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <div className="flex h-[var(--host-34)] items-center gap-[var(--host-8)] rounded-[4px] border border-[#AEB8C2] bg-white px-[var(--host-10)]">
        {colorSwatches.map((color) => (
          <button
            aria-label={`${label} ${color}`}
            aria-pressed={value.toLowerCase() === color.toLowerCase()}
            className="size-[var(--host-20)] rounded-full border"
            key={color}
            onClick={() => onChange(color)}
            style={{
              backgroundColor: color,
              borderColor: value.toLowerCase() === color.toLowerCase() ? "#0D0D0C" : "#D9D9D9",
            }}
            type="button"
          />
        ))}
        <input
          className="ml-[var(--host-8)] min-w-0 flex-1 bg-transparent text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </div>
    </div>
  );
}

function createChannelSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return slug || `channel-${Date.now().toString(36)}`;
}
