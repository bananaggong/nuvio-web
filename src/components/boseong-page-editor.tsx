"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ImageUp,
  Loader2,
  MoveDown,
  MoveUp,
  Plus,
  Save,
  Send,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BoseongFigmaAboutPage,
  BoseongFigmaHomePage,
  BoseongFigmaMediaIndexPage,
  BoseongFigmaNoticePage,
  BoseongFigmaProgramsPage,
  BoseongFigmaReviewsPage,
} from "@/components/boseong-figma-site";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import { buildVillageNotices } from "@/lib/village-template";
import type {
  PublishedVillagePageSection,
  VillagePageKey,
  VillagePageSectionDraft,
} from "@/lib/village-page-content";
import type { Village } from "@/lib/village-types";

type EditablePageKey = Extract<
  VillagePageKey,
  "home" | "about" | "media" | "programs" | "reviews" | "notice"
>;
type SectionsByPage = Record<EditablePageKey, VillagePageSectionDraft[]>;

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

type AboutRow = {
  body: string;
  iconSrc: string;
  title: string;
};

const previewCanvasWidth = 1440;

const editablePages: Array<{
  key: EditablePageKey;
  label: string;
  publicHref: string;
}> = [
  { key: "home", label: "홈", publicHref: "/boseong" },
  { key: "about", label: "소개", publicHref: "/boseong/about" },
  { key: "programs", label: "프로그램", publicHref: "/boseong/programs" },
  { key: "media", label: "미디어", publicHref: "/boseong/media" },
  { key: "reviews", label: "후기", publicHref: "/boseong/reviews" },
  { key: "notice", label: "소식", publicHref: "/boseong/notice" },
];

const defaultSectionKeyByPage: Record<EditablePageKey, string> = {
  about: "about_header",
  home: "home_hero",
  media: "media_index",
  notice: "notice_index",
  programs: "programs_index",
  reviews: "reviews_index",
};

const sectionLabels: Record<string, string> = {
  about_grid: "소개 본문",
  about_header: "소개 상단",
  home_hero: "홈 히어로",
  home_tea_time: "녹차밭에서 피어나는 시간",
  media_index: "전체차LAB 이야기",
  media_preview: "전체차LAB 이야기",
  notice_index: "전체차LAB 소식",
  original_carousel: "전체차 오리지널 자동전환",
  programs_index: "전체차LAB 오리지널",
  reviews_index: "전체차LAB 후기",
  reviews_preview: "전체차LAB 후기",
};

export function BoseongPageEditor({
  assets: initialAssets,
  initialPageKey = "home",
  media,
  programs,
  reviews,
  sectionsByPage: initialSectionsByPage,
  village,
}: {
  assets: VillageAsset[];
  initialPageKey?: EditablePageKey;
  media: VillageMediaContent[];
  programs: Program[];
  reviews: Review[];
  sectionsByPage: SectionsByPage;
  village: Village;
}) {
  const [sectionsByPage, setSectionsByPage] = useState(() =>
    normalizeSectionsByPage(initialSectionsByPage),
  );
  const [assets, setAssets] = useState(initialAssets);
  const [activePageKey, setActivePageKey] =
    useState<EditablePageKey>(initialPageKey);
  const [activeSectionKey, setActiveSectionKey] = useState(
    getInitialSectionKey(initialPageKey, initialSectionsByPage),
  );
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [message, setMessage] = useState(
    "수정할 공개 페이지와 섹션을 선택하세요.",
  );
  const villageSlug = village.slug;

  const activeSections = useMemo(
    () => sortSections(sectionsByPage[activePageKey] ?? []),
    [activePageKey, sectionsByPage],
  );
  const activeSection = useMemo(
    () =>
      activeSections.find((section) => section.sectionKey === activeSectionKey) ??
      activeSections[0],
    [activeSectionKey, activeSections],
  );
  const previewSections = useMemo(
    () => activeSections.map(mapDraftToPreviewSection),
    [activeSections],
  );
  const notices = useMemo(
    () => buildVillageNotices(village, programs),
    [programs, village],
  );
  const activePage = editablePages.find((page) => page.key === activePageKey) ?? editablePages[0];

  function switchPage(pageKey: EditablePageKey) {
    setActivePageKey(pageKey);
    setActiveSectionKey(getInitialSectionKey(pageKey, sectionsByPage));

    if (typeof window !== "undefined") {
      window.history.replaceState(
        null,
        "",
        `/host/villages/${village.slug}/editor?page=${pageKey}`,
      );
    }
  }

  function dirtyKey(pageKey: EditablePageKey, sectionKey: string) {
    return `${pageKey}:${sectionKey}`;
  }

  function markDirty(pageKey: EditablePageKey, sectionKey: string) {
    setDirtyKeys((current) => new Set(current).add(dirtyKey(pageKey, sectionKey)));
  }

  function updateSection(
    pageKey: EditablePageKey,
    sectionKey: string,
    patch: Partial<VillagePageSectionDraft>,
  ) {
    setSectionsByPage((current) => ({
      ...current,
      [pageKey]: (current[pageKey] ?? []).map((section) =>
        section.sectionKey === sectionKey
          ? { ...section, ...patch, updatedAt: new Date().toISOString() }
          : section,
      ),
    }));
    markDirty(pageKey, sectionKey);
  }

  function updateActiveContent(patch: Record<string, unknown>) {
    if (!activeSection) return;

    updateSection(activePageKey, activeSection.sectionKey, {
      draftContent: {
        ...activeSection.draftContent,
        ...patch,
      },
    });
  }

  function moveActiveSection(direction: "up" | "down") {
    if (!activeSection) return;

    const currentIndex = activeSections.findIndex(
      (section) => section.sectionKey === activeSection.sectionKey,
    );
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= activeSections.length) {
      return;
    }

    const nextOrdered = [...activeSections];
    [nextOrdered[currentIndex], nextOrdered[targetIndex]] = [
      nextOrdered[targetIndex],
      nextOrdered[currentIndex],
    ];
    const nextSections = nextOrdered.map((section, index) => ({
      ...section,
      orderIndex: (index + 1) * 10,
      updatedAt: new Date().toISOString(),
    }));

    setSectionsByPage((current) => ({
      ...current,
      [activePageKey]: nextSections,
    }));
    setDirtyKeys((current) => {
      const next = new Set(current);
      nextSections.forEach((section) => next.add(dirtyKey(activePageKey, section.sectionKey)));
      return next;
    });
    setMessage("노출 순서가 바뀌었습니다. 임시저장 후 발행하면 공개 페이지에 반영됩니다.");
  }

  async function saveDrafts() {
    const allSections = editablePages.flatMap((page) => sectionsByPage[page.key] ?? []);
    const targets = dirtyKeys.size
      ? allSections.filter((section) => dirtyKeys.has(dirtyKey(section.pageKey as EditablePageKey, section.sectionKey)))
      : activeSection
        ? [activeSection]
        : [];

    if (targets.length === 0) return;

    setSaving(true);
    setMessage("");

    try {
      const savedSections: VillagePageSectionDraft[] = [];

      for (const section of targets) {
        const response = await fetch("/api/host/village-pages/sections", {
          body: JSON.stringify(section),
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

        savedSections.push(payload.data);
      }

      replaceSections(savedSections);
      setDirtyKeys(new Set());
      setMessage("임시저장했습니다. 공개 페이지는 아직 바뀌지 않았습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "임시저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function publishPage() {
    if (activeSections.length === 0) return;

    setPublishing(true);
    setMessage("");

    try {
      const publishedSections: VillagePageSectionDraft[] = [];

      for (const section of activeSections) {
        const response = await fetch("/api/host/village-pages/sections/publish", {
          body: JSON.stringify(section),
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

        publishedSections.push(payload.data);
      }

      replaceSections(publishedSections);
      setDirtyKeys((current) => {
        const next = new Set(current);
        activeSections.forEach((section) =>
          next.delete(dirtyKey(activePageKey, section.sectionKey)),
        );
        return next;
      });
      setMessage(`${activePage.label} 페이지를 발행했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "발행에 실패했습니다.");
    } finally {
      setPublishing(false);
    }
  }

  function replaceSections(nextSections: VillagePageSectionDraft[]) {
    setSectionsByPage((current) => {
      const next = { ...current };

      for (const savedSection of nextSections) {
        const pageKey = savedSection.pageKey as EditablePageKey;
        next[pageKey] = sortSections(
          (next[pageKey] ?? []).map((section) =>
            section.sectionKey === savedSection.sectionKey ? savedSection : section,
          ),
        );
      }

      return next;
    });
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

  const renderFrame = ({
    children,
    label,
    sectionKey,
    visible,
  }: {
    children: React.ReactNode;
    label: string;
    sectionKey: string;
    visible: boolean;
  }) => (
    <EditorSectionFrame
      active={sectionKey === activeSection?.sectionKey}
      label={cleanLabel(label, sectionKey)}
      onSelect={() => setActiveSectionKey(sectionKey)}
      sectionKey={sectionKey}
      visible={visible}
    >
      {children}
    </EditorSectionFrame>
  );

  return (
    <div className="min-h-screen bg-[#111827] text-slate-950">
      <header className="sticky top-0 z-[90] border-b border-slate-800 bg-[#070b16]/95 px-4 py-3 text-white backdrop-blur md:px-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/15 text-white hover:bg-white/10"
              href={`/host/villages/${village.slug}`}
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-300">
                Local Home Editor
              </p>
              <h1 className="truncate text-lg font-black md:text-2xl">
                보성 공개 페이지 편집모드
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-black text-white hover:bg-white/10"
              href={toVillagePublicHref(activePage.publicHref, village.slug)}
              target="_blank"
            >
              <Eye size={16} />
              현재 공개 페이지
            </Link>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-black text-white hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
              disabled={saving}
              onClick={saveDrafts}
              type="button"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              임시저장
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-500 px-3 text-sm font-black text-[#061515] hover:bg-teal-300 disabled:cursor-wait disabled:opacity-60"
              disabled={publishing}
              onClick={publishPage}
              type="button"
            >
              {publishing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              {activePage.label} 발행
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {editablePages.map((page) => (
            <button
              className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-black ${
                page.key === activePageKey
                  ? "border-teal-300 bg-teal-300 text-[#061515]"
                  : "border-white/15 text-white hover:bg-white/10"
              }`}
              key={page.key}
              onClick={() => switchPage(page.key)}
              type="button"
            >
              {page.label}
            </button>
          ))}
        </div>

        {message ? (
          <p className="mt-3 flex items-center gap-2 rounded-md bg-white/8 px-3 py-2 text-sm font-bold text-white/88">
            <CheckCircle2 className="shrink-0 text-teal-300" size={16} />
            {message}
          </p>
        ) : null}
      </header>

      <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 bg-slate-200">
          <EditorPreviewViewport pageKey={activePageKey}>
            {activePageKey === "home" ? (
              <BoseongFigmaHomePage
                media={media}
                pageSections={previewSections}
                programs={programs}
                reviews={reviews}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
            {activePageKey === "about" ? (
              <BoseongFigmaAboutPage
                pageSections={previewSections}
                programs={programs}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
            {activePageKey === "programs" ? (
              <BoseongFigmaProgramsPage
                pageSections={previewSections}
                programs={programs}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
            {activePageKey === "media" ? (
              <BoseongFigmaMediaIndexPage
                media={media}
                pageSections={previewSections}
                programs={programs}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
            {activePageKey === "reviews" ? (
              <BoseongFigmaReviewsPage
                pageSections={previewSections}
                programs={programs}
                reviews={reviews}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
            {activePageKey === "notice" ? (
              <BoseongFigmaNoticePage
                notices={notices}
                pageSections={previewSections}
                programs={programs}
                sectionFrame={renderFrame}
                showHiddenSections
                village={village}
              />
            ) : null}
          </EditorPreviewViewport>
        </div>

        <aside className="border-l border-slate-800 bg-slate-50 lg:sticky lg:top-[118px] lg:h-[calc(100vh-118px)] lg:overflow-y-auto">
          <div className="border-b border-slate-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-black text-teal-700">
              <SlidersHorizontal size={16} />
              {activePage.label} 섹션 편집
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              화면 위 섹션을 클릭하거나 아래 목록에서 선택해서 수정합니다.
            </p>
          </div>

          <div className="space-y-3 p-4">
            {activeSections.map((section) => (
              <button
                className={`flex w-full items-center justify-between rounded-md border px-3 py-3 text-left text-sm font-black ${
                  section.sectionKey === activeSection?.sectionKey
                    ? "border-teal-600 bg-teal-50 text-teal-950"
                    : "border-slate-200 bg-white text-slate-700 hover:border-teal-600"
                }`}
                key={section.sectionKey}
                onClick={() => setActiveSectionKey(section.sectionKey)}
                type="button"
              >
                <span className="min-w-0 truncate">
                  {cleanLabel(section.label, section.sectionKey)}
                </span>
                <span className="ml-2 shrink-0 text-xs text-slate-400">
                  {dirtyKeys.has(dirtyKey(activePageKey, section.sectionKey))
                    ? "수정됨"
                    : section.visible
                      ? "노출"
                      : "숨김"}
                </span>
              </button>
            ))}
          </div>

          {activeSection ? (
            <div className="border-t border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Selected
                  </p>
                  <h2 className="truncate text-xl font-black text-slate-950">
                    {cleanLabel(activeSection.label, activeSection.sectionKey)}
                  </h2>
                </div>
                <div className="flex gap-1">
                  <IconButton
                    label="위로 이동"
                    onClick={() => moveActiveSection("up")}
                  >
                    <MoveUp size={16} />
                  </IconButton>
                  <IconButton
                    label="아래로 이동"
                    onClick={() => moveActiveSection("down")}
                  >
                    <MoveDown size={16} />
                  </IconButton>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                <TextInput
                  label="섹션 이름"
                  onChange={(value) =>
                    updateSection(activePageKey, activeSection.sectionKey, {
                      label: value,
                    })
                  }
                  value={activeSection.label}
                />
                <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-3 text-sm font-black text-slate-700">
                  <span className="flex items-center gap-2">
                    {activeSection.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    공개 페이지에 노출
                  </span>
                  <input
                    checked={activeSection.visible}
                    onChange={(event) =>
                      updateSection(activePageKey, activeSection.sectionKey, {
                        visible: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                </label>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <SectionContentFields
                  assets={assets}
                  section={activeSection}
                  uploadingField={uploadingField}
                  onContentChange={updateActiveContent}
                  onUploadImage={uploadImage}
                />
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function EditorPreviewViewport({
  children,
  pageKey,
}: {
  children: React.ReactNode;
  pageKey: EditablePageKey;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState({ height: 0, scale: 1 });

  useEffect(() => {
    const viewport = viewportRef.current;
    const canvas = canvasRef.current;
    if (!viewport || !canvas) return;

    let frameRequest = 0;
    const measure = () => {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = window.requestAnimationFrame(() => {
        const nextScale = Math.min(1, viewport.clientWidth / previewCanvasWidth);
        const nextHeight = Math.ceil(canvas.scrollHeight * nextScale);

        setFrame((current) =>
          Math.abs(current.scale - nextScale) < 0.001 &&
          Math.abs(current.height - nextHeight) < 1
            ? current
            : { height: nextHeight, scale: nextScale },
        );
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(canvas);

    const mutationObserver = new MutationObserver(measure);
    mutationObserver.observe(canvas, {
      attributes: true,
      childList: true,
      subtree: true,
    });

    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frameRequest);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pageKey]);

  return (
    <div
      className="min-w-0 overflow-x-hidden px-4 py-5 md:px-6"
      ref={viewportRef}
    >
      <div
        className="mx-auto overflow-hidden rounded-md border border-slate-300 bg-white shadow-2xl"
        style={{
          height: frame.height || undefined,
          maxWidth: previewCanvasWidth,
        }}
      >
        <div
          className="origin-top-left bg-white"
          ref={canvasRef}
          style={{
            transform: `scale(${frame.scale})`,
            transformOrigin: "top left",
            width: previewCanvasWidth,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function EditorSectionFrame({
  active,
  children,
  label,
  onSelect,
  sectionKey,
  visible,
}: {
  active: boolean;
  children: React.ReactNode;
  label: string;
  onSelect: () => void;
  sectionKey: string;
  visible: boolean;
}) {
  return (
    <div
      className={`group/editor relative ${visible ? "" : "opacity-45 grayscale"}`}
      data-editor-section={sectionKey}
      onClickCapture={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("[data-editor-control]")) return;

        event.preventDefault();
        event.stopPropagation();
        onSelect();
      }}
    >
      <div
        className={`pointer-events-none absolute inset-0 z-[60] transition ${
          active
            ? "ring-4 ring-inset ring-teal-400"
            : "ring-0 group-hover/editor:ring-2 group-hover/editor:ring-inset group-hover/editor:ring-teal-300"
        }`}
      />
      <button
        className={`absolute left-4 top-4 z-[70] inline-flex h-9 items-center rounded-md px-3 text-xs font-black shadow-lg ${
          active
            ? "bg-teal-400 text-[#061515]"
            : "bg-slate-950 text-white group-hover/editor:bg-teal-500 group-hover/editor:text-[#061515]"
        }`}
        data-editor-control
        onClick={onSelect}
        type="button"
      >
        {label}
      </button>
      {!visible ? (
        <span className="absolute right-4 top-4 z-[70] rounded-md bg-slate-950 px-3 py-2 text-xs font-black text-white">
          숨김
        </span>
      ) : null}
      {children}
    </div>
  );
}

function SectionContentFields({
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
      <div className="grid gap-4">
        <TextInput
          label="첫 문장"
          onChange={(value) => onContentChange({ kicker: value })}
          value={asString(content.kicker)}
        />
        <TextInput
          label="제목"
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
        {rows.map((row, index) => (
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4" key={`${row.title}-${index}`}>
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

  if (section.sectionType === "hero" || section.sectionType === "image_story") {
    return (
      <div className="grid gap-4">
        {section.sectionType === "image_story" ? (
          <>
            <TextInput
              label="제목"
              onChange={(value) => onContentChange({ title: value })}
              value={asString(content.title)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
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
          </>
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

  if (section.sectionType === "original_carousel") {
    const slides = normalizeSlides(content.slides);

    return (
      <div className="grid gap-4">
        <TextInput
          label="상단 영문 타이틀"
          onChange={(value) => onContentChange({ heading: value })}
          value={asString(content.heading)}
        />
        {slides.map((slide, index) => (
          <div
            className="rounded-md border border-slate-200 bg-slate-50 p-4"
            key={`${slide.title}-${index}`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-700">
                슬라이드 {index + 1}
              </p>
              <button
                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:border-red-300 hover:text-red-600"
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
            <TextInput
              label="제목"
              onChange={(value) =>
                onContentChange({ slides: replaceSlide(slides, index, { title: value }) })
              }
              value={slide.title}
            />
            <TextArea
              label="본문"
              onChange={(value) =>
                onContentChange({ slides: replaceSlide(slides, index, { body: value }) })
              }
              value={slide.body}
            />
            <TextInput
              label="해시태그"
              onChange={(value) =>
                onContentChange({
                  slides: replaceSlide(slides, index, { hashtags: value }),
                })
              }
              value={slide.hashtags}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput
                label="프로그램 slug"
                onChange={(value) =>
                  onContentChange({
                    slides: replaceSlide(slides, index, { programSlug: value }),
                  })
                }
                value={slide.programSlug ?? ""}
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
        <button
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-teal-600 hover:text-teal-700"
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
          슬라이드 추가
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <TextInput
        label="섹션 제목"
        onChange={(value) => onContentChange({ title: value })}
        value={asString(content.title)}
      />
      {hasSubtitleField(section.sectionKey) ? (
        <TextInput
          label="설명 문장"
          onChange={(value) => onContentChange({ subtitle: value })}
          value={asString(content.subtitle)}
        />
      ) : null}
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
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-teal-600 hover:text-teal-700">
          {uploading ? <Loader2 className="animate-spin" size={16} /> : <ImageUp size={16} />}
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
            className="h-10 max-w-[180px] truncate rounded-md border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:border-teal-600 hover:text-teal-700"
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

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:border-teal-600 hover:text-teal-700"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
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
        className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-teal-600"
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
        className="min-h-28 rounded-md border border-slate-200 p-3 text-sm font-bold leading-6 outline-none focus:border-teal-600"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function normalizeSectionsByPage(sectionsByPage: SectionsByPage): SectionsByPage {
  return {
    about: sortSections(sectionsByPage.about ?? []),
    home: sortSections(sectionsByPage.home ?? []),
    media: sortSections(sectionsByPage.media ?? []),
    notice: sortSections(sectionsByPage.notice ?? []),
    programs: sortSections(sectionsByPage.programs ?? []),
    reviews: sortSections(sectionsByPage.reviews ?? []),
  };
}

function getInitialSectionKey(
  pageKey: EditablePageKey,
  sectionsByPage: SectionsByPage,
) {
  return sectionsByPage[pageKey]?.[0]?.sectionKey ?? defaultSectionKeyByPage[pageKey];
}

function sortSections(sections: VillagePageSectionDraft[]) {
  return [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
}

function mapDraftToPreviewSection(
  section: VillagePageSectionDraft,
): PublishedVillagePageSection {
  return {
    id: section.id,
    villageSlug: section.villageSlug,
    pageKey: section.pageKey,
    sectionKey: section.sectionKey,
    sectionType: section.sectionType,
    label: section.label,
    content: section.draftContent,
    orderIndex: section.orderIndex,
    visible: section.visible,
    publishedAt: section.publishedAt,
  };
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

function hasSubtitleField(sectionKey: string) {
  return [
    "media_index",
    "notice_index",
    "programs_index",
    "reviews_index",
  ].includes(sectionKey);
}

function cleanLabel(label: string, sectionKey: string) {
  const fallback = sectionLabels[sectionKey] ?? sectionKey;
  return label && !/[\uFFFD\u00C2\u00BF]/.test(label) ? label : fallback;
}

function toVillagePublicHref(publicHref: string, slug: string) {
  return publicHref.replace(/^\/boseong/u, `/${slug}`);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
