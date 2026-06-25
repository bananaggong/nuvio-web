export type HostMessageTemplateVariable = "guestName" | "programName";

export type HostMessageTemplateCatalogItem = {
  body: string;
  channel: "email" | "sms" | "kakao";
  description: string;
  id: string;
  isDefault: boolean;
  key: string;
  name: string;
  sortOrder: number;
  trigger: string;
};

export type HostMessageTemplatePart =
  | {
      kind: "text";
      value: string;
    }
  | {
      kind: "token";
      label: string;
      value: HostMessageTemplateVariable;
    };

export const messageTemplateVariables: Record<
  HostMessageTemplateVariable,
  { aliases: string[]; label: string }
> = {
  guestName: {
    aliases: ["{게스트명}", "{name}", "{guestName}"],
    label: "{게스트명}",
  },
  programName: {
    aliases: ["{프로그램명}", "{program}", "{programName}"],
    label: "{프로그램명}",
  },
};

const tokenAliasMap = new Map<string, HostMessageTemplateVariable>(
  Object.entries(messageTemplateVariables).flatMap(([key, value]) =>
    value.aliases.map((alias) => [alias, key as HostMessageTemplateVariable]),
  ),
);

const tokenPattern = /\{게스트명\}|\{프로그램명\}|\{name\}|\{program\}|\{guestName\}|\{programName\}/gu;

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

export function normalizeMessageTemplateTokens(body: string): string {
  return body.replace(tokenPattern, (token) => {
    const variable = tokenAliasMap.get(token);
    return variable ? messageTemplateVariables[variable].label : token;
  });
}

export function splitMessageTemplateParts(body: string): HostMessageTemplatePart[] {
  const normalizedBody = normalizeMessageTemplateTokens(body);
  const parts: HostMessageTemplatePart[] = [];
  let lastIndex = 0;

  for (const match of normalizedBody.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ kind: "text", value: normalizedBody.slice(lastIndex, index) });
    }

    const variable = tokenAliasMap.get(token);
    if (variable) {
      parts.push({
        kind: "token",
        label: messageTemplateVariables[variable].label,
        value: variable,
      });
    } else {
      parts.push({ kind: "text", value: token });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < normalizedBody.length) {
    parts.push({ kind: "text", value: normalizedBody.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ kind: "text", value: "" }];
}

export function joinMessageTemplateParts(parts: HostMessageTemplatePart[]): string {
  return parts
    .map((part) =>
      part.kind === "token"
        ? messageTemplateVariables[part.value].label
        : part.value,
    )
    .join("");
}

export function renderMessageTemplateTokens(
  body: string,
  values: Record<HostMessageTemplateVariable, string>,
): string {
  return body.replace(tokenPattern, (token) => {
    const variable = tokenAliasMap.get(token);
    return variable ? values[variable] : token;
  });
}
