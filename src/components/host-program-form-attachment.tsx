"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import {
  mergeApplicationFormTemplates,
  normalizeApplicationFormTemplateShape,
  readApplicationFormTemplates,
  type ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import {
  hostProgramId,
  hostProgramPath,
  hostStandaloneProgramPath,
} from "@/lib/host-projects";
import { launchFeatureFlags } from "@/lib/launch-feature-flags";
import { readHostProgramDrafts } from "@/lib/host-program-studio";

type HostProgramOption = {
  id: string;
  slug?: string;
  title: string;
};

const formFigmaScaleStyle = {
  "--form-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--form-3": "clamp(3px, 0.208vw, 4px)",
  "--form-4": "clamp(4px, 0.278vw, 5.333px)",
  "--form-6": "clamp(6px, 0.417vw, 8px)",
  "--form-8": "clamp(8px, 0.556vw, 10.667px)",
  "--form-12": "clamp(12px, 0.833vw, 16px)",
  "--form-16": "clamp(16px, 1.111vw, 21.333px)",
  "--form-18": "clamp(18px, 1.25vw, 24px)",
  "--form-20": "clamp(20px, 1.389vw, 26.667px)",
  "--form-22": "clamp(22px, 1.528vw, 29.333px)",
  "--form-24": "clamp(24px, 1.667vw, 32px)",
  "--form-28": "clamp(28px, 1.944vw, 37.333px)",
  "--form-29": "clamp(29px, 2.014vw, 38.667px)",
  "--form-32": "clamp(32px, 2.222vw, 42.667px)",
  "--form-34": "clamp(34px, 2.361vw, 45.333px)",
  "--form-40": "clamp(40px, 2.778vw, 53.333px)",
  "--form-44": "clamp(44px, 3.056vw, 58.667px)",
  "--form-58": "clamp(58px, 4.028vw, 77.333px)",
  "--form-65": "clamp(65px, 4.514vw, 86.667px)",
  "--form-69": "clamp(69px, 4.792vw, 92px)",
  "--form-77": "clamp(77px, 5.347vw, 102.667px)",
  "--form-79": "clamp(79px, 5.486vw, 105.333px)",
  "--form-88": "clamp(88px, 6.111vw, 117.333px)",
  "--form-92": "clamp(92px, 6.389vw, 122.667px)",
  "--form-99": "clamp(99px, 6.875vw, 132px)",
  "--form-119": "clamp(119px, 8.264vw, 158.667px)",
  "--form-157": "clamp(157px, 10.903vw, 209.333px)",
  "--form-167": "clamp(167px, 11.597vw, 222.667px)",
  "--form-180": "clamp(180px, 12.5vw, 240px)",
  "--form-192": "clamp(192px, 13.333vw, 256px)",
  "--form-216": "clamp(216px, 15vw, 288px)",
  "--form-228": "clamp(228px, 15.833vw, 304px)",
  "--form-296": "clamp(296px, 20.556vw, 394.667px)",
  "--form-327": "clamp(327px, 22.708vw, 436px)",
  "--form-358": "clamp(358px, 24.861vw, 477.333px)",
  "--form-389": "clamp(389px, 27.014vw, 518.667px)",
  "--form-420": "clamp(420px, 29.167vw, 560px)",
  "--form-438": "clamp(438px, 30.417vw, 584px)",
  "--form-441": "clamp(441px, 30.625vw, 588px)",
  "--form-562": "clamp(562px, 39.028vw, 749.333px)",
} as CSSProperties;

export function HostProgramFormAttachment({
  programId,
  projectId,
}: {
  programId: string;
  projectId?: string;
}) {
  const [templates, setTemplates] = useState<ApplicationFormTemplate[]>(
    readApplicationFormTemplates,
  );
  const [hostPrograms, setHostPrograms] = useState<HostProgramOption[]>(() =>
    readHostProgramDrafts().map((program) => ({
      id: program.id,
      slug: program.slug,
      title: program.title,
    })),
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const routeProgram = useMemo(() => {
    return hostPrograms.find((program) => {
      const identifiers = [program.id, program.slug ?? "", hostProgramId(program.title)];
      return identifiers.includes(programId);
    });
  }, [hostPrograms, programId]);
  const resolvedProgramId = routeProgram?.id ?? programId;
  const resolvedProgramTitle = routeProgram?.title ?? "";
  const linkedTemplate = useMemo(
    () =>
      templates.find((template) => template.programId === resolvedProgramId) ??
      templates.find(
        (template) =>
          resolvedProgramTitle &&
          normalizeText(template.programTitle) === normalizeText(resolvedProgramTitle),
      ),
    [resolvedProgramId, resolvedProgramTitle, templates],
  );
  const selectableTemplates = useMemo(
    () =>
      templates.filter((template) => template.id !== linkedTemplate?.id),
    [linkedTemplate?.id, templates],
  );
  const selectedTemplate =
    templates.find((template) => template.id === selectedTemplateId) ??
    selectableTemplates[0];
  const programBasePath =
    projectId && programId
      ? hostProgramPath(projectId, programId)
      : routeProgram
        ? hostStandaloneProgramPath(routeProgram.id)
        : hostStandaloneProgramPath(programId);
  const applicationsHref = `${programBasePath}/applications`;
  const messagesHref = `${programBasePath}/messages`;
  const formsLibraryHref = "/host/forms?kind=application";

  useEffect(() => {
    let isMounted = true;

    async function loadForms() {
      try {
        const response = await fetch("/api/host/forms?kind=application", {
          cache: "no-store",
        });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: ApplicationFormTemplate[];
        };
        const databaseTemplates = Array.isArray(payload.data)
          ? payload.data.map(normalizeApplicationFormTemplateShape)
          : [];
        if (!isMounted) return;

        setTemplates((currentTemplates) =>
          mergeApplicationFormTemplates(databaseTemplates, currentTemplates),
        );
      } catch {
        if (isMounted) setError("신청폼을 불러오지 못했습니다.");
      }
    }

    void loadForms();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadPrograms() {
      try {
        const response = await fetch("/api/host/programs", { cache: "no-store" });
        if (!response.ok) return;

        const payload = (await response.json()) as {
          data?: Array<Partial<HostProgramOption>>;
        };
        const programs = Array.isArray(payload.data)
          ? payload.data
              .map((item) => ({
                id: String(item.id ?? "").trim(),
                slug: item.slug?.trim() || undefined,
                title: String(item.title ?? "").trim(),
              }))
              .filter((item) => item.id && item.title)
          : [];

        if (isMounted) setHostPrograms(programs);
      } catch {
        if (isMounted) setError("프로그램 정보를 불러오지 못했습니다.");
      }
    }

    void loadPrograms();

    return () => {
      isMounted = false;
    };
  }, []);

  async function attachTemplate() {
    if (!selectedTemplate || isAttaching) return;

    setIsAttaching(true);
    setMessage("");
    setError("");

    try {
      const templateToAttach = normalizeApplicationFormTemplateShape({
        ...selectedTemplate,
        formKind: "application",
        programId: resolvedProgramId,
        programTitle: resolvedProgramTitle || selectedTemplate.programTitle,
      });
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(templateToAttach),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청폼을 연결하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          [savedTemplate],
          currentTemplates.filter((template) => template.id !== savedTemplate.id),
        ),
      );
      setSelectedTemplateId("");
      setMessage("신청폼을 가져왔습니다.");
    } catch (attachError) {
      setError(
        attachError instanceof Error
          ? attachError.message
          : "신청폼을 연결하지 못했습니다.",
      );
    } finally {
      setIsAttaching(false);
    }
  }

  async function detachTemplate() {
    if (!linkedTemplate || isAttaching) return;

    setIsAttaching(true);
    setMessage("");
    setError("");

    try {
      const detachedTemplate = normalizeApplicationFormTemplateShape({
        ...linkedTemplate,
        programId: "",
        programTitle: "",
      });
      const response = await fetch("/api/host/forms", {
        body: JSON.stringify(detachedTemplate),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as {
        data?: ApplicationFormTemplate;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "신청폼 연결을 해제하지 못했습니다.");
      }

      const savedTemplate = normalizeApplicationFormTemplateShape(payload.data);
      setTemplates((currentTemplates) =>
        mergeApplicationFormTemplates(
          [savedTemplate],
          currentTemplates.filter((template) => template.id !== savedTemplate.id),
        ),
      );
      setSelectedTemplateId(savedTemplate.id);
      setMessage("신청폼 연결을 해제했습니다.");
    } catch (detachError) {
      setError(
        detachError instanceof Error
          ? detachError.message
          : "신청폼 연결을 해제하지 못했습니다.",
      );
    } finally {
      setIsAttaching(false);
    }
  }

  return (
    <div
      className="font-pretendard min-h-[calc(100vh-4.861vw)] bg-white text-[#5B3A29]"
      style={formFigmaScaleStyle}
    >
      <div className="flex min-h-[calc(100vh-4.861vw)] max-md:flex-col">
        <ProgramFormSidebar
          activeItem="forms"
          applicationsHref={applicationsHref}
          formsHref={`${programBasePath}/forms`}
          messagesHref={messagesHref}
          programId={resolvedProgramId}
          programPath={programBasePath}
          status="프로그램 작성중"
          title={resolvedProgramTitle || "프로그램 제목"}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-[calc(100vh-4.861vw-var(--form-69))] flex-1 bg-white">
            <div className="w-[var(--form-562)] pl-[var(--form-40)] pt-[var(--form-44)]">
              <FormConnectionBlock
                action={
                  selectedTemplate ? (
                    <button
                      className="inline-flex h-[var(--form-29)] w-[var(--form-92)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isAttaching}
                      onClick={() => void attachTemplate()}
                      type="button"
                    >
                      {isAttaching && !linkedTemplate ? (
                        <Loader2 className="mr-1 size-3 animate-spin" />
                      ) : null}
                      폼 연결하기
                    </button>
                  ) : (
                    <Link
                      className="inline-flex h-[var(--form-29)] w-[var(--form-92)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E]"
                      href={formsLibraryHref}
                    >
                      폼 연결하기
                    </Link>
                  )
                }
                helper="신청폼이 연결되지 않으면 게스트가 신청할 수 없어요"
                title="신청폼 연결"
              />

              <FormConnectionBlock
                className="mt-[var(--form-32)]"
                helper="연결된 신청폼으로 게스트가 신청할 수 있어요"
                title="신청폼 연결"
              >
                <div className="relative h-[var(--form-34)]">
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[13px] size-[8px] rounded-full bg-[#7A8B52]"
                  />
                  <div className="absolute left-[var(--form-22)] top-0 flex h-[var(--form-34)] w-[var(--form-441)] items-center rounded-[3px] border border-[#6D7A8A] bg-white px-[var(--form-16)] text-[14px] font-semibold leading-[1.253] text-[#33241C]">
                    {linkedTemplate ? (
                      <>
                        <span className="min-w-0 flex-1 truncate">
                          {linkedTemplate.name || "신청서 제목"}
                        </span>
                        <span className="shrink-0">
                          작성일 {formatFormDate(linkedTemplate.updatedAt)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#AEB8C2]">
                        아직 연결된 신청폼이 없습니다
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-[var(--form-24)] flex h-[var(--form-29)] items-center gap-[var(--form-24)] pl-[var(--form-28)]">
                  {selectedTemplate ? (
                    <button
                      className="inline-flex h-[var(--form-29)] w-[var(--form-58)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={isAttaching}
                      onClick={() => void attachTemplate()}
                      type="button"
                    >
                      변경
                    </button>
                  ) : (
                    <Link
                      className="inline-flex h-[var(--form-29)] w-[var(--form-58)] items-center justify-center rounded-[4px] border border-[#FE701E] bg-white text-[12px] font-normal leading-[1.253] text-[#FE701E]"
                      href={formsLibraryHref}
                    >
                      변경
                    </Link>
                  )}
                  <button
                    className="inline-flex h-[var(--form-29)] w-[var(--form-79)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[12px] font-normal leading-[1.253] text-[#6D7A8A] disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!linkedTemplate || isAttaching}
                    onClick={() => void detachTemplate()}
                    type="button"
                  >
                    연결해제
                  </button>
                </div>
              </FormConnectionBlock>

              <select
                aria-label="연결할 신청폼 선택"
                className="sr-only"
                disabled={selectableTemplates.length === 0 || isAttaching}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                value={selectedTemplateId || selectableTemplates[0]?.id || ""}
              >
                {selectableTemplates.length === 0 ? (
                  <option value="">가져올 신청폼이 없습니다</option>
                ) : null}
                {selectableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p aria-live="polite" className="sr-only">
                {message || error}
              </p>
            </div>
          </main>

          <div className="flex h-[var(--form-69)] shrink-0 border-t border-[#6D7A8A] bg-white pl-[var(--form-28)] pt-[var(--form-20)]">
            <button
              className="inline-flex h-[var(--form-29)] w-[var(--form-79)] items-center justify-center rounded-[4px] bg-[#FE701E] text-[12px] font-medium leading-[1.253] text-[#FFF6EC]"
              type="button"
            >
              저장하기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProgramFormSidebar({
  activeItem,
  applicationsHref,
  formsHref,
  messagesHref,
  programId,
  programPath,
  status,
  title,
}: {
  activeItem: "forms";
  applicationsHref: string;
  formsHref: string;
  messagesHref: string;
  programId: string;
  programPath: string;
  status: string;
  title: string;
}) {
  return (
    <aside className="w-[var(--form-228)] shrink-0 border-r border-[#6D7A8A] bg-white shadow-[2px_5px_5.2px_rgba(0,0,0,0.23)] max-md:w-full">
      <div className="relative h-[calc(var(--form-438)+var(--form-77))] min-h-[515px]">
        <section className="absolute left-[var(--form-6)] top-0 h-[var(--form-65)] w-[var(--form-216)]">
          <div className="flex h-[33px] w-full items-end px-[var(--form-12)] pb-[1px]">
            <p className="min-w-0 flex-1 truncate text-[16px] font-semibold leading-[1.253] text-[#5B3A29]">
              {title}
            </p>
            <span className="shrink-0 rounded-[6px] bg-[#7A8B52] px-[6px] py-[3px] text-[12px] font-semibold leading-[1.253] text-[#F3F3F3]">
              {status}
            </span>
          </div>
          <div className="flex h-[28px] w-full items-start border-b border-[#D9D9D9] px-[var(--form-12)] pt-[2px]">
            <p className="text-[14px] font-semibold leading-[1.253] text-[#5B3A29]">
              프로그램 넘버 :{" "}
              <span className="text-[#FE701E]">{formatProgramNumber(programId)}</span>
            </p>
          </div>
        </section>

        <nav className="absolute left-[var(--form-6)] top-[var(--form-77)] h-[var(--form-438)] w-[var(--form-216)] text-[#5B3A29]">
          <section className="absolute left-[var(--form-12)] top-0 h-[var(--form-167)] w-[var(--form-192)]">
            <ProgramFormNavLink className="absolute left-0 top-0" href={`${programPath}?panel=dashboard`} label="대시보드" />
            <p className="absolute left-0 top-[24px] text-[14px] font-normal leading-[1.253]">
              프로그램 설정
            </p>
            <div className="absolute left-0 top-[48px] h-[119px] w-full border-b-[0.8px] border-[#6D7A8A]">
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-0"
                href={`${programPath}?panel=basic`}
                label="기본정보"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[22px]"
                href={`${programPath}?panel=detail`}
                label="상세정보"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[44px]"
                href={`${programPath}?panel=schedule`}
                label="일정안내"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[66px]"
                href={`${programPath}?panel=place`}
                label="장소안내"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[88px]"
                href={`${programPath}?panel=guide`}
                label="안내사항"
              />
            </div>
          </section>

          <section className="absolute left-[var(--form-12)] top-[var(--form-180)] h-[103px] w-[var(--form-192)]">
            <p className="absolute left-0 top-0 text-[14px] font-normal leading-[1.253]">
              신청폼 현황
            </p>
            <div className="absolute left-0 top-[24px] h-[79px] w-full border-b-[0.8px] border-[#6D7A8A]">
              <ProgramFormSubLink
                active={activeItem === "forms"}
                className="absolute left-[var(--form-6)] top-0"
                href={formsHref}
                label="신청폼 연결"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[26px]"
                href={applicationsHref}
                label="신청 관리"
              />
              <ProgramFormSubLink
                className="absolute left-[var(--form-6)] top-[48px]"
                href={messagesHref}
                label="결과 메세지 관리"
              />
            </div>
          </section>

          {launchFeatureFlags.coupons || launchFeatureFlags.promotions ? (
            <ProgramFormNavLink
              className="absolute left-[var(--form-12)] top-[var(--form-296)]"
              href={`${programPath}?panel=management`}
              label="쿠폰 / 프로모션"
            />
          ) : null}
          <ProgramFormNavLink
            className="absolute left-[var(--form-12)] top-[var(--form-327)]"
            href={messagesHref}
            label="메세지함"
          />
          <ProgramFormNavLink
            className="absolute left-[var(--form-12)] top-[var(--form-358)]"
            href={`${applicationsHref}?panel=receipts`}
            label="결제 관리"
          />
          {launchFeatureFlags.reviews ? (
            <ProgramFormNavLink
              className="absolute left-[var(--form-12)] top-[var(--form-389)]"
              href={`${applicationsHref}?panel=reviews`}
              label="후기 관리"
            />
          ) : null}
          <ProgramFormNavLink
            className="absolute left-[var(--form-12)] top-[var(--form-420)]"
            href={`${programPath}?panel=delete`}
            label="프로그램 삭제"
          />
        </nav>
      </div>
    </aside>
  );
}

function ProgramFormNavLink({
  className = "",
  href,
  label,
}: {
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`text-[14px] font-normal leading-[1.253] text-[#5B3A29] ${className}`}
      href={href}
    >
      {label}
    </Link>
  );
}

function ProgramFormSubLink({
  active = false,
  className = "",
  href,
  label,
}: {
  active?: boolean;
  className?: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className={`inline-flex h-[19px] w-fit items-center rounded-[4px] px-[5px] text-[12px] leading-[1.253] ${
        active
          ? "bg-[#FF9A3D] font-semibold text-[#F9F9F9]"
          : "font-normal text-[#5B3A29]"
      } ${className}`}
      href={href}
    >
      {label}
    </Link>
  );
}

function FormConnectionBlock({
  action,
  children,
  className = "",
  helper,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  helper: string;
  title: string;
}) {
  return (
    <section className={`w-[var(--form-562)] ${className}`}>
      <div className="h-[46px]">
        <h1 className="text-[16px] font-bold leading-[1.253] text-[#0D0D0C]">
          {title}
        </h1>
        <p className="mt-[8px] text-[14px] font-normal leading-[1.253] text-[#6D7A8A]">
          {helper}
        </p>
      </div>
      <div className="mt-[24px]">{children ?? action}</div>
    </section>
  );
}

function formatFormDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "0000/00/00";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function formatProgramNumber(programId: string): string {
  const normalizedId = programId.trim();
  if (!normalizedId) return "0000000000";

  return normalizedId.length > 12 ? normalizedId.slice(0, 12) : normalizedId;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, " ");
}
