import "server-only";

import {
  normalizeApplicationFormTemplateShape,
  type ApplicationFormTemplate,
} from "@/lib/application-form-builder";
import { isDemoModeEnabled } from "@/lib/demo-mode";

export const seedApplicationFormTemplates: ApplicationFormTemplate[] = [
  normalizeApplicationFormTemplateShape({
    id: "form-basic-program-application",
    name: "기본 프로그램 신청폼",
    description: "참여 동기, 가능 일정, 개인정보 동의를 확인합니다.",
    formKind: "application",
    programId: "draft-gangneung-wave",
    programTitle: "",
    updatedAt: "2026-05-04T00:00:00+09:00",
    blocks: [
      {
        id: "block-title",
        label: "프로그램 신청",
        required: false,
        type: "title",
      },
      {
        id: "block-intro",
        body: "프로그램 호스트가 확인해야 하는 기본 정보를 작성해 주세요.",
        label: "안내",
        required: false,
        type: "description",
      },
      {
        id: "field-motivation",
        helper: "프로그램에 참여하려는 이유를 확인합니다.",
        label: "참여 동기",
        required: true,
        type: "longText",
      },
      {
        branches: [
          {
            id: "branch-experienced",
            targetBlockId: "field-receipt",
            value: "있음",
          },
        ],
        id: "field-related-experience",
        label: "관련 경험이 있나요?",
        options: ["있음", "없음"],
        required: true,
        type: "singleSelect",
      },
      {
        id: "field-receipt",
        label: "영수증 제출 가능 여부",
        required: true,
        type: "checkbox",
      },
    ],
  }),
];

export function readApplicationFormTemplates(): ApplicationFormTemplate[] {
  return isDemoModeEnabled() ? seedApplicationFormTemplates : [];
}
