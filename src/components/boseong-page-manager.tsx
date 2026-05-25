"use client";

import Link from "next/link";
import {
  Eye,
  FileImage,
  GripVertical,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { VillagePageSectionDraft } from "@/lib/village-page-cms";

type VillageAsset = {
  id: string;
  fileName: string;
  url: string;
  altText?: string;
  usage: string;
  createdAt: string;
};

type CarouselSlide = {
  body: string;
  hashtags: string;
  href?: string;
  programSlug?: string;
  title: string;
};

const villageSlug = "boseong";
type ManagedPageKey = "home" | "about";

export function BoseongPageManager() {
  const [sections, setSections] = useState<VillagePageSectionDraft[]>([]);
  const [assets, setAssets] = useState<VillageAsset[]>([]);
  const [activePageKey, setActivePageKey] = useState<ManagedPageKey>("home");
  const [activeSectionKey, setActiveSectionKey] = useState("home_hero");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [message, setMessage] = useState("");

  const activeSection = useMemo(
    () =>
      sections.find((section) => section.sectionKey === activeSectionKey) ??
      sections[0],
    [activeSectionKey, sections],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [sectionsResponse, assetsResponse] = await Promise.all([
          fetch(
            `/api/host/village-pages/sections?villageSlug=${villageSlug}&pageKey=${activePageKey}`,
            { cache: "no-store" },
          ),
          fetch(`/api/host/village-pages/assets?villageSlug=${villageSlug}`, {
            cache: "no-store",
          }),
        ]);
        const sectionsPayload = (await sectionsResponse.json()) as {
          data?: VillagePageSectionDraft[];
          error?: string;
        };
        const assetsPayload = (await assetsResponse.json()) as {
          data?: VillageAsset[];
        };

        if (!sectionsResponse.ok || !sectionsPayload.data) {
          throw new Error(
            sectionsPayload.error ?? "로컬페이지 섹션을 불러오지 못했습니다.",
          );
        }

        if (mounted) {
          const nextSections = sectionsPayload.data.sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );
          setSections(nextSections);
          setAssets(assetsPayload.data ?? []);
          setActiveSectionKey(nextSections[0]?.sectionKey ?? "home_hero");
        }
      } catch (error) {
        if (mounted) {
          setMessage(
            error instanceof Error
              ? error.message
              : "로컬페이지 섹션을 불러오지 못했습니다.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [activePageKey]);

  function updateActiveSection(patch: Partial<VillagePageSectionDraft>) {
    if (!activeSection) return;

    setSections((current) =>
      current.map((section) =>
        section.sectionKey === activeSection.sectionKey
          ? {
              ...section,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : section,
      ),
    );
  }

  function updateActiveContent(patch: Record<string, unknown>) {
    if (!activeSection) return;

    updateActiveSection({
      draftContent: {
        ...activeSection.draftContent,
        ...patch,
      },
    });
  }

  async function saveDraft() {
    if (!activeSection) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/host/village-pages/sections", {
        body: JSON.stringify(activeSection),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: VillagePageSectionDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "임시저장에 실패했습니다.");
      }

      replaceSection(payload.data);
      setMessage("임시저장했습니다. 공개 페이지는 아직 바뀌지 않았습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "임시저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function publishSection() {
    if (!activeSection) return;

    setPublishing(true);
    setMessage("");

    try {
      const response = await fetch("/api/host/village-pages/sections/publish", {
        body: JSON.stringify(activeSection),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: VillagePageSectionDraft;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "발행에 실패했습니다.");
      }

      replaceSection(payload.data);
      setMessage("발행했습니다. 공개 보성 로컬페이지에 반영됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "발행에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  function replaceSection(nextSection: VillagePageSectionDraft) {
    setSections((current) =>
      current
        .map((section) =>
          section.sectionKey === nextSection.sectionKey ? nextSection : section,
        )
        .sort((a, b) => a.orderIndex - b.orderIndex),
    );
    setActiveSectionKey(nextSection.sectionKey);
  }

  async function uploadImage(file: File, fieldName: string) {
    if (!activeSection) return;

    setUploadingField(fieldName);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("villageSlug", villageSlug);
      formData.append("usage", activeSection.sectionKey);

      const response = await fetch("/api/host/village-pages/assets", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: VillageAsset;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "이미지 업로드에 실패했습니다.");
      }

      setAssets((current) => [payload.data!, ...current]);
      updateActiveContent({ [fieldName]: payload.data.url });
      setMessage("이미지를 업로드하고 현재 섹션에 연결했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.",
      );
    } finally {
      setUploadingField("");
    }
  }

  return (
    <section className="mt-6 border border-slate-200 bg-white p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black text-teal-700">로컬페이지 관리</p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            공개 페이지 섹션 편집
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            개발자 개입 없이 사진, 문구, 버튼, 노출 순서를 바꾸고 발행할 수
            있습니다. 임시저장 후 발행해야 공개 페이지에 반영됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PageKeyButton
            active={activePageKey === "home"}
            label="홈"
            onClick={() => setActivePageKey("home")}
          />
          <PageKeyButton
            active={activePageKey === "about"}
            label="소개"
            onClick={() => setActivePageKey("about")}
          />
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-teal-700 hover:text-teal-700"
            href="/host/villages/boseong/editor"
          >
            <PencilLine size={16} />
            로컬페이지에서 편집
          </Link>
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-teal-700 hover:text-teal-700"
            href="/boseong"
            target="_blank"
          >
            <Eye size={16} />
            공개 페이지
          </Link>
          <ActionButton busy={saving} icon={<Save size={16} />} label="임시저장" onClick={saveDraft} />
          <ActionButton
            busy={publishing}
            icon={<Send size={16} />}
            label="발행"
            onClick={publishSection}
          />
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          {message}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-6 flex min-h-64 items-center justify-center text-sm font-black text-slate-500">
          <Loader2 className="mr-2 animate-spin" size={17} />
          로컬페이지 섹션을 불러오는 중
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-2">
            {sections.map((section) => (
              <button
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm font-black ${
                  section.sectionKey === activeSection?.sectionKey
                    ? "border-teal-700 bg-teal-50 text-teal-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-700"
                }`}
                key={section.sectionKey}
                onClick={() => setActiveSectionKey(section.sectionKey)}
                type="button"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <GripVertical className="shrink-0 text-slate-400" size={16} />
                  <span className="truncate">{section.label}</span>
                </span>
                <span className="ml-2 shrink-0 text-xs text-slate-500">
                  {section.publishedAt ? "발행됨" : "초안"}
                </span>
              </button>
            ))}
          </div>

          {activeSection ? (
            <div className="grid gap-5">
              <div className="grid gap-4 rounded-md border border-slate-200 p-4 md:grid-cols-[minmax(0,1fr)_120px_120px]">
                <TextInput
                  label="섹션 이름"
                  onChange={(value) => updateActiveSection({ label: value })}
                  value={activeSection.label}
                />
                <TextInput
                  label="노출 순서"
                  onChange={(value) =>
                    updateActiveSection({ orderIndex: Number(value) || 100 })
                  }
                  type="number"
                  value={String(activeSection.orderIndex)}
                />
                <label className="flex items-end gap-2 pb-3 text-sm font-black text-slate-700">
                  <input
                    checked={activeSection.visible}
                    onChange={(event) =>
                      updateActiveSection({ visible: event.target.checked })
                    }
                    type="checkbox"
                  />
                  공개 노출
                </label>
              </div>

              <SectionContentEditor
                assets={assets}
                section={activeSection}
                uploadingField={uploadingField}
                onContentChange={updateActiveContent}
                onUploadImage={uploadImage}
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function PageKeyButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`inline-flex h-10 items-center rounded-md border px-3 text-sm font-black ${
        active
          ? "border-teal-700 bg-teal-50 text-teal-900"
          : "border-slate-200 text-slate-700 hover:border-teal-700 hover:text-teal-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function SectionContentEditor({
  assets,
  onContentChange,
  onUploadImage,
  section,
  uploadingField,
}: {
  assets: VillageAsset[];
  onContentChange: (patch: Record<string, unknown>) => void;
  onUploadImage: (file: File, fieldName: string) => void;
  section: VillagePageSectionDraft;
  uploadingField: string;
}) {
  const content = section.draftContent;

  if (section.sectionKey === "about_header") {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput
          label="첫 줄"
          onChange={(value) => onContentChange({ kicker: value })}
          value={asString(content.kicker)}
        />
        <TextInput
          label="큰 제목"
          onChange={(value) => onContentChange({ title: value })}
          value={asString(content.title)}
        />
        <TextInput
          label="브랜드명"
          onChange={(value) => onContentChange({ brand: value })}
          value={asString(content.brand)}
        />
      </div>
    );
  }

  if (section.sectionType === "about_grid") {
    const rows = normalizeAboutRows(content.rows);

    return (
      <div className="grid gap-4">
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput
            label="소개 제목"
            onChange={(value) => onContentChange({ introTitle: value })}
            value={asString(content.introTitle)}
          />
          <TextInput
            label="소개 문장"
            onChange={(value) => onContentChange({ introBody: value })}
            value={asString(content.introBody)}
          />
        </div>
        {rows.map((row, index) => (
          <div className="rounded-md border border-slate-200 p-4" key={`${row.title}-${index}`}>
            <p className="mb-3 text-sm font-black text-slate-700">
              소개 문단 {index + 1}
            </p>
            <TextInput
              label="제목"
              onChange={(value) =>
                onContentChange({ rows: replaceAboutRow(rows, index, { title: value }) })
              }
              value={row.title}
            />
            <TextArea
              label="본문"
              onChange={(value) =>
                onContentChange({ rows: replaceAboutRow(rows, index, { body: value }) })
              }
              value={row.body}
            />
            <TextInput
              label="아이콘 이미지 URL"
              onChange={(value) =>
                onContentChange({
                  rows: replaceAboutRow(rows, index, { iconSrc: value }),
                })
              }
              value={row.iconSrc}
            />
          </div>
        ))}
      </div>
    );
  }

  if (section.sectionType === "original_carousel") {
    const slides = normalizeSlides(content.slides);

    return (
      <div className="grid gap-4">
        <TextInput
          label="큰 영문 타이틀"
          onChange={(value) => onContentChange({ heading: value })}
          value={asString(content.heading)}
        />
        <div className="grid gap-3">
          {slides.map((slide, index) => (
            <div className="rounded-md border border-slate-200 p-4" key={`${slide.title}-${index}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-black text-slate-700">
                  자동전환 {index + 1}
                </p>
                <button
                  className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600"
                  onClick={() =>
                    onContentChange({
                      slides: slides.filter((_, slideIndex) => slideIndex !== index),
                    })
                  }
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput
                  label="제목"
                  onChange={(value) =>
                    onContentChange({ slides: replaceSlide(slides, index, { title: value }) })
                  }
                  value={slide.title}
                />
                <TextInput
                  label="연결 프로그램 slug"
                  onChange={(value) =>
                    onContentChange({
                      slides: replaceSlide(slides, index, { programSlug: value }),
                    })
                  }
                  value={slide.programSlug ?? ""}
                />
              </div>
              <TextArea
                label="본문"
                onChange={(value) =>
                  onContentChange({ slides: replaceSlide(slides, index, { body: value }) })
                }
                value={slide.body}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <TextInput
                  label="해시태그"
                  onChange={(value) =>
                    onContentChange({
                      slides: replaceSlide(slides, index, { hashtags: value }),
                    })
                  }
                  value={slide.hashtags}
                />
                <TextInput
                  label="직접 링크"
                  onChange={(value) =>
                    onContentChange({ slides: replaceSlide(slides, index, { href: value }) })
                  }
                  value={slide.href ?? ""}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-teal-700 hover:text-teal-700"
          onClick={() =>
            onContentChange({
              slides: [
                ...slides,
                {
                  body: "프로그램 소개 문구를 입력하세요.",
                  hashtags: "#전체차LAB",
                  programSlug: "",
                  title: "새 프로그램",
                },
              ],
            })
          }
          type="button"
        >
          <Plus size={16} />
          자동전환 항목 추가
        </button>
      </div>
    );
  }

  if (section.sectionType === "hero" || section.sectionType === "image_story") {
    return (
      <div className="grid gap-4">
        {section.sectionType === "image_story" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <TextInput
              label="제목"
              onChange={(value) => onContentChange({ title: value })}
              value={asString(content.title)}
            />
            <TextInput
              label="링크 문구"
              onChange={(value) => onContentChange({ linkLabel: value })}
              value={asString(content.linkLabel)}
            />
            <TextInput
              label="링크 주소"
              onChange={(value) => onContentChange({ linkHref: value })}
              value={asString(content.linkHref)}
            />
          </div>
        ) : null}
        <ImageField
          assets={assets}
          fieldName="imageUrl"
          label="이미지"
          onChange={(value) => onContentChange({ imageUrl: value })}
          onUpload={onUploadImage}
          uploading={uploadingField === "imageUrl"}
          value={asString(content.imageUrl)}
        />
        <TextInput
          label="이미지 설명"
          onChange={(value) => onContentChange({ alt: value })}
          value={asString(content.alt)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <TextInput
          label="섹션 제목"
          onChange={(value) => onContentChange({ title: value })}
          value={asString(content.title)}
        />
        <TextInput
          label="더보기 링크"
          onChange={(value) => onContentChange({ href: value })}
          value={asString(content.href)}
        />
        <TextInput
          label="노출 개수"
          onChange={(value) => onContentChange({ limit: Number(value) || 3 })}
          type="number"
          value={String(content.limit ?? 3)}
        />
      </div>
    </div>
  );
}

function ImageField({
  assets,
  fieldName,
  label,
  onChange,
  onUpload,
  uploading,
  value,
}: {
  assets: VillageAsset[];
  fieldName: string;
  label: string;
  onChange: (value: string) => void;
  onUpload: (file: File, fieldName: string) => void;
  uploading: boolean;
  value: string;
}) {
  return (
    <div className="grid gap-3">
      <TextInput label={label} onChange={onChange} value={value} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-teal-700 hover:text-teal-700">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <FileImage size={16} />}
          이미지 업로드
          <input
            accept="image/*"
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file, fieldName);
              event.currentTarget.value = "";
            }}
            type="file"
          />
        </label>
        {assets.slice(0, 5).map((asset) => (
          <button
            className="h-10 max-w-[180px] truncate rounded-md border border-slate-200 px-3 text-xs font-black text-slate-600 hover:border-teal-700 hover:text-teal-700"
            key={asset.id}
            onClick={() => onChange(asset.url)}
            title={asset.fileName}
            type="button"
          >
            {asset.fileName}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
  busy,
  icon,
  label,
  onClick,
}: {
  busy: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? <Loader2 className="animate-spin" size={16} /> : icon}
      {label}
    </button>
  );
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-teal-700"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="mt-3 grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        className="min-h-28 rounded-md border border-slate-200 p-3 text-sm font-bold leading-6 outline-none focus:border-teal-700"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function normalizeSlides(value: unknown): CarouselSlide[] {
  if (!Array.isArray(value)) return [];

  const slides: CarouselSlide[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;

    const record = item as Record<string, unknown>;
    const slide = {
      body: asString(record.body),
      hashtags: asString(record.hashtags),
      href: asString(record.href),
      programSlug: asString(record.programSlug),
      title: asString(record.title),
    };

    if (slide.title || slide.body) {
      slides.push(slide);
    }
  }

  return slides;
}

function replaceSlide(
  slides: CarouselSlide[],
  index: number,
  patch: Partial<CarouselSlide>,
): CarouselSlide[] {
  return slides.map((slide, slideIndex) =>
    slideIndex === index ? { ...slide, ...patch } : slide,
  );
}

type AboutRow = {
  body: string;
  iconSrc: string;
  title: string;
};

function normalizeAboutRows(value: unknown): AboutRow[] {
  if (!Array.isArray(value)) return [];

  const rows: AboutRow[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;

    rows.push({
      body: asString(record.body),
      iconSrc: asString(record.iconSrc),
      title: asString(record.title),
    });
  }

  return rows;
}

function replaceAboutRow(
  rows: AboutRow[],
  index: number,
  patch: Partial<AboutRow>,
): AboutRow[] {
  return rows.map((row, rowIndex) =>
    rowIndex === index ? { ...row, ...patch } : row,
  );
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
