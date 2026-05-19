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
import { seedVillages } from "@/lib/village-seeds";
import { villagePath } from "@/lib/village-routing";
import type { Village, VillageSection } from "@/lib/village-types";

const HOST_VILLAGE_SLUG = "daon-local-lab";

export function HostVillageStudio() {
  const [village, setVillage] = useState<Village>(getDefaultHostVillage);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const checklist = useMemo(
    () => buildVillageChecklist(village),
    [village],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadVillages() {
      try {
        const response = await fetch("/api/host/villages", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: Village[] };
        const remoteVillages = Array.isArray(payload.data) ? payload.data : [];
        const remoteHostVillage = remoteVillages.find(isHostVillage);
        if (!isMounted || !remoteHostVillage) return;

        setVillage(remoteHostVillage);
      } catch {
        if (isMounted) {
          setSyncError("DB 로컬홈 데이터를 불러오지 못했습니다. 기본 데모 채널을 표시합니다.");
        }
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

  function updateVillage(patch: Partial<Village>) {
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
    const sections = village.sections.length
      ? village.sections
      : createDefaultSections(village.name);
    const [firstSection, ...rest] = sections;
    updateVillage({ sections: [{ ...firstSection, ...patch }, ...rest] });
  }

  function togglePublish() {
    updateVillage({ published: !village.published });
  }

  async function syncSelectedVillage() {
    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/villages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(village),
      });
      const payload = (await response.json()) as {
        data?: Village;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "로컬홈 저장에 실패했습니다.");
      }

      saveVillage(payload.data);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "로컬홈 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
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
          href={villagePath(village.slug)}
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
              로컬홈 정보
            </h2>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="로컬홈 이름" value={village.name} onChange={(value) => updateVillage({ name: value })} />
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
                <p className="font-bold">표준 주소: /villages/{village.slug}</p>
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
      helper: "참여자가 로컬홈 성격을 바로 이해할 수 있어야 합니다.",
      done: village.summary.length >= 20 && village.description.length >= 40,
    },
    {
      id: "image",
      label: "대표 이미지",
      helper: "로컬홈의 첫 인상을 만드는 실제 장소 이미지입니다.",
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
      helper: "공개 프로그램 id 또는 slug를 연결하면 로컬홈 페이지에 표시됩니다.",
      done: village.programIds.length > 0,
    },
  ];
}

const demoHostVillage: Village = {
  id: "11111111-2222-4333-8444-555555555555",
  slug: HOST_VILLAGE_SLUG,
  name: "다온 로컬랩",
  region: "전라남도",
  city: "남해군",
  tagline: "남해 바다 앞에서 일하고 쉬는 7일",
  summary:
    "다온 로컬랩은 남해의 빈집과 공유 작업공간을 연결해 워케이션 프로그램을 운영하는 로컬 채널입니다.",
  description:
    "가상의 호스트 박다온이 누비오에 가입한 뒤 만든 첫 운영 채널입니다. 참여자는 숙소, 작업 공간, 로컬 클래스가 결합된 워케이션 프로그램을 신청할 수 있습니다.",
  heroImage:
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=82",
  logoText: "DAON",
  brandColor: "#0f766e",
  accentColor: "#2563eb",
  instagramUrl: "https://www.instagram.com/daon.local.lab",
  kakaoUrl: "https://pf.kakao.com/_daonlocal",
  contactEmail: "demo.host@nuvio.local",
  contactPhone: "010-2405-2026",
  address: "전라남도 남해군 남해읍",
  programIds: [
    "22222222-3333-4444-8555-666666666666",
    "namhae-blue-workation-2026",
  ],
  links: [
    {
      id: "instagram",
      label: "인스타그램",
      type: "instagram",
      url: "https://www.instagram.com/daon.local.lab",
    },
    {
      id: "notice",
      label: "운영 문의",
      type: "notice",
      url: "/partners/apply",
    },
  ],
  sections: [
    {
      id: "story",
      type: "story",
      title: "다온 로컬랩 소개",
      body: "남해의 바다, 빈집, 로컬 커뮤니티를 연결해 짧은 체류형 워케이션을 운영합니다.",
      items: ["공유 작업공간 운영", "로컬 클래스 연결", "체류자 신청/안내 관리"],
    },
    {
      id: "programs",
      type: "programs",
      title: "대표 프로그램",
      body: "첫 번째 프로그램은 남해 바다 워케이션 7일입니다.",
      items: ["6박 7일 체류", "공유 오피스 이용", "로컬 클래스 2회"],
    },
  ],
  published: true,
  updatedAt: "2026-05-19T09:10:00+09:00",
};

function isHostVillage(village: Village): boolean {
  return village.slug === HOST_VILLAGE_SLUG;
}

function getDefaultHostVillage(): Village {
  return seedVillages.find(isHostVillage) ?? demoHostVillage;
}

function createDefaultSections(villageName: string): VillageSection[] {
  return [
    {
      id: "story",
      type: "story",
      title: `${villageName} 소개`,
      body: `${villageName}의 프로그램, 공지, 후기 흐름을 한곳에서 관리합니다.`,
      items: ["로컬홈 소개", "프로그램 안내", "후기 수집"],
    },
  ];
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
