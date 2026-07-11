"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Database,
  Eye,
  Globe2,
  Loader2,
  MapPin,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { channelPath } from "@/lib/channel-routing";
import type { Village, VillageSection } from "@/lib/village-types";

export function HostVillageStudio() {
  const [village, setVillage] = useState<Village | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const checklist = useMemo(
    () => (village ? buildVillageChecklist(village) : []),
    [village],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadVillages() {
      try {
        const response = await fetch("/api/host/channels", { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: Village[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(
            payload.error ?? "로그인하면 연결된 채널을 불러올 수 있어요.",
          );
        }

        const remoteVillages = Array.isArray(payload.data) ? payload.data : [];
        if (!isMounted) return;

        setVillage(remoteVillages[0] ?? null);
        if (remoteVillages.length === 0) {
          if (shouldOpenNewVillageDraft()) {
            setVillage(createNewVillageDraft());
            setSyncError("");
          } else {
            setSyncError("이 계정에 연결된 채널이 아직 없습니다.");
          }
        }
      } catch {
        if (isMounted) {
          setSyncError("연결된 채널 데이터를 불러오지 못했어요.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadVillages();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveVillage(nextVillage: Village) {
    setVillage(nextVillage);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function startNewVillage() {
    setSyncMessage("");
    setSyncError("");
    saveVillage(createNewVillageDraft());
  }

  function updateVillage(patch: Partial<Village>) {
    if (!village) return;
    setSyncMessage("");
    setSyncError("");
    saveVillage({ ...village, ...patch, updatedAt: new Date().toISOString() });
  }

  function updateSlug(value: string) {
    updateVillage({ slug: createClientSlug(value) });
  }

  function updateProgramIds(value: string) {
    updateVillage({
      programIds: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  function updatePrimarySection(patch: Partial<VillageSection>) {
    if (!village) return;

    const sections = village.sections.length
      ? village.sections
      : createDefaultSections(village.name);
    const [firstSection, ...rest] = sections;
    updateVillage({ sections: [{ ...firstSection, ...patch }, ...rest] });
  }

  function togglePublish() {
    if (!village) return;

    updateVillage({ published: !village.published });
  }

  async function syncSelectedVillage() {
    if (!village) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(village),
      });
      const payload = (await response.json()) as {
        data?: Village;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "채널을 저장하지 못했어요.");
      }

      saveVillage(payload.data);
      setSyncMessage("저장됐어요.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "채널을 저장하지 못했어요.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="flex min-h-64 items-center justify-center rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-slate-600">
            <Loader2 className="animate-spin text-[var(--primary)]" size={18} />
            연결된 채널을 불러오는 중이에요.
          </p>
        </section>
      </div>
    );
  }

  if (!village) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <section className="rounded-md border border-slate-200 bg-white p-6">
          <p className="inline-flex items-center gap-2 text-sm font-black text-[var(--primary)]">
            <MapPin size={18} />
            채널 정보
          </p>
          <h1 className="mt-3 text-2xl font-black text-slate-950">
            이 계정에 연결된 채널이 없습니다.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            새 채널을 만들어 운영을 시작하거나, 기존 채널은 관리자에게 권한
            연결을 요청해 주세요.
          </p>
          {syncError ? (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              {syncError}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white"
              onClick={startNewVillage}
              type="button"
            >
              새 채널 만들기
            </button>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md bg-slate-950 px-3 text-sm font-black text-white"
              href="/login?intent=host&next=/host/channels"
            >
              로그인 확인
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700"
              href="/host"
            >
              호스트센터
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const firstSection = village.sections[0] ?? createDefaultSections(village.name)[0];

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          운영 콘솔
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
          disabled={isSyncing}
          onClick={syncSelectedVillage}
          type="button"
        >
          {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
          DB 저장
        </button>
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white"
          href={channelPath(village.slug)}
          target="_blank"
        >
          <Eye size={16} />
          미리보기
        </Link>
      </div>


      <div className="mt-6 min-w-0">
        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <MapPin className="text-[var(--primary)]" size={20} />
              채널 정보
            </h2>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="채널 이름" value={village.name} onChange={(value) => updateVillage({ name: value })} />
                <TextField label="URL slug" value={village.slug} onChange={updateSlug} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="지역" value={village.region} onChange={(value) => updateVillage({ region: value })} />
                <TextField label="시군구" value={village.city} onChange={(value) => updateVillage({ city: value })} />
              </div>
              <TextField label="한 줄 소개" value={village.tagline} onChange={(value) => updateVillage({ tagline: value })} />
              <TextArea label="요약" value={village.summary} onChange={(value) => updateVillage({ summary: value })} />
              <TextArea label="상세 소개" value={village.description} onChange={(value) => updateVillage({ description: value })} />
              <TextField label="대표 이미지 URL" value={village.heroImage} onChange={(value) => updateVillage({ heroImage: value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <ColorField label="브랜드 색상" value={village.brandColor} onChange={(value) => updateVillage({ brandColor: value })} />
                <ColorField label="강조 색상" value={village.accentColor} onChange={(value) => updateVillage({ accentColor: value })} />
              </div>
              <TextField
                label="연결 프로그램 ID/slug"
                value={village.programIds.join(", ")}
                onChange={updateProgramIds}
                placeholder="1013, 1014, 1015"
              />
              <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4 text-sm leading-6 text-slate-600">
                <p className="font-black text-slate-950">공개 주소</p>
                <p className="mt-1 font-bold">짧은 주소: /{village.slug}</p>
                <p className="font-bold">표준 주소: /channels/{village.slug}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="연락처" value={village.contactPhone ?? ""} onChange={(value) => updateVillage({ contactPhone: value || undefined })} />
                <TextField label="이메일" value={village.contactEmail ?? ""} onChange={(value) => updateVillage({ contactEmail: value || undefined })} />
              </div>
              <TextField label="주소" value={village.address ?? ""} onChange={(value) => updateVillage({ address: value || undefined })} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="인스타그램 URL" value={village.instagramUrl ?? ""} onChange={(value) => updateVillage({ instagramUrl: value || undefined })} />
                <TextField label="카카오 채널 URL" value={village.kakaoUrl ?? ""} onChange={(value) => updateVillage({ kakaoUrl: value || undefined })} />
              </div>
              <div className="rounded-md border border-slate-200 bg-[var(--surface-muted)] p-4">
                <p className="font-black text-slate-950">첫 소개 블록</p>
                <div className="mt-3 grid gap-3">
                  <TextField label="제목" value={firstSection.title} onChange={(value) => updatePrimarySection({ title: value })} />
                  <TextArea label="본문" value={firstSection.body} onChange={(value) => updatePrimarySection({ body: value })} />
                  <TextArea
                    label="항목"
                    value={firstSection.items.join("\n")}
                    onChange={(value) =>
                      updatePrimarySection({
                        items: value
                          .split("\n")
                          .map((item) => item.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                className={`inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-black ${
                  village.published
                    ? "border border-slate-200 text-slate-700"
                    : "bg-[var(--primary)] text-white"
                }`}
                onClick={togglePublish}
                type="button"
              >
                <Eye size={16} />
                {village.published ? "비공개 전환" : "게시 준비"}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
                disabled={isSyncing}
                onClick={syncSelectedVillage}
                type="button"
              >
                {isSyncing ? <Loader2 className="animate-spin" size={16} /> : <Database size={16} />}
                Supabase
              </button>
            </div>

            <div
              aria-live="polite"
              className="mt-5 flex flex-wrap items-center gap-2 text-sm font-bold text-slate-500"
            >
              {saved ? <Check size={16} className="text-[var(--primary)]" /> : <Save size={16} />}
              {saved ? "화면 초안 반영됨" : "DB 저장 전 화면 초안"}
              {syncMessage ? (
                <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-black text-teal-700">
                  {syncMessage}
                </span>
              ) : null}
              {syncError ? (
                <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-black text-red-700">
                  {syncError}
                </span>
              ) : null}
            </div>
          </section>

          <aside className="min-w-0 space-y-4">
            <VillagePreview village={village} />
            <section className="rounded-md border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-black text-slate-950">게시 체크리스트</h2>
              <div className="mt-4 grid gap-2">
                {checklist.map((item) => (
                  <div className="rounded-md bg-[var(--surface-muted)] p-3" key={item.id}>
                    <p className="flex items-center gap-2 text-sm font-black text-slate-800">
                      <span
                        className={`inline-flex size-5 shrink-0 items-center justify-center rounded-full ${
                          item.done
                            ? "bg-[var(--primary)] text-white"
                            : "bg-white text-slate-400 ring-1 ring-slate-200"
                        }`}
                      >
                        {item.done ? <Check size={13} /> : null}
                      </span>
                      {item.label}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {item.helper}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </main>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="h-11 w-full min-w-0 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        className="min-h-24 w-full min-w-0 rounded-md border border-slate-200 p-3 text-sm leading-6 outline-none focus:border-[var(--primary)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <div className="flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-2">
        <input
          aria-label={label}
          className="size-8 rounded border-0 bg-transparent p-0"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={value}
        />
        <input
          className="min-w-0 flex-1 text-sm font-bold text-slate-700 outline-none"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </div>
    </label>
  );
}

function VillagePreview({ village }: { village: Village }) {
  return (
    <article className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] bg-slate-100">
        <Image
          alt={village.name}
          className="object-cover"
          fill
          sizes="(max-width: 1280px) 100vw, 360px"
          src={village.heroImage}
        />
      </div>
      <div className="p-4">
        <p
          className="inline-flex rounded-md px-2 py-1 text-xs font-black text-white"
          style={{ backgroundColor: village.brandColor }}
        >
          /{village.slug}
        </p>
        <h2 className="mt-3 text-lg font-black leading-6 text-slate-950">
          {village.name}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">{village.summary}</p>
        <div className="mt-4 grid gap-2 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <MapPin size={16} />
            {village.region} {village.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 size={16} />
            /{village.slug}
          </span>
        </div>
      </div>
    </article>
  );
}

function buildVillageChecklist(village: Village) {
  return [
    {
      id: "slug",
      label: "URL slug",
      helper: "짧은 주소와 표준 경로에 사용할 값입니다.",
      done: village.slug.length >= 3,
    },
    {
      id: "summary",
      label: "소개 문구",
      helper: "누비어가 채널 성격을 바로 이해할 수 있어야 합니다.",
      done: village.summary.length >= 20 && village.description.length >= 40,
    },
    {
      id: "image",
      label: "대표 이미지",
      helper: "채널의 첫 인상을 만드는 실제 장소 이미지입니다.",
      done: /^https?:\/\//u.test(village.heroImage),
    },
    {
      id: "contact",
      label: "문의 채널",
      helper: "선정 전후 문의가 흩어지지 않도록 연락 경로를 둡니다.",
      done: Boolean(village.contactPhone || village.contactEmail || village.kakaoUrl),
    },
    {
      id: "programs",
      label: "프로그램 연결",
      helper: "공개 프로그램 id 또는 slug를 연결하면 채널에 표시됩니다.",
      done: village.programIds.length > 0,
    },
  ];
}

function createDefaultSections(villageName: string): VillageSection[] {
  return [
    {
      id: "story",
      type: "story",
      title: `${villageName} 소개`,
      body: `${villageName}의 프로그램, 공지, 활동 기록을 한곳에서 관리합니다.`,
      items: ["채널 소개", "프로그램 안내", "공지 관리"],
    },
  ];
}

function createNewVillageDraft(): Village {
  const now = new Date().toISOString();
  const suffix = Date.now().toString(36);
  const name = "새 채널";

  return {
    id: `village-${suffix}`,
    slug: `local-page-${suffix}`,
    name,
    region: "전국",
    city: "로컬",
    tagline: "우리 채널의 프로그램과 소식을 소개합니다.",
    summary: "채널 소개, 프로그램 안내와 공지를 한곳에서 관리합니다.",
    description:
      "호스트가 직접 채널 소개, 프로그램, 문의 채널, 활동 기록을 구성할 수 있는 공개 페이지입니다.",
    heroImage:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82",
    logoText: "LH",
    brandColor: "#0f766e",
    accentColor: "#f59e0b",
    programIds: [],
    links: [],
    sections: createDefaultSections(name),
    published: false,
    updatedAt: now,
  };
}

function createClientSlug(value: string): string {
  const slug = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 72);

  return slug || `village-${Date.now().toString(36)}`;
}

function shouldOpenNewVillageDraft(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("new") === "1";
}
