"use client";

import Link from "next/link";
import { Check, ExternalLink, Loader2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  HostWorkspaceContent,
  HostWorkspaceLayout,
} from "@/components/host-workspace-ui";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

export function HostChannelSettings() {
  const [channel, setChannel] = useState<Village | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const publicHref = useMemo(
    () => (channel ? villagePath(channel.slug) : "/villages"),
    [channel],
  );

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

        setChannel(channels[0] ?? null);
        setError(channels.length === 0 ? "이 계정에 연결된 채널이 아직 없습니다." : "");
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
    if (!channel) return;
    setMessage("");
    setError("");
    setChannel({ ...channel, ...patch, updatedAt: new Date().toISOString() });
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
    if (!channel || isSaving) return;

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
      setMessage("채널 설정을 저장했습니다.");
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
    <HostWorkspaceLayout>
      <HostWorkspaceContent>
        <div className="w-[var(--host-1118)] max-w-full pt-[var(--host-24)] max-md:w-full max-md:pt-5">
          <div className="flex min-h-[var(--host-40)] items-center justify-between gap-[var(--host-16)]">
            <div>
              <p className="text-[var(--host-12)] font-medium leading-[1.253] text-[#8B7A6E]">
                Channel Manager
              </p>
              <h1 className="mt-[var(--host-6)] text-[var(--host-22)] font-semibold leading-[1.253] text-[#33241C]">
                채널 설정
              </h1>
            </div>
            <div className="flex items-center gap-[var(--host-8)]">
              {channel ? (
                <Link
                  className="inline-flex h-[var(--host-30)] items-center gap-[var(--host-6)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
                  href={publicHref}
                  target="_blank"
                >
                  공개 채널
                  <ExternalLink className="size-[var(--host-12)]" strokeWidth={1.8} />
                </Link>
              ) : null}
              <button
                className="inline-flex h-[var(--host-30)] items-center gap-[var(--host-6)] rounded-[4px] bg-[#FE701E] px-[var(--host-14)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] disabled:cursor-wait disabled:opacity-45"
                disabled={!channel || isSaving}
                onClick={saveChannel}
                type="button"
              >
                {isSaving ? (
                  <Loader2 className="size-[var(--host-12)] animate-spin" />
                ) : saved ? (
                  <Check className="size-[var(--host-12)]" />
                ) : (
                  <Save className="size-[var(--host-12)]" />
                )}
                저장
              </button>
            </div>
          </div>

          {isLoading ? (
            <section className="mt-[var(--host-24)] grid h-[var(--host-219)] place-items-center rounded-[8px] border border-[#D9D9D9] bg-white text-[var(--host-14)] font-medium text-[#6D7A8A]">
              <span className="inline-flex items-center gap-[var(--host-8)]">
                <Loader2 className="size-[var(--host-16)] animate-spin text-[#FE701E]" />
                채널 정보를 불러오는 중입니다.
              </span>
            </section>
          ) : channel ? (
            <div className="mt-[var(--host-24)] grid grid-cols-[minmax(0,1fr)_var(--host-354)] gap-[var(--host-24)] max-lg:grid-cols-1">
              <section className="rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--host-24)] py-[var(--host-24)]">
                <div className="grid gap-[var(--host-18)]">
                  <div className="grid grid-cols-2 gap-[var(--host-16)] max-md:grid-cols-1">
                    <ChannelTextField
                      label="채널 이름"
                      onChange={(value) => updateChannel({ name: value })}
                      value={channel.name}
                    />
                    <ChannelTextField
                      label="채널 주소"
                      onChange={updateSlug}
                      prefix="/"
                      value={channel.slug}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-[var(--host-16)] max-md:grid-cols-1">
                    <ChannelTextField
                      label="지역"
                      onChange={(value) => updateChannel({ region: value })}
                      value={channel.region}
                    />
                    <ChannelTextField
                      label="시군구"
                      onChange={(value) => updateChannel({ city: value })}
                      value={channel.city}
                    />
                  </div>
                  <ChannelTextField
                    label="한 줄 소개"
                    onChange={(value) => updateChannel({ tagline: value })}
                    value={channel.tagline}
                  />
                  <ChannelTextArea
                    label="채널 설명"
                    onChange={(value) => updateChannel({ summary: value })}
                    value={channel.summary}
                  />
                  <ChannelTextField
                    label="대표 이미지 URL"
                    onChange={(value) => updateChannel({ heroImage: value })}
                    value={channel.heroImage}
                  />
                  <ChannelTextField
                    label="연결 프로그램 ID/slug"
                    onChange={updateProgramIds}
                    placeholder="프로그램 id 또는 slug를 쉼표로 구분"
                    value={channel.programIds.join(", ")}
                  />
                  <div className="grid grid-cols-2 gap-[var(--host-16)] max-md:grid-cols-1">
                    <ChannelTextField
                      label="문의 전화"
                      onChange={(value) => updateChannel({ contactPhone: value || undefined })}
                      value={channel.contactPhone ?? ""}
                    />
                    <ChannelTextField
                      label="문의 이메일"
                      onChange={(value) => updateChannel({ contactEmail: value || undefined })}
                      value={channel.contactEmail ?? ""}
                    />
                  </div>
                  <ChannelTextField
                    label="카카오 채널 URL"
                    onChange={(value) => updateChannel({ kakaoUrl: value || undefined })}
                    value={channel.kakaoUrl ?? ""}
                  />
                </div>
              </section>

              <aside className="space-y-[var(--host-16)]">
                <article className="overflow-hidden rounded-[8px] border border-[#D9D9D9] bg-white">
                  <div
                    className="h-[var(--host-188)] bg-[#D9D9D9] bg-cover bg-center"
                    style={{ backgroundImage: `url(${channel.heroImage})` }}
                  />
                  <div className="px-[var(--host-16)] py-[var(--host-16)]">
                    <p className="w-fit rounded-[4px] bg-[#7A8B52] px-[var(--host-6)] py-[var(--host-3)] text-[var(--host-10)] font-medium leading-[1.253] text-white">
                      /{channel.slug}
                    </p>
                    <h2 className="mt-[var(--host-10)] text-[var(--host-16)] font-semibold leading-[1.253] text-[#33241C]">
                      {channel.name}
                    </h2>
                    <p className="mt-[var(--host-8)] text-[var(--host-12)] font-normal leading-[1.6] text-[#6D7A8A]">
                      {channel.summary}
                    </p>
                  </div>
                </article>
                <section className="rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--host-16)] py-[var(--host-16)]">
                  <h2 className="text-[var(--host-14)] font-semibold leading-[1.253] text-[#33241C]">
                    공개 상태
                  </h2>
                  <button
                    aria-pressed={channel.published}
                    className={`mt-[var(--host-12)] h-[var(--host-30)] rounded-[4px] px-[var(--host-12)] text-[var(--host-12)] font-medium leading-[1.253] ${
                      channel.published
                        ? "bg-[#7A8B52] text-white"
                        : "border border-[#D9D9D9] bg-white text-[#6D7A8A]"
                    }`}
                    onClick={() => updateChannel({ published: !channel.published })}
                    type="button"
                  >
                    {channel.published ? "게시 중" : "비공개"}
                  </button>
                </section>
              </aside>
            </div>
          ) : (
            <section className="mt-[var(--host-24)] rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--host-24)] py-[var(--host-24)]">
              <h2 className="text-[var(--host-18)] font-semibold leading-[1.253] text-[#33241C]">
                연결된 채널이 없습니다.
              </h2>
              <p className="mt-[var(--host-8)] text-[var(--host-14)] font-normal leading-[1.6] text-[#6D7A8A]">
                먼저 호스트센터에서 운영할 채널을 만든 뒤 설정을 이어갈 수 있습니다.
              </p>
              <Link
                className="mt-[var(--host-16)] inline-flex h-[var(--host-30)] items-center rounded-[4px] bg-[#FE701E] px-[var(--host-14)] text-[var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC]"
                href="/host"
              >
                호스트센터로 이동
              </Link>
            </section>
          )}

          {(message || error) && !isLoading ? (
            <p
              className={`mt-[var(--host-16)] text-[var(--host-12)] font-medium leading-[1.6] ${
                error ? "text-red-600" : "text-[#7A8B52]"
              }`}
            >
              {error || message}
            </p>
          ) : null}
        </div>
      </HostWorkspaceContent>
    </HostWorkspaceLayout>
  );
}

function ChannelTextField({
  label,
  onChange,
  placeholder,
  prefix,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  value: string;
}) {
  return (
    <label className="grid gap-[var(--host-8)]">
      <span className="text-[var(--host-12)] font-medium leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <span className="flex h-[var(--host-35)] items-center rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-10)] focus-within:border-[#FE701E]">
        {prefix ? (
          <span className="mr-[var(--host-4)] text-[var(--host-12)] font-medium text-[#CAC4BC]">
            {prefix}
          </span>
        ) : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-[var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none placeholder:text-[#CAC4BC]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </span>
    </label>
  );
}

function ChannelTextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-[var(--host-8)]">
      <span className="text-[var(--host-12)] font-medium leading-[1.253] text-[#5B3A29]">
        {label}
      </span>
      <textarea
        className="min-h-[var(--host-105)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-10)] py-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.6] text-[#0D0D0C] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
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
