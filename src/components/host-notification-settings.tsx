"use client";

import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import {
  defaultHostMessageTemplates,
  joinMessageTemplateParts,
  messageTemplateVariables,
  normalizeMessageTemplateTokens,
  splitMessageTemplateParts,
  type HostMessageTemplateCatalogItem,
} from "@/lib/message-template-catalog";

type TemplateRecord = HostMessageTemplateCatalogItem & {
  createdAt?: string;
  persistedId?: string;
  updatedAt?: string;
};

type ToggleState = "off" | "on" | "ready";
type SaveState = "idle" | "saving" | "saved" | "error";

const channelToggles: Array<{ key: string; label: string; state: ToggleState }> = [
  { key: "browser", label: "브라우저 알람", state: "off" },
  { key: "email", label: "이메일 알람", state: "off" },
  { key: "push", label: "앱푸시 알람", state: "ready" },
];

const notificationToggles = [
  { key: "newApplication", label: "새 신청 접수" },
  { key: "newMessage", label: "새 메세지" },
  { key: "reservationCanceled", label: "예약 취소" },
  { key: "reviewCreated", label: "후기 등록" },
];

const storageKey = "nuvio-host-notification-settings";

export function HostNotificationSettingsContent() {
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const [channelStates, setChannelStates] = useState<Record<string, boolean>>(
    () => readStoredNotificationSettings().channels,
  );
  const [notificationStates, setNotificationStates] = useState<
    Record<string, boolean>
  >(() => readStoredNotificationSettings().notifications);
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [templates, setTemplates] = useState<TemplateRecord[]>(
    defaultHostMessageTemplates,
  );

  useEffect(() => {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        channels: channelStates,
        notifications: notificationStates,
      }),
    );
  }, [channelStates, notificationStates]);

  useEffect(() => {
    let isMounted = true;
    const timers = saveTimers.current;

    async function loadTemplates() {
      try {
        const response = await fetch("/api/host/message-templates", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => ({}))) as {
          data?: TemplateRecord[];
        };
        if (isMounted && response.ok && Array.isArray(payload.data)) {
          setTemplates(payload.data.map(normalizeTemplateRecord));
        }
      } catch {
        if (isMounted) setTemplates(defaultHostMessageTemplates);
      }
    }

    void loadTemplates();

    return () => {
      isMounted = false;
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  const orderedTemplates = useMemo(
    () =>
      [...templates].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "ko"),
      ),
    [templates],
  );

  function toggleChannel(key: string) {
    setChannelStates((current) => ({ ...current, [key]: !current[key] }));
  }

  function toggleNotification(key: string) {
    setNotificationStates((current) => ({ ...current, [key]: !current[key] }));
  }

  function updateTemplate(key: string, patch: Partial<TemplateRecord>) {
    let nextTemplate: TemplateRecord | undefined;
    setTemplates((currentTemplates) =>
      currentTemplates.map((template) => {
        if (template.key !== key) return template;
        nextTemplate = normalizeTemplateRecord({ ...template, ...patch });
        return nextTemplate;
      }),
    );

    if (nextTemplate) scheduleTemplateSave(nextTemplate);
  }

  function addTemplate() {
    const key = `custom_${Date.now().toString(36)}`;
    const nextTemplate: TemplateRecord = {
      body: "",
      channel: "sms",
      description: "",
      id: key,
      isDefault: false,
      key,
      name: "",
      sortOrder: 1000 + templates.length * 10,
      trigger: "",
    };

    setTemplates((currentTemplates) => [...currentTemplates, nextTemplate]);
    setEditingKeys((currentKeys) => new Set(currentKeys).add(key));
  }

  async function removeTemplate(template: TemplateRecord) {
    setTemplates((currentTemplates) =>
      currentTemplates.filter((item) => item.key !== template.key),
    );
    setEditingKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      nextKeys.delete(template.key);
      return nextKeys;
    });

    const id = template.persistedId || template.id;
    if (!isUuid(id) || template.isDefault) return;

    try {
      await fetch("/api/host/message-templates", {
        body: JSON.stringify({ id }),
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      });
    } catch {
      // Deleting a local custom draft should not block the UI.
    }
  }

  function scheduleTemplateSave(template: TemplateRecord) {
    const normalizedTemplate = normalizeTemplateRecord(template);
    if (!normalizedTemplate.name.trim() || !normalizedTemplate.body.trim()) return;

    const previousTimer = saveTimers.current.get(normalizedTemplate.key);
    if (previousTimer) clearTimeout(previousTimer);

    setSaveState("saving");
    saveTimers.current.set(
      normalizedTemplate.key,
      setTimeout(() => {
        void saveTemplate(normalizedTemplate);
      }, 550),
    );
  }

  async function saveTemplate(template: TemplateRecord) {
    try {
      const response = await fetch("/api/host/message-templates", {
        body: JSON.stringify(template),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        data?: TemplateRecord;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "메세지 템플릿을 저장하지 못했습니다.");
      }

      const savedTemplate = normalizeTemplateRecord(payload.data);
      setTemplates((currentTemplates) =>
        currentTemplates.map((item) =>
          item.key === savedTemplate.key ? savedTemplate : item,
        ),
      );
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <>
      <SettingsSubSection title="알람 수신 채널">
        {channelToggles.map((toggle) => (
          <ToggleLine
            key={toggle.key}
            label={toggle.label}
            onToggle={() => toggleChannel(toggle.key)}
            state={
              toggle.state === "ready"
                ? "ready"
                : channelStates[toggle.key]
                  ? "on"
                  : "off"
            }
          />
        ))}
      </SettingsSubSection>

      <SettingsSubSection title="알람 수신 항목">
        {notificationToggles.map((toggle) => (
          <ToggleLine
            key={toggle.key}
            label={toggle.label}
            onToggle={() => toggleNotification(toggle.key)}
            state={notificationStates[toggle.key] ? "on" : "off"}
          />
        ))}
      </SettingsSubSection>

      <div className="flex w-[var(--host-546)] max-w-full flex-col gap-[var(--host-14)]">
        <div className="flex items-end justify-between gap-[var(--host-12)]">
          <div>
            <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
              메세지 템플릿
            </h2>
            <p className="mt-[var(--host-14)] text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              발송될 메세지의 내용 수정이 가능해요.
            </p>
          </div>
          <SaveStatus state={saveState} />
        </div>
        <div className="flex w-[var(--host-427)] max-w-full flex-col gap-[var(--host-28)]">
          {orderedTemplates.map((template) => (
            <MessageTemplateCard
              editing={editingKeys.has(template.key) || !template.name}
              key={template.key}
              onEditToggle={() =>
                setEditingKeys((currentKeys) => {
                  const nextKeys = new Set(currentKeys);
                  if (nextKeys.has(template.key)) nextKeys.delete(template.key);
                  else nextKeys.add(template.key);
                  return nextKeys;
                })
              }
              onRemove={() => {
                void removeTemplate(template);
              }}
              onUpdate={(patch) => updateTemplate(template.key, patch)}
              template={template}
            />
          ))}
          <button
            className="flex w-fit items-center gap-[var(--host-4)] text-[var(--host-12)] font-normal leading-[1.253] text-[#FF9A3D]"
            onClick={addTemplate}
            type="button"
          >
            <span className="grid size-[var(--host-12)] place-items-center rounded-full bg-[#FF9A3D] text-[10px] font-semibold leading-none text-white">
              +
            </span>
            <span>템플릿 추가</span>
          </button>
        </div>
      </div>
    </>
  );
}

function SettingsSubSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <div className="flex w-[var(--host-547)] max-w-full flex-col gap-[var(--host-14)] border-b border-[#D9D9D9] pb-[var(--host-20)]">
      <h2 className="text-[var(--host-16)] font-medium leading-[1.253] text-[#0D0D0C]">
        {title}
      </h2>
      <div className="flex w-full flex-col gap-[var(--host-7)] px-[var(--host-10)]">
        {children}
      </div>
    </div>
  );
}

function ToggleLine({
  label,
  onToggle,
  state,
}: {
  label: string;
  onToggle: () => void;
  state: ToggleState;
}) {
  return (
    <div className="flex h-[var(--host-20)] w-[var(--host-281)] items-center gap-[var(--host-7)] text-[var(--host-12)] font-normal leading-[1.253] text-[#0D0D0C]">
      <span className="min-w-0 flex-1">{label}</span>
      {state === "ready" ? (
        <span>준비중</span>
      ) : (
        <button aria-pressed={state === "on"} onClick={onToggle} type="button">
          <Image
            alt=""
            aria-hidden
            className="h-[var(--host-20)] w-[var(--host-23)]"
            height={20}
            src={
              state === "on"
                ? nuvioIcons.formRequiredToggleOn
                : nuvioIcons.formRequiredToggleOff
            }
            width={23}
          />
        </button>
      )}
    </div>
  );
}

function MessageTemplateCard({
  editing,
  onEditToggle,
  onRemove,
  onUpdate,
  template,
}: {
  editing: boolean;
  onEditToggle: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<TemplateRecord>) => void;
  template: TemplateRecord;
}) {
  return (
    <article className="flex w-full flex-col items-start justify-center overflow-hidden rounded-[var(--host-7)] border border-[#F7B267] pb-[var(--host-6)]">
      <div className="flex w-full flex-col items-start justify-center rounded-t-[var(--host-7)] bg-[#F3F3F3] px-[var(--host-12)] py-[var(--host-8)]">
        <div className="flex w-full items-center gap-[var(--host-8)]">
          {editing ? (
            <input
              className="h-[var(--host-23)] min-w-0 flex-1 rounded-[4px] border border-[#CAC4BC] bg-white px-[var(--host-8)] text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C] outline-none focus:border-[#FE701E]"
              onChange={(event) => onUpdate({ name: event.target.value })}
              placeholder="신규 템플릿 제목"
              value={template.name}
            />
          ) : (
            <h3 className="min-w-0 flex-1 truncate text-[var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
              {template.name}
            </h3>
          )}
          <button
            aria-label={`${template.name || "템플릿"} 수정`}
            className="grid size-[var(--host-18)] shrink-0 place-items-center text-[#FE701E]"
            onClick={onEditToggle}
            type="button"
          >
            <Pencil
              aria-hidden
              className="size-[var(--host-13)]"
              strokeWidth={1.8}
            />
          </button>
          {!template.isDefault ? (
            <button
              aria-label={`${template.name || "템플릿"} 삭제`}
              className="grid size-[var(--host-18)] shrink-0 place-items-center text-[#6D7A8A] transition hover:text-[#FE701E]"
              onClick={onRemove}
              type="button"
            >
              <Trash2
                aria-hidden
                className="size-[var(--host-13)]"
                strokeWidth={1.8}
              />
            </button>
          ) : null}
        </div>
        {editing ? (
          <input
            className="mt-[var(--host-4)] h-[var(--host-21)] w-full rounded-[4px] border border-transparent bg-transparent text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A] outline-none focus:border-[#CAC4BC] focus:bg-white focus:px-[var(--host-6)]"
            onChange={(event) =>
              onUpdate({
                description: event.target.value,
                trigger: event.target.value,
              })
            }
            placeholder="메세지 사용에 대한 설명 작성"
            value={template.description}
          />
        ) : (
          <p className="mt-[var(--host-4)] text-[var(--host-12)] font-normal leading-[1.253] text-[#6D7A8A]">
            {template.description}
          </p>
        )}
      </div>
      <div className="w-full px-[var(--host-12)] py-[var(--host-8)] text-[var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        {editing ? (
          <TemplateBodyEditor
            onChange={(body) => onUpdate({ body })}
            value={template.body}
          />
        ) : (
          <TemplateTokenText body={template.body} />
        )}
      </div>
    </article>
  );
}

function TemplateBodyEditor({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  const parts = splitMessageTemplateParts(value);
  const hasToken = parts.some((part) => part.kind === "token");

  if (!hasToken) {
    return (
      <textarea
        className="h-[var(--host-52)] w-full resize-none rounded-[4px] border border-[#CAC4BC] bg-white px-[var(--host-8)] py-[var(--host-7)] text-[var(--host-12)] font-medium leading-[1.45] text-[#6D7A8A] outline-none focus:border-[#FE701E]"
        onChange={(event) =>
          onChange(normalizeMessageTemplateTokens(event.target.value))
        }
        placeholder="템플릿 메세지 내용 작성"
        value={value}
      />
    );
  }

  function updatePart(index: number, event: ChangeEvent<HTMLInputElement>) {
    const nextParts = parts.map((part, partIndex) =>
      partIndex === index && part.kind === "text"
        ? { ...part, value: event.target.value }
        : part,
    );
    onChange(joinMessageTemplateParts(nextParts));
  }

  return (
    <div className="flex min-h-[var(--host-34)] w-full flex-wrap items-center gap-[var(--host-3)] rounded-[4px] border border-[#CAC4BC] bg-white px-[var(--host-8)] py-[var(--host-7)]">
      {parts.map((part, index) =>
        part.kind === "token" ? (
          <span
            className="shrink-0 rounded-[3px] bg-[#FFF7F0] px-[var(--host-2)] text-[#FE701E]"
            key={`${part.kind}-${part.value}-${index}`}
          >
            {messageTemplateVariables[part.value].label}
          </span>
        ) : (
          <input
            className="h-[var(--host-18)] min-w-[var(--host-40)] flex-1 bg-transparent text-[#6D7A8A] outline-none"
            key={`${part.kind}-${index}`}
            onChange={(event) => updatePart(index, event)}
            placeholder={index === 0 ? "템플릿 메세지 내용 작성" : ""}
            value={part.value}
          />
        ),
      )}
    </div>
  );
}

function TemplateTokenText({ body }: { body: string }) {
  const parts = splitMessageTemplateParts(body);

  return (
    <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
      {parts.map((part, index) =>
        part.kind === "token" ? (
          <span className="text-[#FE701E]" key={`${part.value}-${index}`}>
            {messageTemplateVariables[part.value].label}
          </span>
        ) : (
          <span key={`text-${index}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;

  const label =
    state === "saving" ? "저장 중" : state === "saved" ? "저장됨" : "저장 실패";

  return (
    <span
      className={`shrink-0 text-[var(--host-11)] font-medium leading-[1.253] ${
        state === "error" ? "text-[#D94B3D]" : "text-[#6D7A8A]"
      }`}
    >
      {label}
    </span>
  );
}

function normalizeTemplateRecord(template: TemplateRecord): TemplateRecord {
  return {
    ...template,
    body: normalizeMessageTemplateTokens(template.body ?? ""),
    channel:
      template.channel === "email" ||
      template.channel === "kakao" ||
      template.channel === "sms"
        ? template.channel
        : "sms",
    description: template.description ?? template.trigger ?? "",
    id: template.id || template.persistedId || template.key,
    isDefault: Boolean(template.isDefault),
    key: template.key || template.id,
    name: template.name ?? "",
    sortOrder: Number.isFinite(Number(template.sortOrder))
      ? Number(template.sortOrder)
      : 1000,
    trigger: template.trigger ?? template.description ?? "",
  };
}

function readStoredNotificationSettings(): {
  channels: Record<string, boolean>;
  notifications: Record<string, boolean>;
} {
  if (typeof window === "undefined") {
    return { channels: {}, notifications: {} };
  }

  try {
    const rawSettings = window.localStorage.getItem(storageKey);
    if (!rawSettings) return { channels: {}, notifications: {} };
    const parsed = JSON.parse(rawSettings) as {
      channels?: Record<string, boolean>;
      notifications?: Record<string, boolean>;
    };

    return {
      channels: parsed.channels ?? {},
      notifications: parsed.notifications ?? {},
    };
  } catch {
    return { channels: {}, notifications: {} };
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/iu.test(
    value,
  );
}
