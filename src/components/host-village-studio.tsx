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
  Plus,
  Save,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { seedVillages } from "@/lib/village-seeds";
import { villagePath } from "@/lib/village-routing";
import type { Village, VillageSection } from "@/lib/village-types";

const STORAGE_KEY = "nuvio:host-villages";

export function HostVillageStudio() {
  const [villages, setVillages] = useState<Village[]>(readStoredVillages);
  const [selectedId, setSelectedId] = useState(villages[0]?.id);
  const [saved, setSaved] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const selectedVillage = useMemo(
    () => villages.find((village) => village.id === selectedId) ?? villages[0],
    [villages, selectedId],
  );
  const checklist = useMemo(
    () => (selectedVillage ? buildVillageChecklist(selectedVillage) : []),
    [selectedVillage],
  );
  const readyCount = checklist.filter((item) => item.done).length;

  useEffect(() => {
    let isMounted = true;

    async function loadVillages() {
      try {
        const response = await fetch("/api/host/villages", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as { data?: Village[] };
        const remoteVillages = Array.isArray(payload.data) ? payload.data : [];
        if (!isMounted || remoteVillages.length === 0) return;

        setVillages((current) => {
          const next = mergeVillages(remoteVillages, current);
          writeStoredVillages(next);
          return next;
        });
        setSelectedId((currentId) => currentId ?? remoteVillages[0]?.id);
      } catch {
        if (isMounted) {
          setSyncError("DB 마을 데이터를 불러오지 못했습니다. 로컬 초안으로 계속 진행합니다.");
        }
      }
    }

    void loadVillages();

    return () => {
      isMounted = false;
    };
  }, []);

  function saveVillages(nextVillages: Village[]) {
    setVillages(nextVillages);
    writeStoredVillages(nextVillages);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1400);
  }

  function updateVillage(patch: Partial<Village>) {
    if (!selectedVillage) return;
    setSyncMessage("");
    setSyncError("");
    saveVillages(
      villages.map((village) =>
        village.id === selectedVillage.id
          ? { ...village, ...patch, updatedAt: new Date().toISOString() }
          : village,
      ),
    );
  }

  function addVillage() {
    const nextVillage = createVillageDraft();
    saveVillages([nextVillage, ...villages]);
    setSelectedId(nextVillage.id);
    setSyncMessage("");
    setSyncError("");
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
    if (!selectedVillage) return;
    const sections = selectedVillage.sections.length
      ? selectedVillage.sections
      : createDefaultSections(selectedVillage.name);
    const [firstSection, ...rest] = sections;
    updateVillage({ sections: [{ ...firstSection, ...patch }, ...rest] });
  }

  function togglePublish() {
    if (!selectedVillage) return;
    updateVillage({ published: !selectedVillage.published });
  }

  async function syncSelectedVillage() {
    if (!selectedVillage) return;

    setIsSyncing(true);
    setSyncMessage("");
    setSyncError("");

    try {
      const response = await fetch("/api/host/villages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedVillage),
      });
      const payload = (await response.json()) as {
        data?: Village;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "마을 저장에 실패했습니다.");
      }

      const nextVillages = mergeVillages(
        [payload.data],
        villages.filter(
          (village) =>
            village.id !== selectedVillage.id && village.id !== payload.data?.id,
        ),
      );

      saveVillages(nextVillages);
      setSelectedId(payload.data.id);
      setSyncMessage("Supabase DB에 저장되었습니다.");
    } catch (error) {
      setSyncError(
        error instanceof Error ? error.message : "마을 저장에 실패했습니다.",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  if (!selectedVillage) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        <button
          className="inline-flex h-11 items-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white"
          onClick={addVillage}
          type="button"
        >
          <Plus size={17} />
          마을 만들기
        </button>
      </div>
    );
  }

  const firstSection = selectedVillage.sections[0] ?? createDefaultSections(selectedVillage.name)[0];

  return (
    <div className="mx-auto min-w-0 max-w-6xl px-4 py-8 md:px-8">
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <Link
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          href="/host"
        >
          <ArrowLeft size={16} />
          운영 콘솔
        </Link>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700"
          onClick={addVillage}
          type="button"
        >
          <Plus size={16} />
          새 마을
        </button>
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
          href={villagePath(selectedVillage.slug)}
          target="_blank"
        >
          <Eye size={16} />
          미리보기
        </Link>
      </div>

      <section className="overflow-hidden rounded-md bg-slate-950 p-5 text-white sm:p-6">
        <p className="inline-flex items-center gap-2 text-sm font-black text-teal-200">
          <Globe2 size={18} />
          마을 홈 스튜디오
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-2xl font-black leading-tight sm:text-3xl md:text-4xl">
              슬래시페이지처럼 마을별 홈페이지를 만들고 프로그램을 연결합니다.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              지금은 경로형 주소를 기본으로 쓰고, 서브도메인과 커스텀 도메인은 마을 데이터에 함께 보관합니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <HeroMetric label="마을" value={`${villages.length}개`} />
            <HeroMetric label="검수" value={`${readyCount}/${checklist.length}`} />
            <HeroMetric
              label="상태"
              value={selectedVillage.published ? "게시 중" : "비공개"}
            />
          </div>
        </div>
      </section>

      <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-2">
          {villages.map((village) => (
            <button
              className={`w-full rounded-md border p-3 text-left ${
                village.id === selectedVillage.id
                  ? "border-[var(--primary)] bg-teal-50"
                  : "border-slate-200 bg-white"
              }`}
              key={village.id}
              onClick={() => setSelectedId(village.id)}
              type="button"
            >
              <p className="break-words font-black text-slate-950">{village.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                /{village.slug} · {village.published ? "게시" : "비공개"}
              </p>
            </button>
          ))}
        </aside>

        <main className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 rounded-md border border-slate-200 bg-white p-5">
            <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
              <MapPin className="text-[var(--primary)]" size={20} />
              마을 정보
            </h2>
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="마을 이름" value={selectedVillage.name} onChange={(value) => updateVillage({ name: value })} />
                <TextField label="URL slug" value={selectedVillage.slug} onChange={updateSlug} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="지역" value={selectedVillage.region} onChange={(value) => updateVillage({ region: value })} />
                <TextField label="시군구" value={selectedVillage.city} onChange={(value) => updateVillage({ city: value })} />
              </div>
              <TextField label="한 줄 소개" value={selectedVillage.tagline} onChange={(value) => updateVillage({ tagline: value })} />
              <TextArea label="요약" value={selectedVillage.summary} onChange={(value) => updateVillage({ summary: value })} />
              <TextArea label="상세 소개" value={selectedVillage.description} onChange={(value) => updateVillage({ description: value })} />
              <TextField label="대표 이미지 URL" value={selectedVillage.heroImage} onChange={(value) => updateVillage({ heroImage: value })} />
              <div className="grid gap-4 md:grid-cols-2">
                <ColorField label="브랜드 색상" value={selectedVillage.brandColor} onChange={(value) => updateVillage({ brandColor: value })} />
                <ColorField label="강조 색상" value={selectedVillage.accentColor} onChange={(value) => updateVillage({ accentColor: value })} />
              </div>
              <TextField
                label="연결 프로그램 ID/slug"
                value={selectedVillage.programIds.join(", ")}
                onChange={updateProgramIds}
                placeholder="1001, gangneung-wave-workation"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="서브도메인" value={selectedVillage.subdomain ?? ""} onChange={(value) => updateVillage({ subdomain: value || undefined })} placeholder="boseong" />
                <TextField label="커스텀 도메인" value={selectedVillage.customDomain ?? ""} onChange={(value) => updateVillage({ customDomain: value || undefined })} placeholder="village.example.com" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="연락처" value={selectedVillage.contactPhone ?? ""} onChange={(value) => updateVillage({ contactPhone: value || undefined })} />
                <TextField label="이메일" value={selectedVillage.contactEmail ?? ""} onChange={(value) => updateVillage({ contactEmail: value || undefined })} />
              </div>
              <TextField label="주소" value={selectedVillage.address ?? ""} onChange={(value) => updateVillage({ address: value || undefined })} />
              <div className="grid gap-4 md:grid-cols-2">
                <TextField label="인스타그램 URL" value={selectedVillage.instagramUrl ?? ""} onChange={(value) => updateVillage({ instagramUrl: value || undefined })} />
                <TextField label="카카오 채널 URL" value={selectedVillage.kakaoUrl ?? ""} onChange={(value) => updateVillage({ kakaoUrl: value || undefined })} />
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
                  selectedVillage.published
                    ? "border border-slate-200 text-slate-700"
                    : "bg-[var(--primary)] text-white"
                }`}
                onClick={togglePublish}
                type="button"
              >
                <Eye size={16} />
                {selectedVillage.published ? "비공개 전환" : "게시 준비"}
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
              {saved ? "저장됨" : "변경사항 자동 저장"}
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
            <VillagePreview village={selectedVillage} />
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
            {village.subdomain ?? village.slug}.nuvio.kr
          </span>
        </div>
      </div>
    </article>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs font-black text-slate-300">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}

function buildVillageChecklist(village: Village) {
  return [
    {
      id: "slug",
      label: "URL slug",
      helper: "짧은 주소와 서브도메인 후보로 사용할 값입니다.",
      done: village.slug.length >= 3,
    },
    {
      id: "summary",
      label: "소개 문구",
      helper: "참여자가 마을 성격을 바로 이해할 수 있어야 합니다.",
      done: village.summary.length >= 20 && village.description.length >= 40,
    },
    {
      id: "image",
      label: "대표 이미지",
      helper: "마을의 첫 인상을 만드는 실제 장소 이미지입니다.",
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
      helper: "공개 프로그램 id 또는 slug를 연결하면 마을 홈에 표시됩니다.",
      done: village.programIds.length > 0,
    },
  ];
}

function readStoredVillages(): Village[] {
  if (typeof window === "undefined") return seedVillages;

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return seedVillages;
    const parsedValue = JSON.parse(rawValue) as Village[];
    return mergeVillages(parsedValue, seedVillages);
  } catch {
    return seedVillages;
  }
}

function writeStoredVillages(villages: Village[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(villages));
}

function mergeVillages(primary: Village[], fallback: Village[]) {
  const seen = new Set<string>();
  const merged: Village[] = [];

  for (const village of [...primary, ...fallback]) {
    const key = village.id || village.slug;
    if (seen.has(key) || seen.has(village.slug)) continue;
    seen.add(key);
    seen.add(village.slug);
    merged.push(village);
  }

  return merged;
}

function createVillageDraft(): Village {
  const name = "새 마을";
  const id = `village-${Date.now()}`;

  return {
    id,
    slug: `new-village-${Date.now().toString(36)}`,
    name,
    region: "전국",
    city: "로컬",
    tagline: "새로운 마을 홈을 준비 중입니다.",
    summary: "신청, 공지, 후기, 커뮤니티를 한곳에서 운영하는 마을 페이지입니다.",
    description:
      "운영자는 이 페이지를 통해 마을 소개, 프로그램 연결, 공식 문의 채널, 기수별 안내를 정리할 수 있습니다.",
    heroImage:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82",
    logoText: "NV",
    brandColor: "#0f766e",
    accentColor: "#f59e0b",
    programIds: [],
    links: [],
    sections: createDefaultSections(name),
    published: false,
    updatedAt: new Date().toISOString(),
  };
}

function createDefaultSections(villageName: string): VillageSection[] {
  return [
    {
      id: "story",
      type: "story",
      title: `${villageName} 소개`,
      body: `${villageName}의 프로그램, 공지, 후기 흐름을 한곳에서 관리합니다.`,
      items: ["마을 소개", "프로그램 안내", "후기 수집"],
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
