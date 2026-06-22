"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { fallbackChannel } from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import type { Village, VillageLink } from "@/lib/village-types";

const defaultLink: VillageLink = {
  id: "main-link",
  label: "",
  type: "website",
  url: "",
};

export function HostChannelSettings() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  function updatePrimaryLink(patch: Partial<VillageLink>) {
    const primary = channel.links[0] ?? defaultLink;
    updateChannel({
      links: [{ ...primary, ...patch }, ...channel.links.slice(1)],
    });
  }

  function addEmptyLink() {
    updateChannel({
      links: [
        ...(channel.links.length > 0 ? channel.links : [defaultLink]),
        {
          id: `link-${Date.now().toString(36)}`,
          label: "",
          type: "website",
          url: "",
        },
      ],
    });
  }

  function removePrimaryLink() {
    updateChannel({ links: channel.links.slice(1) });
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
      setMessage("저장되었습니다");
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

  const primaryLink = channel.links[0] ?? defaultLink;

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1086)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="flex min-h-[var(--host-1086)] w-full max-w-[var(--host-1230)] flex-col max-md:max-w-full">
          <section className="flex-1 px-[var(--host-58)] pt-[var(--host-48)] max-md:px-5">
            <ChannelSettingBlock
              description="채널 헤더에 표시되는 대표 이미지예요"
              title="사진 설정"
            >
              <div className="flex items-center gap-[var(--host-14)]">
                <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
                  {channel.heroImage ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="(min-width: 1920px) 171px, 128px"
                      src={channel.heroImage}
                    />
                  ) : null}
                </div>
                <div className="grid gap-[var(--host-18)] text-[length:var(--host-14)] font-normal leading-[1.35] text-[#6D7A8A]">
                  <p>
                    98x98픽셀 이상
                    <br />
                    JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
                  </p>
                  <button
                    className="inline-flex h-[var(--host-40)] w-[clamp(113px,7.872vw,150.667px)] items-center justify-center gap-[var(--host-9)] rounded-[4px] bg-[#6D7A8A] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#F9F9F9] transition hover:bg-[#5d6876]"
                    type="button"
                  >
                    <Image
                      alt=""
                      height={21}
                      src={nuvioIcons.channelUpload}
                      width={21}
                    />
                    썸네일 추가
                  </button>
                </div>
              </div>
            </ChannelSettingBlock>

            <ChannelSettingBlock
              className="mt-[var(--host-28)]"
              description="게스트에게 보여지는 채널 이름이에요"
              title="채널명 설정"
            >
              <ChannelTextField
                disabled={isLoading}
                onChange={(value) => updateChannel({ name: value })}
                placeholder="채널명을 입력하세요"
                value={channel.name}
              />
            </ChannelSettingBlock>

            <ChannelSettingBlock
              className="mt-[var(--host-28)]"
              description="호스트가 활동하는 지역이에요"
              title="지역 설정"
            >
              <div className="flex w-[clamp(730px,50.694vw,973.333px)] max-w-full gap-[var(--host-12)] max-md:flex-col">
                <ChannelSelectField
                  disabled={isLoading}
                  onChange={(value) => updateChannel({ region: value })}
                  placeholder="지역 선택"
                  value={channel.region}
                />
                <ChannelSelectField
                  disabled={isLoading}
                  onChange={(value) => updateChannel({ city: value })}
                  placeholder="도시 선택"
                  value={channel.city}
                />
              </div>
            </ChannelSettingBlock>

            <ChannelSettingBlock
              className="mt-[var(--host-28)]"
              description="채널을 방문한 게스트에게 가장 먼저 보여지는 소개글이에요"
              title="채널 소개 설정"
            >
              <ChannelTextField
                disabled={isLoading}
                onChange={(value) =>
                  updateChannel({ summary: value, tagline: value || channel.tagline })
                }
                placeholder="채널 소개를 입력하세요"
                value={channel.summary}
              />
            </ChannelSettingBlock>

            <ChannelSettingBlock
              className="mt-[var(--host-28)]"
              description="채널 헤더에 표시되는 링크예요"
              title="외부 링크 설정"
            >
              <div className="flex w-full items-center gap-[var(--host-12)]">
                <ChannelTextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ label: value })}
                  placeholder="링크이름"
                  value={primaryLink.label}
                  widthClassName="w-[clamp(247px,17.153vw,329.333px)]"
                />
                <ChannelTextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ url: value })}
                  placeholder="링크 URL"
                  value={primaryLink.url}
                  widthClassName="min-w-0 flex-1"
                />
                <button
                  aria-label="링크 삭제"
                  className="grid h-[var(--host-34)] w-[var(--host-18)] shrink-0 place-items-center transition hover:opacity-70"
                  disabled={isLoading}
                  onClick={removePrimaryLink}
                  type="button"
                >
                  <Image alt="" height={18} src={nuvioIcons.formItemTrash} width={16} />
                </button>
              </div>
              <button
                className="mt-[var(--host-8)] inline-flex items-center gap-[var(--host-4)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
                onClick={addEmptyLink}
                type="button"
              >
                <Image alt="" height={12} src={nuvioIcons.quantityPlusDisabled} width={12} />
                링크 추가
              </button>
            </ChannelSettingBlock>

            <ChannelSettingBlock
              className="mt-[var(--host-28)]"
              description="비활성화 시 게스트에게 채널이 보이지 않아요"
              title="채널 활성화 설정"
            >
              <label className="inline-flex cursor-pointer items-center gap-[var(--host-6)]">
                <span className="text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FE701E]">
                  채널 활성
                </span>
                <button
                  aria-pressed={channel.published}
                  className="grid h-[var(--host-18)] w-[var(--host-23)] place-items-center"
                  disabled={isLoading}
                  onClick={() => updateChannel({ published: !channel.published })}
                  type="button"
                >
                  <Image
                    alt=""
                    height={20}
                    src={
                      channel.published
                        ? nuvioIcons.formRequiredToggleOn
                        : nuvioIcons.formRequiredToggleOff
                    }
                    width={23}
                  />
                </button>
              </label>
            </ChannelSettingBlock>

            {(message || error) ? (
              <p
                className={`mt-[var(--host-16)] text-[length:var(--host-12)] font-medium leading-[1.6] ${
                  error ? "text-[#FE701E]" : "text-[#7A8B52]"
                }`}
              >
                {error || message}
              </p>
            ) : null}
          </section>

          <footer className="flex h-[var(--host-69)] shrink-0 items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-18)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-wait disabled:opacity-45"
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

function ChannelSettingBlock({
  children,
  className = "",
  description,
  title,
}: {
  children: ReactNode;
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <section className={className}>
      <header className="h-[var(--host-81)]">
        <h1 className="pt-[var(--host-12)] text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A]">
          {title}
        </h1>
        <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-normal leading-[1.253] text-[#6D7A8A]">
          {description}
        </p>
      </header>
      {children}
    </section>
  );
}

function ChannelTextField({
  disabled,
  onChange,
  placeholder,
  value,
  widthClassName = "w-full",
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  widthClassName?: string;
}) {
  return (
    <input
      className={`h-[var(--host-34)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] text-[length:var(--host-14)] font-normal leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E] disabled:opacity-60 ${widthClassName}`}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function ChannelSelectField({
  disabled,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const commonOptions = ["전남", "서울", "부산", "강원", "보성군", "목포시", "강릉시"];
  const options = value && !commonOptions.includes(value)
    ? [value, ...commonOptions]
    : commonOptions;

  return (
    <label className="relative h-[var(--host-34)] w-[clamp(359px,24.931vw,478.667px)] max-w-full shrink-0">
      <select
        className="h-full w-full appearance-none rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] pr-[var(--host-38)] text-[length:var(--host-14)] font-normal leading-[1.253] text-[#6D7A8A] outline-none focus:border-[#FE701E] disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Image
        alt=""
        className="pointer-events-none absolute right-[var(--host-12)] top-1/2 -translate-y-1/2 opacity-45"
        height={8}
        src={nuvioIcons.formSelectDropdown}
        width={13}
      />
    </label>
  );
}
