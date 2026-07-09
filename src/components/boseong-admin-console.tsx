"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Database,
  FilePlus2,
  FileVideo2,
  Loader2,
  PencilLine,
  Search,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  boseongImportedReviews,
  boseongReviewImportSource,
} from "@/lib/boseong-review-seeds";
import { BoseongPageManager } from "@/components/boseong-page-manager";
import { HostSocialConnectionPanel } from "@/components/host-social-connection-panel";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { boseongMediaSeeds } from "@/lib/village-media-seeds";
import {
  createHostProgramGuideInfo,
  createHostProgramItineraryDay,
  createHostProgramPlaceInfo,
  type HostProgramDraft,
} from "@/lib/host-program-studio";
import type {
  ProgramStatus,
  ReviewCategory,
  VillageMediaCategory,
  VillageMediaProvider,
} from "@/lib/types";

type HostReviewDraft = {
  id: string;
  title: string;
  category: ReviewCategory;
  programLegacyId?: number;
  villageSlug?: string;
  author: string;
  excerpt: string;
  body: string;
  badge?: string;
  published: boolean;
  updatedAt: string;
};

type HostVillageMediaDraft = {
  id: string;
  villageSlug: string;
  title: string;
  category: VillageMediaCategory;
  provider: VillageMediaProvider;
  summary: string;
  body: string[];
  thumbnail: string;
  embedUrl?: string;
  sourceName: string;
  sourceUrl: string;
  date: string;
  featured: boolean;
  published: boolean;
  updatedAt: string;
};

const boseongPrograms = [
  { id: 1013, slug: "talent-for-stay", label: "숙재받" },
  { id: 1014, slug: "local-salon", label: "로컬살롱" },
  { id: 1015, slug: "tea-lab", label: "차실험실" },
] as const;

const programStatusLabels: Record<ProgramStatus, string> = {
  open: "모집중",
  upcoming: "예정",
  closed: "마감",
  earlyClosed: "조기마감",
};

const reviewCategoryLabels: Record<ReviewCategory, string> = {
  programTip: "프로그램 기록",
  selected: "선정 후기",
  rejected: "미선정 후기",
  trip: "참여 후기",
  free: "자유 후기",
  question: "질문",
};

const mediaCategoryLabels: Record<VillageMediaCategory, string> = {
  original: "자체 컨텐츠",
  broadcast: "방송출연",
  archive: "아카이브",
};

const mediaProviderLabels: Record<VillageMediaProvider, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  naver: "Naver",
  imweb: "Imweb",
  link: "링크",
  video: "영상",
};

export function BoseongAdminConsole() {
  const [programDraft, setProgramDraft] = useState<HostProgramDraft>(
    createBoseongProgramDraft,
  );
  const [reviewDraft, setReviewDraft] = useState<HostReviewDraft>(
    createBoseongReviewDraft,
  );
  const [mediaDraft, setMediaDraft] = useState<HostVillageMediaDraft>(
    createBoseongMediaDraft,
  );
  const [, setLocalReviews] = useState<HostReviewDraft[]>([]);
  const [localMedia, setLocalMedia] = useState<HostVillageMediaDraft[]>([]);
  const [keyword, setKeyword] = useState("");
  const [programFilter, setProgramFilter] = useState<"all" | string>("all");
  const [programSaving, setProgramSaving] = useState(false);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [mediaSaving, setMediaSaving] = useState(false);
  const [programMessage, setProgramMessage] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [mediaMessage, setMediaMessage] = useState("");

  const importedCounts = useMemo(
    () =>
      boseongPrograms.map((program) => ({
        ...program,
        count: boseongImportedReviews.filter(
          (review) => review.programId === program.id,
        ).length,
      })),
    [],
  );

  const filteredReviews = useMemo(() => {
    const normalized = keyword.trim().toLowerCase();
    return boseongImportedReviews.filter((review) => {
      const matchesProgram =
        programFilter === "all" ||
        String(review.programId ?? "community") === programFilter;
      const matchesKeyword =
        !normalized ||
        [review.title, review.author, review.excerpt, review.body, review.badge ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(normalized);

      return matchesProgram && matchesKeyword;
    });
  }, [keyword, programFilter]);

  async function saveProgramDraft() {
    setProgramSaving(true);
    setProgramMessage("");

    try {
      const response = await fetch("/api/host/programs", {
        body: JSON.stringify(programDraft),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: HostProgramDraft;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "프로그램 저장에 실패했습니다.");
      }
      setProgramDraft(payload.data);
      setProgramMessage("Supabase 프로그램 테이블에 저장했습니다.");
    } catch (error) {
      setProgramMessage(
        error instanceof Error
          ? error.message
          : "프로그램 저장에 실패했습니다.",
      );
    } finally {
      setProgramSaving(false);
    }
  }

  async function saveReviewDraft() {
    setReviewSaving(true);
    setReviewMessage("");

    const nextReview: HostReviewDraft = {
      ...reviewDraft,
      id: reviewDraft.id || `review-${Date.now()}`,
      author: maskKoreanName(reviewDraft.author || "익명"),
      excerpt: reviewDraft.excerpt || reviewDraft.body.slice(0, 120),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/host/reviews", {
        body: JSON.stringify(nextReview),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: HostReviewDraft;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "후기 DB 저장에 실패했습니다.");
      }
      const savedReview = payload.data;
      setReviewMessage("후기를 DB에 저장했습니다. 작성자명은 마스킹되어 저장됩니다.");
      setLocalReviews((current) => [savedReview, ...current]);
      setReviewDraft(createBoseongReviewDraft());
    } catch (error) {
      setReviewMessage(
        error instanceof Error
          ? `${error.message} 로컬 임시 목록에는 저장했습니다.`
          : "로컬 임시 목록에는 저장했습니다.",
      );
    } finally {
      setReviewSaving(false);
    }
  }

  async function saveMediaDraft() {
    setMediaSaving(true);
    setMediaMessage("");

    const nextMedia: HostVillageMediaDraft = {
      ...mediaDraft,
      id: mediaDraft.id || `media-${Date.now()}`,
      summary:
        mediaDraft.summary ||
        mediaDraft.body[0] ||
        "전체차LAB의 활동을 기록한 미디어 콘텐츠입니다.",
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/host/media", {
        body: JSON.stringify(nextMedia),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: HostVillageMediaDraft;
        error?: string;
      };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "미디어 DB 저장에 실패했습니다.");
      }
      const savedMedia = payload.data;
      setMediaMessage("미디어를 DB에 저장했습니다.");
      setLocalMedia((current) => [savedMedia, ...current]);
      setMediaDraft(createBoseongMediaDraft());
    } catch (error) {
      setMediaMessage(
        error instanceof Error
          ? `${error.message} 로컬 임시 목록에는 저장했습니다.`
          : "로컬 임시 목록에는 저장했습니다.",
      );
    } finally {
      setMediaSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-8">
      <section className="border border-slate-200 bg-white p-5 md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black text-teal-700">전체차LAB 운영</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              보성청년마을 관리자
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              프로그램과 미디어를 등록하고, 공개 보성 사이트에 반영될 데이터를
              확인합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/boseong" label="보성 사이트" />
            <LinkButton href="/boseong/programs" label="프로그램" />
            <LinkButton href="/boseong/media" label="미디어" />
            {launchFeatureFlags.reviews ? (
              <LinkButton href="/boseong/reviews" label="참여 후기" />
            ) : null}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric label="등록 프로그램" value="3개" />
        {launchFeatureFlags.reviews ? (
          <Metric label="DOCX 후기" value={`${boseongReviewImportSource.totalCount}건`} />
        ) : null}
        <Metric label="미디어" value={`${boseongMediaSeeds.length + localMedia.length}개`} />
        <Metric label="개인정보 처리" value="이름 마스킹" />
      </section>

      <HostSocialConnectionPanel villageSlug="boseong" />

      <BoseongPageManager />

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel icon={<FilePlus2 size={20} />} title="프로그램 업로드">
          <div className="grid gap-4">
            <TextInput
              label="프로그램명"
              onChange={(value) => updateProgramDraft(setProgramDraft, { title: value })}
              value={programDraft.title}
            />
            <TextArea
              label="요약"
              onChange={(value) => updateProgramDraft(setProgramDraft, { summary: value })}
              value={programDraft.summary}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="모집 시작"
                onChange={(value) =>
                  updateProgramDraft(setProgramDraft, { recruitStart: value })
                }
                type="date"
                value={programDraft.recruitStart}
              />
              <TextInput
                label="모집 마감"
                onChange={(value) =>
                  updateProgramDraft(setProgramDraft, { recruitEnd: value })
                }
                type="date"
                value={programDraft.recruitEnd}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput
                label="운영 시작"
                onChange={(value) =>
                  updateProgramDraft(setProgramDraft, { activityStart: value })
                }
                type="date"
                value={programDraft.activityStart}
              />
              <TextInput
                label="운영 종료"
                onChange={(value) =>
                  updateProgramDraft(setProgramDraft, { activityEnd: value })
                }
                type="date"
                value={programDraft.activityEnd}
              />
            </div>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">상태</span>
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) =>
                  updateProgramDraft(setProgramDraft, {
                    status: event.target.value as ProgramStatus,
                  })
                }
                value={programDraft.status}
              >
                {Object.entries(programStatusLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <TextArea
              label="상세 설명"
              onChange={(value) =>
                updateProgramDraft(setProgramDraft, { description: value })
              }
              value={programDraft.description}
            />
          </div>
          <ActionButton
            busy={programSaving}
            icon={<Database size={16} />}
            label="프로그램 저장"
            onClick={saveProgramDraft}
          />
          <StatusMessage message={programMessage} />
        </Panel>

        {launchFeatureFlags.reviews ? (
        <Panel icon={<PencilLine size={20} />} title="참여 후기 업로드">
          <div className="grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">연결 프로그램</span>
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) =>
                  updateReviewDraft(setReviewDraft, {
                    programLegacyId: Number(event.target.value),
                    badge:
                      boseongPrograms.find(
                        (program) => program.id === Number(event.target.value),
                      )?.label ?? "참여 후기",
                  })
                }
                value={reviewDraft.programLegacyId}
              >
                {boseongPrograms.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="작성자명"
              onChange={(value) =>
                updateReviewDraft(setReviewDraft, { author: maskKoreanName(value) })
              }
              placeholder="김*일 형식으로 저장"
              value={reviewDraft.author}
            />
            <TextInput
              label="제목"
              onChange={(value) => updateReviewDraft(setReviewDraft, { title: value })}
              value={reviewDraft.title}
            />
            <TextArea
              label="본문"
              onChange={(value) =>
                updateReviewDraft(setReviewDraft, {
                  body: maskNamesInText(value),
                  excerpt: maskNamesInText(value).slice(0, 120),
                })
              }
              value={reviewDraft.body}
            />
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">분류</span>
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) =>
                  updateReviewDraft(setReviewDraft, {
                    category: event.target.value as ReviewCategory,
                  })
                }
                value={reviewDraft.category}
              >
                {Object.entries(reviewCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ActionButton
            busy={reviewSaving}
            icon={<UploadCloud size={16} />}
            label="후기 저장"
            onClick={saveReviewDraft}
          />
          <StatusMessage message={reviewMessage} />
        </Panel>
        ) : null}

        <Panel icon={<FileVideo2 size={20} />} title="미디어 업로드">
          <div className="grid gap-4">
            <TextInput
              label="제목"
              onChange={(value) => updateMediaDraft(setMediaDraft, { title: value })}
              value={mediaDraft.title}
            />
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">분류</span>
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) =>
                  updateMediaDraft(setMediaDraft, {
                    category: event.target.value as VillageMediaCategory,
                  })
                }
                value={mediaDraft.category}
              >
                {Object.entries(mediaCategoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-black text-slate-700">플랫폼</span>
              <select
                className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) =>
                  updateMediaDraft(setMediaDraft, {
                    provider: event.target.value as VillageMediaProvider,
                  })
                }
                value={mediaDraft.provider}
              >
                {Object.entries(mediaProviderLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput
              label="게시일"
              onChange={(value) => updateMediaDraft(setMediaDraft, { date: value })}
              type="date"
              value={mediaDraft.date}
            />
            <TextInput
              label="썸네일 URL"
              onChange={(value) =>
                updateMediaDraft(setMediaDraft, { thumbnail: value })
              }
              value={mediaDraft.thumbnail}
            />
            <TextInput
              label="임베드 URL"
              onChange={(value) =>
                updateMediaDraft(setMediaDraft, { embedUrl: value })
              }
              placeholder="https://www.youtube.com/embed/..."
              value={mediaDraft.embedUrl ?? ""}
            />
            <TextInput
              label="원문 URL"
              onChange={(value) =>
                updateMediaDraft(setMediaDraft, { sourceUrl: value })
              }
              value={mediaDraft.sourceUrl}
            />
            <TextArea
              label="요약"
              onChange={(value) => updateMediaDraft(setMediaDraft, { summary: value })}
              value={mediaDraft.summary}
            />
            <TextArea
              label="본문"
              onChange={(value) =>
                updateMediaDraft(setMediaDraft, {
                  body: splitParagraphs(value),
                })
              }
              value={mediaDraft.body.join("\n\n")}
            />
            <label className="flex items-center gap-2 text-sm font-black text-slate-700">
              <input
                checked={mediaDraft.featured}
                onChange={(event) =>
                  updateMediaDraft(setMediaDraft, {
                    featured: event.target.checked,
                  })
                }
                type="checkbox"
              />
              대표 미디어로 표시
            </label>
          </div>
          <ActionButton
            busy={mediaSaving}
            icon={<UploadCloud size={16} />}
            label="미디어 저장"
            onClick={saveMediaDraft}
          />
          <StatusMessage message={mediaMessage} />
        </Panel>
      </section>

      {launchFeatureFlags.reviews ? (
      <section className="mt-6 border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">업로드된 참여 후기</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              DOCX에서 가져온 전체 후기입니다. 실명은 표시 전용 이름과 본문 서명에서
              가운데 글자를 가렸습니다.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[180px_minmax(220px,320px)]">
            <select
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-bold outline-none focus:border-teal-700"
              onChange={(event) => setProgramFilter(event.target.value)}
              value={programFilter}
            >
              <option value="all">전체</option>
              {boseongPrograms.map((program) => (
                <option key={program.id} value={String(program.id)}>
                  {program.label}
                </option>
              ))}
              <option value="community">주민·상인</option>
            </select>
            <label className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={17}
              />
              <input
                className="h-10 w-full rounded-md border border-slate-200 pl-9 pr-3 text-sm font-bold outline-none focus:border-teal-700"
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="후기 검색"
                value={keyword}
              />
            </label>
          </div>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {importedCounts.map((item) => (
            <div className="rounded-md bg-slate-50 p-3" key={item.id}>
              <p className="text-xs font-black text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{item.count}건</p>
            </div>
          ))}
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">주민·상인</p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {
                boseongImportedReviews.filter(
                  (review) => review.villageSlug === "boseong" && !review.programId,
                ).length
              }
              건
            </p>
          </div>
        </div>

        <div className="mt-5 max-h-[560px] overflow-auto border-y border-slate-200">
          {filteredReviews.map((review) => (
            <article
              className="grid gap-3 border-b border-slate-100 py-4 last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)_120px]"
              key={review.id}
            >
              <div>
                <p className="font-black text-slate-950">{review.author}</p>
                <p className="mt-1 text-xs font-bold text-teal-700">
                  {review.badge ?? "참여 후기"}
                </p>
              </div>
              <div>
                <Link
                  className="font-black text-slate-950 hover:text-teal-700"
                  href={`/boseong/reviews/${review.id}`}
                >
                  {review.title}
                </Link>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {review.excerpt}
                </p>
              </div>
              <Link
                className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-slate-200 px-3 text-xs font-black text-slate-700 hover:border-teal-700 hover:text-teal-700"
                href={`/boseong/reviews/${review.id}`}
              >
                보기
                <ArrowUpRight size={14} />
              </Link>
            </article>
          ))}
        </div>
      </section>
      ) : null}
    </main>
  );
}

function createBoseongProgramDraft(): HostProgramDraft {
  return {
    id: `boseong-program-${Date.now()}`,
    title: "전체차LAB 신규 프로그램",
    region: "전남",
    city: "보성군",
    summary: "차와 로컬을 매개로 청년이 보성에 머무는 프로그램입니다.",
    description:
      "운영 목적, 체류 방식, 제공 혜택, 모집 대상, 신청 절차를 입력합니다.",
    theme: "local",
    periodKey: "under4",
    recruitStart: new Date().toISOString().slice(0, 10),
    recruitEnd: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    activityStart: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
    activityEnd: new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10),
    target: "보성과 차 문화에 관심 있는 청년",
    capacity: "모집 인원 입력",
    subsidyLabel: "숙박 및 프로그램 운영 지원",
    subsidyAmount: 0,
    fee: "무료",
    status: "upcoming",
    sourceName: "전체차LAB",
    sourceUrl: "https://nuvio.kr/boseong",
    applyUrl: "https://nuvio.kr/boseong/programs",
    phone: "061-000-2026",
    contactEmail: "",
    hashtags: ["보성", "전체차LAB", "청년마을"],
    image:
      "https://upload.wikimedia.org/wikipedia/commons/b/b3/Boseong_Green_Tea_Field.jpg",
    detailImages: [],
    itineraryDays: [createHostProgramItineraryDay(1)],
    placeInfo: createHostProgramPlaceInfo(),
    guideInfo: createHostProgramGuideInfo(),
    published: false,
    updatedAt: new Date().toISOString(),
  };
}

function createBoseongReviewDraft(): HostReviewDraft {
  return {
    id: `boseong-review-${Date.now()}`,
    title: "참여 후기",
    category: "trip",
    programLegacyId: 1013,
    villageSlug: "boseong",
    author: "",
    excerpt: "",
    body: "",
    badge: "숙재받",
    published: true,
    updatedAt: new Date().toISOString(),
  };
}

function createBoseongMediaDraft(): HostVillageMediaDraft {
  return {
    id: `boseong-media-${Date.now()}`,
    villageSlug: "boseong",
    title: "전체차LAB 미디어",
    category: "original",
    provider: "youtube",
    summary: "전체차LAB의 활동을 기록한 미디어 콘텐츠입니다.",
    body: ["콘텐츠의 맥락, 등장 프로그램, 누비어 경험을 정리합니다."],
    thumbnail: "https://cdn.imweb.me/thumbnail/20251103/d38527c321388.jpg",
    embedUrl: "https://www.youtube.com/embed/WtNVWrDM4HE",
    sourceName: "전체차LAB",
    sourceUrl: "https://www.youtube.com/watch?v=WtNVWrDM4HE",
    date: new Date().toISOString().slice(0, 10),
    featured: false,
    published: true,
    updatedAt: new Date().toISOString(),
  };
}

function updateProgramDraft(
  setter: React.Dispatch<React.SetStateAction<HostProgramDraft>>,
  patch: Partial<HostProgramDraft>,
) {
  setter((draft) => ({ ...draft, ...patch, updatedAt: new Date().toISOString() }));
}

function updateReviewDraft(
  setter: React.Dispatch<React.SetStateAction<HostReviewDraft>>,
  patch: Partial<HostReviewDraft>,
) {
  setter((draft) => ({ ...draft, ...patch, updatedAt: new Date().toISOString() }));
}

function updateMediaDraft(
  setter: React.Dispatch<React.SetStateAction<HostVillageMediaDraft>>,
  patch: Partial<HostVillageMediaDraft>,
) {
  setter((draft) => ({ ...draft, ...patch, updatedAt: new Date().toISOString() }));
}

function maskKoreanName(value: string): string {
  return value.replace(/[가-힣]{2,4}/gu, (name) => {
    if (name.length === 2) return `${name[0]}*`;
    return `${name[0]}*${name[name.length - 1]}`;
  });
}

function maskNamesInText(value: string): string {
  return value.replace(/[가-힣]{2,4}/gu, (token) => {
    const nameLike =
      /^[김이박최정강조윤장임한오서신권황안송전홍유고문양손배백허남심노하곽성차주우구민진류엄채원천방공현함변염여추도석소선설마길주연예운][가-힣]{1,3}$/u.test(
        token,
      );
    return nameLike ? maskKoreanName(token) : token;
  });
}

function splitParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function Panel({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <section className="border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-xl font-black text-slate-950">
        <span className="text-teal-700">{icon}</span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        className="h-11 rounded-md border border-slate-200 px-3 text-sm font-bold outline-none focus:border-teal-700"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        className="min-h-28 rounded-md border border-slate-200 p-3 text-sm font-bold leading-6 outline-none focus:border-teal-700"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
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
      className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-wait disabled:opacity-70"
      disabled={busy}
      onClick={onClick}
      type="button"
    >
      {busy ? <Loader2 className="animate-spin" size={16} /> : icon}
      {label}
    </button>
  );
}

function StatusMessage({ message }: { message: string }) {
  if (!message) return null;

  return (
    <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
      <CheckCircle2 size={16} />
      {message}
    </p>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-black text-slate-700 hover:border-teal-700 hover:text-teal-700"
      href={href}
    >
      {label}
      <ArrowUpRight size={15} />
    </Link>
  );
}
