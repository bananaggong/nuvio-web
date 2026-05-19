"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { HomeHeroSlide } from "@/lib/home-hero-db";

type SaveState = "idle" | "saving" | "saved" | "error";

const emptySlide = {
  eyebrow: "추천",
  title: "새 홈 배너",
  subtitle: "홈 상단에서 보여줄 짧은 소개 문구를 입력하세요.",
  imageUrl:
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1600&q=82",
  href: "/",
  published: true,
};

export function AdminHomeHeroPanel() {
  const [slides, setSlides] = useState<HomeHeroSlide[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const selectedSlide = useMemo(
    () => slides.find((slide) => slide.id === selectedId) ?? slides[0],
    [selectedId, slides],
  );

  useEffect(() => {
    let alive = true;

    async function loadSlides() {
      try {
        const response = await fetch("/api/admin/home-hero", {
          credentials: "same-origin",
        });
        const payload = (await response.json()) as {
          data?: HomeHeroSlide[];
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "배너를 불러오지 못했습니다.");
        if (!alive) return;

        const nextSlides = normalizeOrder(payload.data ?? []);
        setSlides(nextSlides);
        setSelectedId(nextSlides[0]?.id ?? "");
      } catch (error) {
        if (!alive) return;
        setErrorMessage(
          error instanceof Error ? error.message : "배너를 불러오지 못했습니다.",
        );
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadSlides();

    return () => {
      alive = false;
    };
  }, []);

  function updateSelected(patch: Partial<HomeHeroSlide>) {
    if (!selectedSlide) return;
    setSaveState("idle");
    setSlides((current) =>
      current.map((slide) =>
        slide.id === selectedSlide.id ? { ...slide, ...patch } : slide,
      ),
    );
  }

  function addSlide() {
    const id = `hero-${Date.now()}`;
    const nextSlides = normalizeOrder([
      ...slides,
      {
        ...emptySlide,
        id,
        sortOrder: slides.length,
      },
    ]);
    setSlides(nextSlides);
    setSelectedId(id);
    setSaveState("idle");
  }

  function removeSelected() {
    if (!selectedSlide) return;
    const nextSlides = normalizeOrder(
      slides.filter((slide) => slide.id !== selectedSlide.id),
    );
    setSlides(nextSlides);
    setSelectedId(nextSlides[0]?.id ?? "");
    setSaveState("idle");
  }

  function moveSelected(direction: -1 | 1) {
    if (!selectedSlide) return;
    const currentIndex = slides.findIndex((slide) => slide.id === selectedSlide.id);
    const nextIndex = currentIndex + direction;
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= slides.length) return;

    const nextSlides = [...slides];
    const [movingSlide] = nextSlides.splice(currentIndex, 1);
    nextSlides.splice(nextIndex, 0, movingSlide);
    setSlides(normalizeOrder(nextSlides));
    setSaveState("idle");
  }

  async function saveSlides() {
    setSaveState("saving");
    setErrorMessage("");

    try {
      const response = await fetch("/api/admin/home-hero", {
        body: JSON.stringify({ slides: normalizeOrder(slides) }),
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: HomeHeroSlide[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "배너를 저장하지 못했습니다.");

      const nextSlides = normalizeOrder(payload.data ?? []);
      setSlides(nextSlides);
      setSelectedId((current) => current || nextSlides[0]?.id || "");
      setSaveState("saved");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "배너를 저장하지 못했습니다.",
      );
      setSaveState("error");
    }
  }

  return (
    <section className="rounded-md border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <ImageIcon className="text-[var(--primary)]" size={20} />
            홈 히어로 배너
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            메인 첫 화면의 슬라이드, 이동 링크, 공개 여부를 관리합니다.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 text-sm font-black text-white hover:bg-[var(--primary-strong)] disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={loading || saveState === "saving"}
          onClick={saveSlides}
          type="button"
        >
          {saveState === "saving" ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Save size={16} />
          )}
          저장
        </button>
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
          {errorMessage}
        </p>
      ) : null}
      {saveState === "saved" ? (
        <p className="mt-4 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
          홈 배너가 저장되었습니다.
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-md border border-slate-200">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-3">
            <p className="text-sm font-black text-slate-950">
              슬라이드 {slides.length}개
            </p>
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)]"
              onClick={addSlide}
              type="button"
            >
              <Plus size={15} />
              추가
            </button>
          </div>
          <div className="grid max-h-[420px] overflow-y-auto p-2">
            {loading ? (
              <div className="flex h-28 items-center justify-center text-sm font-bold text-slate-500">
                <Loader2 className="mr-2 animate-spin" size={16} />
                불러오는 중
              </div>
            ) : null}
            {!loading && slides.length === 0 ? (
              <button
                className="rounded-md border border-dashed border-slate-300 p-4 text-left text-sm font-bold text-slate-500"
                onClick={addSlide}
                type="button"
              >
                아직 배너가 없습니다. 새 배너를 추가하세요.
              </button>
            ) : null}
            {slides.map((slide, index) => (
              <button
                className={`rounded-md p-3 text-left transition ${
                  slide.id === selectedSlide?.id
                    ? "bg-teal-50 ring-1 ring-[var(--primary)]"
                    : "hover:bg-slate-50"
                }`}
                key={slide.id}
                onClick={() => setSelectedId(slide.id)}
                type="button"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-950">
                      {index + 1}. {slide.title}
                    </span>
                    <span className="mt-1 block truncate text-xs font-bold text-slate-500">
                      {slide.href}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-black ${
                      slide.published
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {slide.published ? "공개" : "비공개"}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {selectedSlide ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-black text-slate-700">
                상단 라벨
                <input
                  className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateSelected({ eyebrow: event.target.value })}
                  value={selectedSlide.eyebrow}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                제목
                <input
                  className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateSelected({ title: event.target.value })}
                  required
                  value={selectedSlide.title}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                설명
                <textarea
                  className="min-h-24 rounded-md border border-slate-200 p-3 font-semibold outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateSelected({ subtitle: event.target.value })}
                  required
                  value={selectedSlide.subtitle}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                이미지 URL
                <input
                  className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateSelected({ imageUrl: event.target.value })}
                  required
                  value={selectedSlide.imageUrl}
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-slate-700">
                클릭 이동 주소
                <input
                  className="h-11 rounded-md border border-slate-200 px-3 font-semibold outline-none focus:border-[var(--primary)]"
                  onChange={(event) => updateSelected({ href: event.target.value })}
                  placeholder="/programs/example"
                  required
                  value={selectedSlide.href}
                />
              </label>
              <label className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm font-black text-slate-700">
                <input
                  checked={selectedSlide.published}
                  className="size-4 accent-[var(--primary)]"
                  onChange={(event) =>
                    updateSelected({ published: event.target.checked })
                  }
                  type="checkbox"
                />
                공개 배너로 사용
              </label>
            </div>

            <div className="grid content-start gap-4">
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-md bg-slate-200"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,.36), rgba(0,0,0,.36)), url("${selectedSlide.imageUrl}")`,
                  backgroundPosition: "center",
                  backgroundSize: "cover",
                }}
              >
                <div className="absolute inset-x-5 top-5">
                  <p className="text-xs font-black text-[#FFB25F]">
                    {selectedSlide.eyebrow}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xl font-black leading-tight text-white">
                    {selectedSlide.title}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm font-bold leading-6 text-white/85">
                    {selectedSlide.subtitle}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
                  disabled={slides[0]?.id === selectedSlide.id}
                  onClick={() => moveSelected(-1)}
                  type="button"
                >
                  <ArrowUp size={14} />
                  위로
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 text-xs font-black text-slate-700 hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-40"
                  disabled={slides.at(-1)?.id === selectedSlide.id}
                  onClick={() => moveSelected(1)}
                  type="button"
                >
                  <ArrowDown size={14} />
                  아래
                </button>
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-rose-200 text-xs font-black text-rose-700 hover:bg-rose-50"
                  onClick={removeSelected}
                  type="button"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function normalizeOrder(slides: HomeHeroSlide[]): HomeHeroSlide[] {
  return slides.map((slide, index) => ({ ...slide, sortOrder: index }));
}
