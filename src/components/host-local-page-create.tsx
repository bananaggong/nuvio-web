"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ImagePlus,
  Loader2,
  MapPin,
  Upload,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Village } from "@/lib/village-types";

type VillageAssetPayload = {
  data?: {
    url: string;
  };
  error?: string;
};

type VillagePayload = {
  data?: Village;
  error?: string;
};

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82";

export function HostLocalPageCreate() {
  const fileInputId = useId();
  const router = useRouter();
  const imagePreviewRef = useRef("");
  const [name, setName] = useState("새 채널");
  const [location, setLocation] = useState("전국 로컬");
  const [summary, setSummary] = useState(
    "채널 소개, 프로그램 안내와 공지를 한곳에서 관리합니다.",
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdHref, setCreatedHref] = useState("");

  const trimmedName = name.trim() || "새 채널";
  const trimmedLocation = location.trim() || "전국 로컬";
  const trimmedSummary =
    summary.trim() ||
    "채널 소개, 프로그램 안내와 공지를 한곳에서 관리합니다.";
  const previewImage = imagePreviewUrl || fallbackHeroImage;

  const locationParts = useMemo(
    () => splitLocation(trimmedLocation),
    [trimmedLocation],
  );

  useEffect(() => {
    return () => {
      if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    };
  }, []);

  async function submitLocalHome(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setCreatedHref("");

    if (!trimmedName) {
      setErrorMessage("채널 이름을 입력해 주세요.");
      return;
    }

    if (!trimmedLocation) {
      setErrorMessage("위치를 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      setStatusMessage("채널을 만들고 있어요.");
      const createdVillage = await saveVillage(buildVillageDraft({
        name: trimmedName,
        region: locationParts.region,
        city: locationParts.city,
        summary: trimmedSummary,
      }));

      let finalVillage = createdVillage;

      if (imageFile) {
        setStatusMessage("첨부한 이미지를 저장하고 있습니다.");
        try {
          finalVillage = await attachHeroImage(createdVillage, imageFile);
        } catch (error) {
          setStatusMessage("");
          setCreatedHref(`/host/villages/${createdVillage.slug}`);
          setErrorMessage(
            error instanceof Error
              ? `채널은 만들어졌지만 이미지를 저장하지 못했어요. ${error.message}`
              : "채널은 만들어졌지만 이미지를 저장하지 못했어요.",
          );
          return;
        }
      }

      setStatusMessage("채널이 만들어졌어요. 호스트센터로 이동해요.");
      router.push("/host");
      router.refresh();
      setCreatedHref(`/host/villages/${finalVillage.slug}`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "채널을 만드는 중 잠깐 문제가 생겼어요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("이미지 파일만 첨부할 수 있습니다.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("이미지는 5MB 이하로 첨부해 주세요.");
      return;
    }
    if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);

    const nextUrl = URL.createObjectURL(file);
    imagePreviewRef.current = nextUrl;
    setErrorMessage("");
    setImageFile(file);
    setImagePreviewUrl(nextUrl);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"
          onSubmit={submitLocalHome}
        >
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <MapPin size={18} />
            채널 만들기
          </p>
          <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 sm:text-3xl">
            처음 호스트센터에 들어온 계정입니다.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            운영할 채널의 첫 화면에 필요한 기본 정보만 먼저 등록해 주세요.
          </p>

          <div className="mt-6 grid gap-5">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-800">
                이미지 첨부
              </span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                id={fileInputId}
                onChange={(event) => updateFile(event.target.files?.[0])}
                type="file"
              />
              <span
                className="group relative flex min-h-64 cursor-pointer overflow-hidden rounded-md border border-dashed border-slate-300 bg-slate-100"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.28)), url(${previewImage})`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <span className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-md bg-white/92 px-3 py-3 text-sm font-black text-slate-800 shadow-sm">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <ImagePlus className="shrink-0 text-[var(--primary)]" size={18} />
                    <span className="truncate">
                      {imageFile ? imageFile.name : "대표 이미지를 선택해 주세요"}
                    </span>
                  </span>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
                    <Upload size={16} />
                  </span>
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <TextField
                label="위치"
                onChange={setLocation}
                placeholder="예: 전남 보성"
                value={location}
              />
              <TextField
                label="채널 이름"
                onChange={setName}
                placeholder="예: 새 채널"
                value={name}
              />
            </div>

            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-800">
                소개글
              </span>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-200 p-3 text-sm leading-6 text-slate-800 outline-none focus:border-[var(--primary)]"
                onChange={(event) => setSummary(event.target.value)}
                placeholder="채널 소개, 프로그램 안내와 공지를 한곳에서 관리합니다."
                value={summary}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : null}
              채널 만들기
              {!isSubmitting ? <ArrowRight size={16} /> : null}
            </button>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-md border border-slate-200 px-4 text-sm font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              href="/mypage"
            >
              내 대시보드
            </Link>
          </div>

          <div aria-live="polite" className="mt-4 min-h-6 text-sm font-bold">
            {errorMessage ? (
              <div className="grid gap-2">
                <p className="text-red-700">{errorMessage}</p>
                {createdHref ? (
                  <Link className="text-[var(--primary)] underline" href={createdHref}>
                    만든 채널로 이동하기
                  </Link>
                ) : null}
              </div>
            ) : statusMessage ? (
              <p className="text-[var(--primary)]">{statusMessage}</p>
            ) : createdHref ? (
              <Link className="text-[var(--primary)] underline" href={createdHref}>
                만든 채널로 이동하기
              </Link>
            ) : null}
          </div>
        </form>

        <aside className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div
            className="aspect-[4/3] rounded-t-md bg-slate-100"
            style={{
              backgroundImage: `url(${previewImage})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }}
          />
          <div className="p-5">
            <p className="inline-flex items-center gap-1.5 text-sm font-black text-[var(--primary)]">
              <MapPin size={16} />
              {trimmedLocation}
            </p>
            <h2 className="mt-4 text-2xl font-black leading-tight text-slate-950">
              {trimmedName}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {trimmedSummary}
            </p>
            <p className="mt-5 text-sm font-black text-[var(--primary)]">
              채널 열기
              <ArrowRight className="ml-1 inline-block" size={15} />
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}

function TextField({
  label,
  onChange,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}</span>
      <input
        className="h-11 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

async function saveVillage(village: Village): Promise<Village> {
  const response = await fetch("/api/host/channels", {
    body: JSON.stringify(village),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as VillagePayload;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error ?? "채널을 저장하지 못했어요.");
  }

  return payload.data;
}

async function attachHeroImage(village: Village, file: File): Promise<Village> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("villageSlug", village.slug);
  formData.append("usage", "hero");
  formData.append("altText", village.name);

  const uploadResponse = await fetch("/api/host/village-pages/assets", {
    body: formData,
    method: "POST",
  });
  const uploadPayload = (await uploadResponse.json().catch(() => ({}))) as
    VillageAssetPayload;

  if (!uploadResponse.ok || !uploadPayload.data?.url) {
    throw new Error(uploadPayload.error ?? "이미지를 업로드하지 못했어요.");
  }

  return saveVillage({
    ...village,
    heroImage: uploadPayload.data.url,
    updatedAt: new Date().toISOString(),
  });
}

function buildVillageDraft({
  city,
  name,
  region,
  summary,
}: {
  city: string;
  name: string;
  region: string;
  summary: string;
}): Village {
  const now = new Date().toISOString();
  const slug = createLocalSlug(`${region}-${city}-${name}`);

  return {
    id: `village-${Date.now().toString(36)}`,
    slug,
    name,
    region,
    city,
    tagline: summary,
    summary,
    description: summary,
    heroImage: fallbackHeroImage,
    logoText: createLogoText(name),
    brandColor: "#0f766e",
    accentColor: "#d85b3f",
    programIds: [],
    links: [],
    sections: [
      {
        body: summary,
        id: "story",
        items: ["채널 소개", "프로그램 안내", "참여 후기와 공지"],
        title: `${name} 소개`,
        type: "story",
      },
    ],
    published: false,
    updatedAt: now,
  };
}

function splitLocation(value: string) {
  const parts = value.split(/\s+/u).filter(Boolean);
  const [first, ...rest] = parts;

  return {
    city: rest.join(" ") || "로컬",
    region: first || "전국",
  };
}

function createLocalSlug(value: string): string {
  const base =
    value
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/gu, "-")
      .replace(/^-+|-+$/gu, "")
      .slice(0, 48) || "local-page";
  const suffix = Date.now().toString(36).slice(-5);

  return `${base}-${suffix}`;
}

function createLogoText(value: string): string {
  return value.replace(/\s+/gu, "").slice(0, 2).toUpperCase() || "LH";
}
