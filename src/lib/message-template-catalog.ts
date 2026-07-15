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
