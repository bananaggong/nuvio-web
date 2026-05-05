export type ApplicationFieldType = "text" | "textarea" | "select" | "checkbox";

export type ApplicationFormField = {
  id: string;
  label: string;
  type: ApplicationFieldType;
  required: boolean;
  helper?: string;
  options?: string[];
};

export type ApplicationFormTemplate = {
  id: string;
  name: string;
  description: string;
  programTitle: string;
  fields: ApplicationFormField[];
  updatedAt: string;
};

export const APPLICATION_FORM_TEMPLATE_STORAGE_KEY =
  "nuvio:application-form-templates";

export const seedApplicationFormTemplates: ApplicationFormTemplate[] = [
  {
    id: "form-workation-basic",
    name: "워케이션 기본 신청서",
    description: "원격근무 가능 여부와 체류 중 운영 지원을 확인합니다.",
    programTitle: "강릉 파도 워케이션 6월",
    updatedAt: "2026-05-04T00:00:00+09:00",
    fields: [
      {
        id: "field-motivation",
        label: "참여 동기",
        type: "textarea",
        required: true,
        helper: "프로그램에 참여하려는 이유를 확인합니다.",
      },
      {
        id: "field-work-style",
        label: "근무 형태",
        type: "select",
        required: true,
        options: ["재택근무", "프리랜서", "휴가 활용", "기타"],
      },
      {
        id: "field-receipt",
        label: "영수증 제출 가능 여부",
        type: "checkbox",
        required: true,
      },
    ],
  },
];

export function readApplicationFormTemplates(): ApplicationFormTemplate[] {
  if (typeof window === "undefined") return seedApplicationFormTemplates;

  try {
    const rawValue = window.localStorage.getItem(
      APPLICATION_FORM_TEMPLATE_STORAGE_KEY,
    );
    if (!rawValue) return seedApplicationFormTemplates;
    return JSON.parse(rawValue) as ApplicationFormTemplate[];
  } catch {
    return seedApplicationFormTemplates;
  }
}

export function writeApplicationFormTemplates(
  templates: ApplicationFormTemplate[],
) {
  window.localStorage.setItem(
    APPLICATION_FORM_TEMPLATE_STORAGE_KEY,
    JSON.stringify(templates),
  );
}

export function mergeApplicationFormTemplates(
  primaryTemplates: ApplicationFormTemplate[],
  secondaryTemplates: ApplicationFormTemplate[],
): ApplicationFormTemplate[] {
  const seen = new Set<string>();
  const mergedTemplates: ApplicationFormTemplate[] = [];

  for (const template of [...primaryTemplates, ...secondaryTemplates]) {
    const key = template.id || template.name;
    if (seen.has(key)) continue;

    seen.add(key);
    mergedTemplates.push(template);
  }

  return mergedTemplates;
}

export function createEmptyField(): ApplicationFormField {
  return {
    id: `field-${Date.now()}`,
    label: "새 질문",
    type: "text",
    required: false,
    helper: "",
    options: [],
  };
}

export function createEmptyTemplate(): ApplicationFormTemplate {
  return {
    id: `form-${Date.now()}`,
    name: "새 신청서",
    description: "호스트가 직접 구성한 신청서입니다.",
    programTitle: "프로그램명",
    fields: [createEmptyField()],
    updatedAt: new Date().toISOString(),
  };
}
