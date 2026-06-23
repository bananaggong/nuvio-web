"use client";

import Image from "next/image";
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

const regionOptions = ["전남", "서울", "부산", "강원", "제주"];
const cityOptions = ["보성군", "목포시", "강릉시", "제주시", "부산 중구"];

export function HostChannelSettings() {
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      try {
        const response = await fetch("/api/host/villages", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Village[];
        };
        const channels = Array.isArray(payload.data) ? payload.data : [];

        if (active) setChannel(channels[0] ?? fallbackChannel);
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

    try {
      const response = await fetch("/api/host/villages", {
        body: JSON.stringify(channel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: Village;
      };

      if (response.ok && payload.data) setChannel(payload.data);
    } finally {
      setIsSaving(false);
    }
  }

  const primaryLink = channel.links[0] ?? defaultLink;

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1076)]">
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="flex min-h-[var(--host-1076)] w-full max-w-[var(--host-1230)] flex-col">
          <div className="h-[var(--host-1007)] shrink-0">
            <section className="relative h-[var(--host-257)]">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-[var(--host-48)]"
                description="채널 헤더에 표시되는 대표 이미지예요"
                title="사진 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-129)] flex h-[var(--host-128)] items-start">
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
                <div className="ml-[var(--host-14)] mt-[var(--host-17)] w-[var(--host-352)]">
                  <p className="text-[length:var(--host-14)] font-medium leading-[1.286] text-[#6D7A8A]">
                    <span className="block">98x98픽셀 이상</span>
                    <span className="block whitespace-nowrap">
                      JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
                    </span>
                  </p>
                  <button
                    className="mt-[var(--host-18)] inline-flex h-[var(--host-40)] w-[var(--host-113)] items-center justify-center gap-[var(--host-9)] rounded-[4px] bg-[#6D7A8A] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#F9F9F9] transition hover:bg-[#5F6B79]"
                    type="button"
                  >
                    <Image alt="" height={21} src={nuvioIcons.channelUpload} width={21} />
                    썸네일 추가
                  </button>
                </div>
              </div>
            </section>

            <SettingRow
              description="게스트에게 보여지는 채널 이름이에요"
              title="채널명 설정"
            >
              <TextField
                disabled={isLoading}
                onChange={(value) => updateChannel({ name: value })}
                placeholder="채널명을 입력하세요"
                value={channel.name}
              />
            </SettingRow>

            <SettingRow
              description="호스트가 활동하는 지역이에요"
              title="지역 설정"
            >
              <div className="flex w-[var(--host-730)] gap-[var(--host-12)]">
                <SelectField
                  disabled={isLoading}
                  onChange={(value) => updateChannel({ region: value })}
                  options={regionOptions}
                  placeholder="지역 선택"
                  value={channel.region}
                />
                <SelectField
                  disabled={isLoading}
                  onChange={(value) => updateChannel({ city: value })}
                  options={cityOptions}
                  placeholder="도시 선택"
                  value={channel.city}
                />
              </div>
            </SettingRow>

            <SettingRow
              description="채널을 방문한 게스트에게 가장 먼저 보여지는 소개글이에요"
              title="채널 소개 설정"
            >
              <TextField
                disabled={isLoading}
                onChange={(value) =>
                  updateChannel({ summary: value, tagline: value || channel.tagline })
                }
                placeholder="채널 소개를 입력하세요"
                value={channel.summary}
              />
            </SettingRow>

            <section className="relative mt-[var(--host-28)] h-[var(--host-138)]">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-0"
                description="채널 헤더에 표시되는 링크예요"
                title="외부 링크 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-85)] flex h-[var(--host-34)] w-[var(--host-1114)] items-center gap-[var(--host-12)]">
                <TextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ label: value })}
                  placeholder="링크이름"
                  value={primaryLink.label}
                  widthClassName="w-[var(--host-247)]"
                />
                <TextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ url: value })}
                  placeholder="링크 URL"
                  value={primaryLink.url}
                  widthClassName="w-[var(--host-827)]"
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
                className="absolute left-[var(--host-58)] top-[var(--host-123)] inline-flex h-[var(--host-15)] items-center gap-[var(--host-4)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
                onClick={addEmptyLink}
                type="button"
              >
                <Image alt="" height={12} src={nuvioIcons.quantityPlus} width={12} />
                링크 추가
              </button>
            </section>

            <section className="relative mt-[var(--host-28)] h-[var(--host-99)]">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-0"
                description="비활성화 시 게스트에게 채널이 보이지 않아요"
                title="채널 활성화 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-81)] flex h-[var(--host-18)] items-center gap-[var(--host-6)]">
                <span className="text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FE701E]">
                  채널 활성
                </span>
                <button
                  aria-label="채널 활성 전환"
                  aria-pressed={channel.published}
                  className="grid h-[var(--host-18)] w-[var(--host-23)] place-items-center"
                  disabled={isLoading}
                  onClick={() => updateChannel({ published: !channel.published })}
                  type="button"
                >
                  <Image
                    alt=""
                    height={12}
                    src={
                      channel.published
                        ? nuvioIcons.formRequiredToggleOn
                        : nuvioIcons.formRequiredToggleOff
                    }
                    width={23}
                  />
                </button>
              </div>
            </section>
          </div>

          <footer className="flex h-[var(--host-69)] shrink-0 items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-20)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-wait disabled:opacity-50"
              disabled={isLoading || isSaving}
              onClick={saveChannel}
              type="button"
            >
              저장
            </button>
          </footer>
        </div>
      </section>
    </HostWorkspaceLayout>
  );
}

function SettingHeading({
  className = "",
  description,
  title,
}: {
  className?: string;
  description: string;
  title: string;
}) {
  return (
    <header className={`h-[var(--host-81)] ${className}`}>
      <h1 className="pt-[var(--host-12)] text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A]">
        {title}
      </h1>
      <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
        {description}
      </p>
    </header>
  );
}

function SettingRow({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description: string;
  title: string;
}) {
  return (
    <section className="relative mt-[var(--host-28)] h-[var(--host-115)]">
      <SettingHeading
        className="absolute left-[var(--host-58)] top-0"
        description={description}
        title={title}
      />
      <div className="absolute left-[var(--host-58)] top-[var(--host-81)]">{children}</div>
    </section>
  );
}

function TextField({
  disabled,
  onChange,
  placeholder,
  value,
  widthClassName = "w-[var(--host-1114)]",
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
  widthClassName?: string;
}) {
  return (
    <input
      className={`h-[var(--host-34)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E] disabled:opacity-60 ${widthClassName}`}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function SelectField({
  disabled,
  onChange,
  options,
  placeholder,
  value,
}: {
  disabled?: boolean;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
}) {
  const normalizedOptions = value && !options.includes(value) ? [value, ...options] : options;

  return (
    <label className="relative h-[var(--host-34)] w-[var(--host-359)] shrink-0">
      <select
        className="h-full w-full appearance-none rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] pr-[var(--host-38)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none focus:border-[#FE701E] disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{placeholder}</option>
        {normalizedOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Image
        alt=""
        className="pointer-events-none absolute right-[var(--host-14)] top-1/2 -translate-y-1/2 opacity-45"
        height={8}
        src={nuvioIcons.formSelectDropdown}
        width={13}
      />
    </label>
  );
}
