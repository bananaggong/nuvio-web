"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { fallbackChannel } from "@/components/host-channel-home";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { selectHostChannel } from "@/lib/host-channel-selection";
import {
  getKoreanLocalOptions,
  koreanRegionOptions,
  normalizeKoreanLocation,
} from "@/lib/korean-local-governments";
import type { Village, VillageLink } from "@/lib/village-types";

const defaultLink: VillageLink = {
  id: "main-link",
  label: "",
  type: "website",
  url: "",
};

const maxProfileUploadBytes = 5 * 1024 * 1024;

type AssetUploadPayload = {
  data?: {
    url?: string;
  };
  error?: string;
};

type SaveChannelPayload = {
  data?: Village;
  error?: string;
};

function createChannelSettingsSignature(channel: Village) {
  return JSON.stringify({
    city: channel.city,
    links: channel.links,
    name: channel.name,
    profileImage: channel.profileImage,
    published: channel.published,
    region: channel.region,
    summary: channel.summary,
    tagline: channel.tagline,
  });
}

export function HostChannelSettings() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village>(fallbackChannel);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const profileInputRef = useRef<HTMLInputElement>(null);
  const currentChannelSignature = useMemo(
    () => createChannelSettingsSignature(channel),
    [channel],
  );
  const [savedChannelSignature, setSavedChannelSignature] = useState(
    currentChannelSignature,
  );
  const hasUnsavedChannelChanges =
    !isLoading &&
    !isSaving &&
    !isUploadingProfile &&
    currentChannelSignature !== savedChannelSignature;

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      try {
        const response = await fetch("/api/host/channels", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Village[];
        };
        const channels = Array.isArray(payload.data) ? payload.data : [];

        if (active) {
          const selectedChannel =
            selectHostChannel(channels, requestedChannelSlug) ?? fallbackChannel;
          const normalizedLocation = normalizeKoreanLocation(
            selectedChannel.region,
            selectedChannel.city,
          );
          const normalizedChannel = { ...selectedChannel, ...normalizedLocation };
          setChannel(normalizedChannel);
          setSavedChannelSignature(createChannelSettingsSignature(normalizedChannel));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  function updateChannel(patch: Partial<Village>) {
    setChannel((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateRegion(region: string) {
    const nextCities = getKoreanLocalOptions(region);
    updateChannel({
      city: nextCities.includes(channel.city) ? channel.city : "",
      region,
    });
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

  async function handleProfileFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || isUploadingProfile) return;

    if (!channel.slug) {
      setProfileMessage("먼저 채널을 선택해 주세요.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setProfileMessage("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    if (file.size > maxProfileUploadBytes) {
      setProfileMessage("5MB 이하 이미지만 업로드할 수 있어요.");
      return;
    }

    setIsUploadingProfile(true);
    setProfileMessage("프로필 이미지를 업로드 중입니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("villageSlug", channel.slug);
      formData.append("usage", "channel-profile");
      formData.append("altText", `${channel.name || "채널"} 프로필 이미지`);

      const uploadResponse = await fetch("/api/host/village-pages/assets", {
        body: formData,
        method: "POST",
      });
      const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as AssetUploadPayload;
      const uploadedUrl = uploadPayload.data?.url;

      if (!uploadResponse.ok || !uploadedUrl) {
        throw new Error(uploadPayload.error || "프로필 이미지를 업로드하지 못했습니다.");
      }

      const nextChannel: Village = {
        ...channel,
        profileImage: uploadedUrl,
        updatedAt: new Date().toISOString(),
      };
      const saveResponse = await fetch("/api/host/channels", {
        body: JSON.stringify(nextChannel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const savePayload = (await saveResponse.json().catch(() => ({}))) as SaveChannelPayload;

      if (!saveResponse.ok || !savePayload.data) {
        throw new Error(savePayload.error || "업로드한 프로필 이미지를 저장하지 못했습니다.");
      }

      setChannel(savePayload.data);
      setSavedChannelSignature(createChannelSettingsSignature(savePayload.data));
      setProfileMessage("프로필 이미지가 저장되었습니다.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "프로필 이미지를 업로드하지 못했습니다.",
      );
    } finally {
      setIsUploadingProfile(false);
    }
  }

  async function saveChannel() {
    if (isSaving) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/host/channels", {
        body: JSON.stringify(channel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: Village;
      };

      if (response.ok && payload.data) {
        setChannel(payload.data);
        setSavedChannelSignature(createChannelSettingsSignature(payload.data));
      }
    } finally {
      setIsSaving(false);
    }
  }

  const primaryLink = channel.links[0] ?? defaultLink;
  const cityOptions = getKoreanLocalOptions(channel.region);

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1076)]">
      <UnsavedChangesGuard when={hasUnsavedChannelChanges} />
      <section className="min-w-0 flex-1 overflow-x-clip bg-white">
        <div className="flex min-h-[var(--host-1076)] w-full max-w-[var(--host-1230)] flex-col max-[1439px]:max-w-none">
          <div className="h-[var(--host-1007)] shrink-0 max-[1439px]:h-auto max-[1439px]:shrink">
            <section className="relative h-[var(--host-257)] max-[1439px]:h-auto max-[1439px]:px-[var(--host-58)] max-[1439px]:pb-[var(--host-28)] max-[1439px]:pt-[var(--host-48)] max-lg:px-5 max-lg:pb-8 max-lg:pt-6">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-[var(--host-48)] max-[1439px]:static"
                description="채널 헤더에 표시되는 대표 이미지예요"
                title="사진 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-129)] flex h-[var(--host-128)] items-start max-[1439px]:static max-[1439px]:mt-6 max-[1439px]:h-auto max-sm:flex-col max-sm:gap-4">
                <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9] max-lg:size-24">
                  {channel.profileImage ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="(min-width: 1920px) 171px, 128px"
                      src={channel.profileImage}
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[length:var(--host-24)] font-semibold leading-[1] text-[#6D7A8A]">
                      {(channel.name || channel.logoText || "N").slice(0, 1)}
                    </span>
                  )}
                </div>
                <div className="ml-[var(--host-14)] mt-[var(--host-17)] w-[var(--host-352)] max-lg:min-w-0 max-lg:flex-1 max-lg:w-auto max-sm:ml-0 max-sm:mt-0">
                  <input
                    accept="image/gif,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={handleProfileFileChange}
                    ref={profileInputRef}
                    type="file"
                  />
                  <p className="text-[length:var(--host-14)] font-medium leading-[1.286] text-[#6D7A8A] max-lg:text-base">
                    <span className="block">98x98픽셀 이상</span>
                    <span className="block whitespace-nowrap max-lg:whitespace-normal">
                      JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
                    </span>
                  </p>
                  <button
                    className="mt-[var(--host-18)] inline-flex h-[var(--host-40)] w-[var(--host-113)] items-center justify-center gap-[var(--host-9)] rounded-[4px] bg-[#6D7A8A] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#F9F9F9] transition hover:bg-[#5F6B79] max-lg:min-h-11 max-lg:w-auto max-lg:px-4 max-lg:text-sm"
                    disabled={isLoading || isUploadingProfile}
                    onClick={() => profileInputRef.current?.click()}
                    type="button"
                  >
                    <Image alt="" height={21} src={nuvioIcons.channelUpload} width={21} />
                    {isUploadingProfile ? "업로드 중" : "프로필 추가"}
                  </button>
                  {profileMessage ? (
                    <p className="mt-[var(--host-8)] break-words text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] max-lg:text-sm">
                      {profileMessage}
                    </p>
                  ) : null}
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
              <div className="flex w-[var(--host-730)] gap-[var(--host-12)] max-[1439px]:w-full max-sm:flex-col">
                <SelectField
                  disabled={isLoading}
                  onChange={updateRegion}
                  options={koreanRegionOptions}
                  placeholder="지역 선택"
                  value={channel.region}
                />
                <SelectField
                  disabled={isLoading || !channel.region}
                  onChange={(value) => updateChannel({ city: value })}
                  options={cityOptions}
                  placeholder="로컬 선택"
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

            <section className="relative mt-[var(--host-28)] h-[var(--host-138)] max-[1439px]:h-auto max-[1439px]:px-[var(--host-58)] max-[1439px]:pb-[var(--host-28)] max-lg:mt-0 max-lg:px-5 max-lg:pb-8">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-0 max-[1439px]:static"
                description="채널 헤더에 표시되는 링크예요"
                title="외부 링크 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-85)] flex h-[var(--host-34)] w-[var(--host-1114)] items-center gap-[var(--host-12)] max-[1439px]:static max-[1439px]:mt-4 max-[1439px]:grid max-[1439px]:h-auto max-[1439px]:w-full max-[1439px]:grid-cols-[minmax(160px,0.3fr)_minmax(0,1fr)_44px] max-lg:grid-cols-1 max-lg:gap-3">
                <TextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ label: value })}
                  placeholder="링크이름"
                  value={primaryLink.label}
                  widthClassName="w-[var(--host-247)] max-[1439px]:w-full"
                />
                <TextField
                  disabled={isLoading}
                  onChange={(value) => updatePrimaryLink({ url: value })}
                  placeholder="링크 URL"
                  value={primaryLink.url}
                  widthClassName="w-[var(--host-827)] max-[1439px]:w-full"
                />
                <button
                  aria-label="링크 삭제"
                  className="grid h-[var(--host-34)] w-[var(--host-18)] shrink-0 place-items-center transition hover:opacity-70 max-[1439px]:size-11 max-lg:justify-self-end"
                  disabled={isLoading}
                  onClick={removePrimaryLink}
                  type="button"
                >
                  <Image
                    alt=""
                    height={18}
                    src={nuvioIcons.formItemTrash}
                    width={16}
                  />
                </button>
              </div>
              <button
                className="absolute left-[var(--host-58)] top-[var(--host-123)] inline-flex h-[var(--host-15)] items-center gap-[var(--host-4)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E] max-[1439px]:static max-[1439px]:mt-3 max-lg:min-h-11 max-lg:text-sm"
                onClick={addEmptyLink}
                type="button"
              >
                <Image alt="" height={12} src={nuvioIcons.quantityPlus} width={12} />
                링크 추가
              </button>
            </section>

            <section className="relative mt-[var(--host-28)] h-[var(--host-99)] max-[1439px]:h-auto max-[1439px]:px-[var(--host-58)] max-[1439px]:pb-[var(--host-28)] max-lg:mt-0 max-lg:px-5 max-lg:pb-8">
              <SettingHeading
                className="absolute left-[var(--host-58)] top-0 max-[1439px]:static"
                description="비활성화 시 게스트에게 채널이 보이지 않아요"
                title="채널 활성화 설정"
              />
              <div className="absolute left-[var(--host-58)] top-[var(--host-81)] flex h-[var(--host-18)] items-center gap-[var(--host-6)] max-[1439px]:static max-[1439px]:mt-4 max-lg:min-h-11">
                <span className="text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FE701E]">
                  채널 활성
                </span>
                <button
                  aria-label="채널 활성 전환"
                  aria-pressed={channel.published}
                  className="grid h-[var(--host-18)] w-[var(--host-23)] place-items-center max-lg:size-11"
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
              </div>
            </section>
          </div>

          <footer className="flex h-[var(--host-69)] shrink-0 items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-20)] max-lg:h-auto max-lg:px-5 max-lg:py-4">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50 max-lg:min-h-11 max-lg:w-full max-lg:text-sm"
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
    <header className={`h-[var(--host-81)] max-[1439px]:h-auto ${className}`}>
      <h1 className="pt-[var(--host-12)] text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A] max-[1439px]:pt-0">
        {title}
      </h1>
      <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-medium leading-[1.45] text-[#6D7A8A] max-lg:text-base">
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
    <section className="relative mt-[var(--host-28)] h-[var(--host-115)] max-[1439px]:h-auto max-[1439px]:px-[var(--host-58)] max-[1439px]:pb-[var(--host-28)] max-lg:mt-0 max-lg:px-5 max-lg:pb-8">
      <SettingHeading
        className="absolute left-[var(--host-58)] top-0 max-[1439px]:static"
        description={description}
        title={title}
      />
      <div className="absolute left-[var(--host-58)] top-[var(--host-81)] max-[1439px]:static max-[1439px]:mt-4">{children}</div>
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
      className={`h-[var(--host-34)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none placeholder:text-[#CAC4BC] focus:border-[#FE701E] disabled:opacity-60 max-lg:h-11 max-lg:text-base ${widthClassName}`}
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
    <label className="relative h-[var(--host-34)] w-[var(--host-359)] shrink-0 max-[1439px]:min-w-0 max-[1439px]:flex-1 max-lg:h-11 max-sm:w-full max-sm:flex-none">
      <select
        className="h-full w-full appearance-none rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-12)] pr-[var(--host-38)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none focus:border-[#FE701E] disabled:opacity-60 max-lg:text-base"
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
        className="pointer-events-none absolute right-[var(--host-14)] top-1/2 h-auto w-[13px] -translate-y-1/2 opacity-45"
        height={20}
        src={nuvioIcons.formSelectDropdown}
        width={19}
      />
    </label>
  );
}
