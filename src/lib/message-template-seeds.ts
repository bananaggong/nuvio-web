import "server-only";

import type { HostMessageTemplateCatalogItem } from "@/lib/message-template-catalog";

export const defaultHostMessageTemplates: HostMessageTemplateCatalogItem[] = [
  {
    body: "{게스트명}님, {프로그램명} 신청을 해주셔서 감사합니다. 검토 후 결과를 안내드릴게요.",
    channel: "sms",
    description: "프로그램 신청시 자동 발송되는 메세지 입니다.",
    id: "msg-application-submitted",
    isDefault: true,
    key: "application_submitted",
    name: "신청 완료 템플릿",
    sortOrder: 10,
    trigger: "프로그램 신청시 자동 발송",
  },
  {
    body: "{게스트명}님, {프로그램명} 예약이 확정되었습니다.",
    channel: "sms",
    description: "프로그램 예약 확정시 자동 발송되는 메세지 입니다.",
    id: "msg-reservation-confirmed",
    isDefault: true,
    key: "reservation_confirmed",
    name: "예약 확정 템플릿",
    sortOrder: 20,
    trigger: "프로그램 예약 확정시 자동 발송",
  },
  {
    body: "{게스트명}님, 이번 {프로그램명}에 선정되셨습니다! 🎉",
    channel: "sms",
    description: "프로그램 선정된 게스트에게 버튼 발송되는 메세지 입니다.",
    id: "msg-application-accepted",
    isDefault: true,
    key: "application_accepted",
    name: "선정 안내 템플릿",
    sortOrder: 30,
    trigger: "선정 결과 버튼 발송",
  },
  {
    body: "{게스트명}님, 아쉽게도 이번 {프로그램명}에 선정되지 못하셨습니다.",
    channel: "sms",
    description: "프로그램 탈락된 게스트에게 버튼 발송되는 메세지 입니다.",
    id: "msg-application-rejected",
    isDefault: true,
    key: "application_rejected",
    name: "탈락 안내 템플릿",
    sortOrder: 40,
    trigger: "탈락 결과 버튼 발송",
  },
];
