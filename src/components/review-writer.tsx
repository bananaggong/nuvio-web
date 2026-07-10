"use client";

import Image from "next/image";
import Link from "next/link";
import { Loader2, Send, Trash2 } from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type UploadedReviewImage = {
  contentType: string;
  fileName: string;
  size: number;
  storagePath?: string;
  url: string;
};

const maxReviewBodyLength = 3000;
const maxReviewImages = 6;

export function ReviewWriter({
  applicationId = "",
  requestToken = "",
}: {
  applicationId?: string;
  requestToken?: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState("trip");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<UploadedReviewImage[]>([]);

  const selectedPreview = images[0]?.url;
  const canSubmit =
    !isSubmitting &&
    !uploading &&
    rating > 0 &&
    title.trim().length >= 2 &&
    body.trim().length >= 10 &&
    body.length <= maxReviewBodyLength;
  const bodyCountLabel = useMemo(
    () => `${body.length.toLocaleString("ko-KR")}/${maxReviewBodyLength.toLocaleString("ko-KR")}`,
    [body.length],
  );

  useEffect(() => {
    const id = applicationId.trim();
    if (!isUuid(id)) return;

    const token = requestToken.trim();
    const controller = new AbortController();
    void fetch(token ? "/api/reviews/requests/open" : "/api/me/reviews/requests", {
      body: JSON.stringify(
        token ? { applicationId: id, requestToken: token } : { applicationId: id },
      ),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    }).catch(() => {
      // Opening telemetry should not block review writing.
    });

    return () => controller.abort();
  }, [applicationId, requestToken]);

  async function uploadImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const availableSlots = maxReviewImages - images.length;
    if (availableSlots <= 0) {
      setErrorMessage(`사진은 최대 ${maxReviewImages}장까지 올릴 수 있어요.`);
      return;
    }

    const files = selectedFiles.slice(0, availableSlots);
    setSubmitted(false);
    setErrorMessage("");
    setUploading(true);

    try {
      const uploadedImages: UploadedReviewImage[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        if (applicationId) formData.append("applicationId", applicationId);

        const response = await fetch("/api/me/review-images", {
          body: formData,
          method: "POST",
        });
        const result = (await response.json().catch(() => ({}))) as {
          data?: UploadedReviewImage;
          error?: string;
        };

        if (!response.ok || !result.data) {
          throw new Error(
            result.error ??
              "사진을 업로드하지 못했어요. 로그인 상태와 파일 형식을 확인해 주세요.",
          );
        }

        uploadedImages.push(result.data);
      }

      setImages((current) => [...current, ...uploadedImages].slice(0, maxReviewImages));
      if (selectedFiles.length > files.length) {
        setErrorMessage(`사진은 최대 ${maxReviewImages}장까지 올릴 수 있어요.`);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "사진 업로드 중 알 수 없는 문제가 생겼어요.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(false);
    setErrorMessage("");

    if (rating <= 0) {
      setErrorMessage("불꽃 평점을 선택해 주세요.");
      return;
    }
    if (title.trim().length < 2) {
      setErrorMessage("후기 제목을 2자 이상 입력해 주세요.");
      return;
    }
    if (body.trim().length < 10) {
      setErrorMessage("후기 내용을 10자 이상 입력해 주세요.");
      return;
    }
    if (body.length > maxReviewBodyLength) {
      setErrorMessage(`후기 내용은 ${maxReviewBodyLength.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/reviews", {
        body: JSON.stringify({
          applicationId,
          body: body.trim(),
          category,
          excerpt: createReviewExcerpt(body, title),
          images: images.map((image) => image.url),
          rating,
          requestToken: requestToken || undefined,
          title: title.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error ?? "후기를 저장하지 못했어요.");
      }

      setSubmitted(true);
      setRating(0);
      setCategory("trip");
      setTitle("");
      setBody("");
      setImages([]);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "알 수 없는 문제가 생겼어요. 다시 시도해 주세요.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FBFAF8] text-[#5B3A29]">
      <div className="mx-auto w-full max-w-[clamp(1025px,71.1806vw,1366.667px)] px-[clamp(30px,2.0833vw,40px)] py-[clamp(46px,3.1944vw,61.333px)]">
        <div className="mb-[clamp(22px,1.5278vw,29.333px)] flex items-center justify-between">
          <div>
            <p className="text-[clamp(12px,0.8333vw,16px)] font-semibold tracking-[0.08em] text-[#FE701E]">
              REVIEW
            </p>
            <h1 className="mt-[clamp(7px,0.4861vw,9.333px)] text-[clamp(28px,1.9444vw,37.333px)] font-semibold leading-[1.2]">
              여행 후기 작성
            </h1>
          </div>
          <Link
            className="inline-flex h-[clamp(40px,2.7778vw,53.333px)] items-center rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#E6DDD6] bg-white px-[clamp(18px,1.25vw,24px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold text-[#748190] transition hover:border-[#FE701E] hover:text-[#FE701E]"
            href="/mypage/reviews"
          >
            후기 목록
          </Link>
        </div>

        {submitted ? (
          <div className="mb-[clamp(16px,1.1111vw,21.333px)] rounded-[clamp(6px,0.4167vw,8px)] border border-[#A8D8C7] bg-[#EFFAF5] px-[clamp(18px,1.25vw,24px)] py-[clamp(13px,0.9028vw,17.333px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold text-[#2D7A5B]">
            후기가 접수되었어요. 검토 후 공개 여부가 결정됩니다.
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mb-[clamp(16px,1.1111vw,21.333px)] rounded-[clamp(6px,0.4167vw,8px)] border border-[#FFD0BB] bg-[#FFF4EE] px-[clamp(18px,1.25vw,24px)] py-[clamp(13px,0.9028vw,17.333px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold text-[#C24C1A]">
            {errorMessage}
          </div>
        ) : null}

        <form
          className="grid gap-[clamp(28px,1.9444vw,37.333px)] lg:grid-cols-[minmax(0,clamp(620px,43.0556vw,826.667px))_clamp(360px,25vw,480px)]"
          onSubmit={submit}
        >
          <section className="overflow-hidden rounded-[clamp(8px,0.5556vw,10.667px)] border border-[#E6DDD6] bg-white">
            <div className="grid min-h-[clamp(480px,33.3333vw,640px)] place-items-center bg-[#F5F3F0] px-[clamp(28px,1.9444vw,37.333px)] py-[clamp(34px,2.3611vw,45.333px)]">
              {selectedPreview ? (
                <div
                  className="h-[clamp(420px,29.1667vw,560px)] w-full max-w-[clamp(420px,29.1667vw,560px)] rounded-[clamp(4px,0.2778vw,5.333px)] bg-cover bg-center shadow-[0_16px_40px_rgba(91,58,41,0.12)]"
                  role="img"
                  style={{ backgroundImage: `url("${selectedPreview}")` }}
                />
              ) : (
                <button
                  className="grid h-[clamp(210px,14.5833vw,280px)] w-full max-w-[clamp(420px,29.1667vw,560px)] place-items-center rounded-[clamp(8px,0.5556vw,10.667px)] border border-dashed border-[#D9C8BD] bg-white text-center transition hover:border-[#FE701E] hover:bg-[#FFF7F1]"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <span>
                    <span className="mx-auto grid h-[clamp(54px,3.75vw,72px)] w-[clamp(54px,3.75vw,72px)] place-items-center rounded-full bg-[#FE701E]">
                      <Image
                        alt=""
                        height={28}
                        src={nuvioIcons.channelUpload}
                        width={28}
                      />
                    </span>
                    <span className="mt-[clamp(14px,0.9722vw,18.667px)] block text-[clamp(15px,1.0417vw,20px)] font-semibold">
                      여행의 장면을 올려주세요
                    </span>
                    <span className="mt-[clamp(6px,0.4167vw,8px)] block text-[clamp(12px,0.8333vw,16px)] font-medium text-[#748190]">
                      JPG, PNG, WebP, GIF · 최대 {maxReviewImages}장
                    </span>
                  </span>
                </button>
              )}
            </div>
            <div className="flex min-h-[clamp(126px,8.75vw,168px)] items-center gap-[clamp(12px,0.8333vw,16px)] overflow-x-auto px-[clamp(26px,1.8056vw,34.667px)] py-[clamp(18px,1.25vw,24px)]">
              <button
                className="grid h-[clamp(91px,6.3194vw,121.333px)] w-[clamp(91px,6.3194vw,121.333px)] shrink-0 place-items-center rounded-[clamp(6px,0.4167vw,8px)] border border-dashed border-[#D9C8BD] bg-[#FBFAF8] transition hover:border-[#FE701E] hover:bg-[#FFF7F1]"
                disabled={uploading || images.length >= maxReviewImages}
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                {uploading ? (
                  <Loader2 className="animate-spin text-[#FE701E]" size={22} />
                ) : (
                  <Image alt="사진 업로드" height={23} src={nuvioIcons.channelUploadMuted} width={23} />
                )}
              </button>
              {images.map((image, index) => (
                <div
                  className="group relative h-[clamp(91px,6.3194vw,121.333px)] w-[clamp(91px,6.3194vw,121.333px)] shrink-0 overflow-hidden rounded-[clamp(6px,0.4167vw,8px)] bg-cover bg-center"
                  key={image.storagePath ?? image.url}
                  style={{ backgroundImage: `url("${image.url}")` }}
                >
                  <button
                    aria-label={`${index + 1}번째 사진 삭제`}
                    className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-white/90 text-[#FE701E] opacity-0 shadow-sm transition group-hover:opacity-100"
                    onClick={() =>
                      setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }
                    type="button"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <input
                accept="image/gif,image/jpeg,image/png,image/webp"
                className="hidden"
                multiple
                onChange={uploadImages}
                ref={fileInputRef}
                type="file"
              />
            </div>
          </section>

          <section className="rounded-[clamp(8px,0.5556vw,10.667px)] border border-[#E6DDD6] bg-white px-[clamp(24px,1.6667vw,32px)] py-[clamp(24px,1.6667vw,32px)]">
            <div className="grid gap-[clamp(18px,1.25vw,24px)]">
              <label className="grid gap-[clamp(8px,0.5556vw,10.667px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold">
                후기 종류
                <select
                  className="h-[clamp(46px,3.1944vw,61.333px)] rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#D9C8BD] bg-white px-[clamp(14px,0.9722vw,18.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-medium text-[#5F6C7B] outline-none focus:border-[#FE701E]"
                  name="category"
                  onChange={(event) => setCategory(event.target.value)}
                  value={category}
                >
                  <option value="trip">참여 후기</option>
                  <option value="programTip">프로그램 팁</option>
                  <option value="selected">선정 후기</option>
                  <option value="rejected">미선정 후기</option>
                  <option value="free">자유 후기</option>
                  <option value="question">질문</option>
                </select>
              </label>

              <div className="grid gap-[clamp(8px,0.5556vw,10.667px)]">
                <p className="text-[clamp(13px,0.9028vw,17.333px)] font-semibold">
                  불꽃 평점
                </p>
                <div aria-label="후기 평점" className="flex items-center gap-[clamp(8px,0.5556vw,10.667px)]" role="radiogroup">
                  {[1, 2, 3, 4, 5].map((value) => {
                    const selected = rating >= value;
                    return (
                      <button
                        aria-checked={rating === value}
                        aria-label={`${value}점`}
                        className={`grid h-[clamp(38px,2.6389vw,50.667px)] w-[clamp(38px,2.6389vw,50.667px)] place-items-center rounded-full transition ${
                          selected
                            ? "bg-[#FE701E] shadow-[0_8px_18px_rgba(254,112,30,0.24)]"
                            : "bg-[#D8D2CB] hover:bg-[#FFB07F]"
                        }`}
                        key={value}
                        onClick={() => setRating(value)}
                        role="radio"
                        type="button"
                      >
                        <Image alt="" height={18} src={nuvioIcons.review} width={18} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="grid gap-[clamp(8px,0.5556vw,10.667px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold">
                제목
                <input
                  className="h-[clamp(46px,3.1944vw,61.333px)] rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#D9C8BD] bg-white px-[clamp(14px,0.9722vw,18.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-medium text-[#5B3A29] outline-none placeholder:text-[#C7BDB5] focus:border-[#FE701E]"
                  name="title"
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="여행을 한 문장으로 남겨주세요"
                  required
                  value={title}
                />
              </label>

              <label className="grid gap-[clamp(8px,0.5556vw,10.667px)] text-[clamp(13px,0.9028vw,17.333px)] font-semibold">
                내용
                <textarea
                  className="min-h-[clamp(248px,17.2222vw,330.667px)] resize-none rounded-[clamp(4px,0.2778vw,5.333px)] border border-[#D9C8BD] bg-white p-[clamp(14px,0.9722vw,18.667px)] text-[clamp(14px,0.9722vw,18.667px)] font-medium leading-[1.65] text-[#5B3A29] outline-none placeholder:text-[#C7BDB5] focus:border-[#FE701E]"
                  name="body"
                  onChange={(event) => setBody(event.target.value.slice(0, maxReviewBodyLength + 1))}
                  placeholder="좋았던 장면, 함께한 사람, 다음 참여자에게 전하고 싶은 팁을 적어주세요."
                  required
                  value={body}
                />
                <span
                  className={`text-right text-[clamp(11px,0.7639vw,14.667px)] font-medium ${
                    body.length > maxReviewBodyLength ? "text-[#C24C1A]" : "text-[#C7BDB5]"
                  }`}
                >
                  {bodyCountLabel}
                </span>
              </label>

              <button
                className="mt-[clamp(6px,0.4167vw,8px)] inline-flex h-[clamp(48px,3.3333vw,64px)] items-center justify-center gap-[clamp(8px,0.5556vw,10.667px)] rounded-[clamp(4px,0.2778vw,5.333px)] bg-[#FE701E] text-[clamp(14px,0.9722vw,18.667px)] font-semibold text-white transition hover:bg-[#E85F11] disabled:cursor-not-allowed disabled:bg-[#F6C6A8]"
                disabled={!canSubmit}
                type="submit"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                후기 접수하기
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

function createReviewExcerpt(body: string, title: string): string {
  const text = body.trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 180);
  return title.trim().slice(0, 180);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
