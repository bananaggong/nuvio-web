"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import {
  applyChannelMenuItemsToSections,
  channelHomeLabel,
  channelMenuMeta,
  channelMenuTypeOptions,
  createChannelMenuItem,
  getChannelMenuItems,
  type ChannelMenuItem,
} from "@/lib/channel-menu";
import { selectHostChannel } from "@/lib/host-channel-selection";
import { villagePath } from "@/lib/village-routing";
import type { Village } from "@/lib/village-types";

type HostChannelPayload = {
  data?: Village[];
};

type SaveChannelPayload = {
  data?: Village;
  error?: string;
};

type SelectableMenuKind = (typeof channelMenuTypeOptions)[number]["kind"];

function createChannelMenuSignature(items: ChannelMenuItem[]) {
  return JSON.stringify(
    items.map((item) => ({
      description: item.description,
      id: item.id,
      kind: item.kind,
      label: item.label,
      locked: item.locked,
      order: item.order,
      visible: item.visible,
    })),
  );
}

export function HostChannelMenuSettings() {
  const searchParams = useSearchParams();
  const requestedChannelSlug = searchParams.get("channel");
  const [channel, setChannel] = useState<Village | null>(null);
  const [items, setItems] = useState<ChannelMenuItem[]>(() =>
    getChannelMenuItems(null, { includeFree: true }),
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedKind, setSelectedKind] = useState<SelectableMenuKind>("gallery");
  const [statusMessage, setStatusMessage] = useState("");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [typeDialogMode, setTypeDialogMode] = useState<"create" | "update">("create");
  const [typeDialogTargetId, setTypeDialogTargetId] = useState<string | null>(null);
  const currentMenuSignature = useMemo(() => createChannelMenuSignature(items), [items]);
  const [savedMenuSignature, setSavedMenuSignature] = useState(currentMenuSignature);
  const hasUnsavedMenuChanges =
    Boolean(channel) &&
    !isLoading &&
    !isSaving &&
    currentMenuSignature !== savedMenuSignature;

  useEffect(() => {
    let active = true;

    async function loadChannel() {
      setIsLoading(true);
      const response = await fetch("/api/host/channels", { cache: "no-store" }).catch(
        () => null,
      );
      if (!active) return;

      if (!response?.ok) {
        const fallbackItems = getChannelMenuItems(null, { includeFree: true });
        setChannel(null);
        setItems(fallbackItems);
        setSavedMenuSignature(createChannelMenuSignature(fallbackItems));
        setIsLoading(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as HostChannelPayload;
      const selectedChannel = selectHostChannel(payload.data, requestedChannelSlug);
      const loadedItems = getChannelMenuItems(selectedChannel, { includeFree: true });

      setChannel(selectedChannel);
      setItems(loadedItems);
      setSavedMenuSignature(createChannelMenuSignature(loadedItems));
      setIsLoading(false);
    }

    void loadChannel();

    return () => {
      active = false;
    };
  }, [requestedChannelSlug]);

  const previewItems = useMemo(
    () => [
      { id: "channel-home", label: channelHomeLabel },
      ...items.filter((item) => item.visible).map((item) => ({
        id: item.id,
        label: item.label || channelMenuMeta[item.kind].defaultLabel,
      })),
    ],
    [items],
  );

  const channelName = channel?.name?.trim() || "채널 설정이 필요합니다";
  const channelRegion = [channel?.region, channel?.city].filter(Boolean).join(" / ");
  const channelSummary =
    channel?.tagline?.trim() ||
    channel?.summary?.trim() ||
    "채널 설정에서 이름, 지역, 소개를 입력해 주세요";
  const publicHref = channel?.slug ? villagePath(channel.slug) : "";
  const publicLinkEnabled = Boolean(channel?.published && publicHref);

  function updateItem(id: string, patch: Partial<ChannelMenuItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setStatusMessage("");
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id || item.locked));
    setStatusMessage("");
  }

  function openCreateTypeDialog() {
    setSelectedKind("gallery");
    setTypeDialogMode("create");
    setTypeDialogTargetId(null);
    setTypeDialogOpen(true);
  }

  function openUpdateTypeDialog(item: ChannelMenuItem) {
    if (item.locked) return;

    setSelectedKind(
      item.kind === "program" ? "gallery" : (item.kind as SelectableMenuKind),
    );
    setTypeDialogMode("update");
    setTypeDialogTargetId(item.id);
    setTypeDialogOpen(true);
  }

  function applySelectedMenuType() {
    if (typeDialogMode === "update" && typeDialogTargetId) {
      setItems((current) =>
        current.map((item) => {
          if (item.id !== typeDialogTargetId || item.locked) return item;

          const previousMeta = channelMenuMeta[item.kind];
          const nextMeta = channelMenuMeta[selectedKind];
          const shouldReplaceLabel =
            !item.label.trim() || item.label.trim() === previousMeta.defaultLabel;
          const shouldReplaceDescription =
            !item.description.trim() ||
            item.description.trim() === previousMeta.defaultDescription;

          return {
            ...item,
            description: shouldReplaceDescription
              ? nextMeta.defaultDescription
              : item.description,
            kind: selectedKind,
            label: shouldReplaceLabel ? nextMeta.defaultLabel : item.label,
            locked: false,
          };
        }),
      );
      setTypeDialogOpen(false);
      setTypeDialogTargetId(null);
      setStatusMessage("");
      return;
    }

    const nextItem = createChannelMenuItem(selectedKind);
    setItems((current) => [...current, { ...nextItem, order: current.length }]);
    setTypeDialogOpen(false);
    setTypeDialogTargetId(null);
    setStatusMessage("");
  }

  function reorderItems(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setItems((current) => {
      const sourceIndex = current.findIndex((item) => item.id === sourceId);
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);

      return next.map((item, index) => ({ ...item, order: index }));
    });
    setStatusMessage("");
  }

  async function saveMenu() {
    if (!channel || isSaving) return;

    setIsSaving(true);
    setStatusMessage("");

    const nextChannel: Village = {
      ...channel,
      sections: applyChannelMenuItemsToSections(channel.sections, items),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/host/channels", {
        body: JSON.stringify(nextChannel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SaveChannelPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "메뉴 설정을 저장하지 못했습니다.");
      }

      setChannel(payload.data);
      const savedItems = getChannelMenuItems(payload.data, { includeFree: true });
      setItems(savedItems);
      setSavedMenuSignature(createChannelMenuSignature(savedItems));
      setStatusMessage("저장되었습니다.");
      window.dispatchEvent(new CustomEvent("nuvio-channel-menu-updated"));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "메뉴 설정을 저장하지 못했습니다.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1086)]">
      <UnsavedChangesGuard when={hasUnsavedMenuChanges} />
      <section className="min-w-0 flex-1 overflow-x-hidden">
        <div className="w-full max-w-[var(--host-1230)] max-md:w-full">
          <section className="relative h-[var(--host-156)] border-b border-[#6D7A8A] bg-white">
            <div className="flex items-start gap-[var(--host-42)] px-[var(--host-58)] pt-[var(--host-14)] max-md:px-5">
              <div className="relative size-[var(--host-128)] shrink-0 overflow-hidden rounded-full bg-[#D9D9D9]">
                {channel?.profileImage ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="(min-width: 1920px) 171px, 128px"
                    src={channel.profileImage}
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[length:var(--host-24)] font-semibold leading-[1] text-[#6D7A8A]">
                    {(channelName || channel?.logoText || "N").slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-end gap-[var(--host-10)] pt-[var(--host-3)]">
                  <h1 className="text-[length:var(--host-24)] font-medium leading-[1.253] text-[#0D0D0C]">
                    {channelName}
                  </h1>
                  <span className="pb-[var(--host-2)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                    {channelRegion}
                  </span>
                </div>
                <p className="mt-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                  {channelSummary}
                </p>
                {publicLinkEnabled ? (
                  <Link
                    className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:text-[#FE701E]"
                    href={publicHref}
                    target="_blank"
                  >
                    <Image alt="" height={16} src={nuvioIcons.channelLink} width={16} />
                    공개 채널 보기
                  </Link>
                ) : (
                  <p className="mt-[var(--host-10)] inline-flex items-center gap-[var(--host-8)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#AEB8C2]">
                    <Image alt="" height={16} src={nuvioIcons.channelLink} width={16} />
                    채널 활성화 후 공개 링크가 표시됩니다
                  </p>
                )}
              </div>
            </div>
            <nav className="absolute left-[var(--host-228)] top-[var(--host-128)] flex items-end gap-[var(--host-40-7)] overflow-hidden text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29] max-md:static max-md:ml-5 max-md:mt-4 max-md:overflow-x-auto">
              {previewItems.slice(0, 7).map((item, index) => (
                <span
                  className={`relative shrink-0 pb-[var(--host-8)] ${
                    index === 0 ? "text-[#5B3A29]" : ""
                  }`}
                  key={item.id}
                >
                  {item.label}
                  {index === 0 ? (
                    <span className="absolute bottom-0 left-0 h-[var(--host-2)] w-full bg-[#FE701E]" />
                  ) : null}
                </span>
              ))}
            </nav>
          </section>

          <section className="h-[var(--host-129)] px-[var(--host-58)] pt-[var(--host-48)] max-md:px-5">
            <h2 className="text-[length:var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A]">
              메뉴 설정
            </h2>
            <p className="mt-[var(--host-12)] text-[length:var(--host-16)] font-normal leading-[1.6] text-[#6D7A8A]">
              채널 네비게이션에 표시되는 메뉴를 관리해요
            </p>
            <p className="mt-[var(--host-6)] text-[length:var(--host-16)] font-normal leading-[1.6] text-[#6D7A8A]">
              모든 메뉴 이름은 자유롭게 변경할 수 있어요
            </p>
          </section>

          <section className="px-[var(--host-58)] pt-[var(--host-30)] max-md:px-5">
            <ChannelHomeMenuRow />
            {items.map((item, index) => (
              <ChannelMenuRow
                draggingId={draggingId}
                item={item}
                key={item.id}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(targetId) => {
                  if (draggingId) reorderItems(draggingId, targetId);
                }}
                onDragStart={() => setDraggingId(item.id)}
                onRemove={() => removeItem(item.id)}
                onSelectType={() => openUpdateTypeDialog(item)}
                onUpdate={(patch) => updateItem(item.id, patch)}
                rowIndex={index + 1}
              />
            ))}
          </section>

          <div className="flex h-[var(--host-95)] flex-col items-center justify-start pt-[var(--host-24)]">
            <span className="text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              메뉴 추가
            </span>
            <button
              aria-label="메뉴 추가"
              className="mt-[var(--host-5)] grid size-[var(--host-28)] place-items-center transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isLoading || !channel}
              onClick={openCreateTypeDialog}
              type="button"
            >
              <Image alt="" height={24} src={nuvioIcons.channelAddCircle} width={24} />
            </button>
          </div>

          <div className="flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-18)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || isSaving || !channel}
              onClick={saveMenu}
              type="button"
            >
              저장
            </button>
            {statusMessage ? (
              <span className="ml-[var(--host-12)] text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A]">
                {statusMessage}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {typeDialogOpen ? (
        <SelectMenuTypeDialog
          onClose={() => setTypeDialogOpen(false)}
          mode={typeDialogMode}
          onConfirm={applySelectedMenuType}
          onSelect={setSelectedKind}
          selectedKind={selectedKind}
        />
      ) : null}
    </HostWorkspaceLayout>
  );
}

function ChannelHomeMenuRow() {
  return (
    <div className="relative h-[var(--host-68)] w-full border-b border-[#CAC4BC]">
      <label
        className="absolute grid gap-[var(--host-6)]"
        style={{
          left: "var(--host-10)",
          top: 0,
          width: "var(--host-507)",
        }}
      >
        <input
          aria-label="채널 홈 메뉴 이름"
          className="h-[var(--host-34)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-14)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none"
          readOnly
          value={channelHomeLabel}
        />
        <span className="pl-[var(--host-8)] text-[length:var(--host-14)] font-normal leading-[1.253] text-[#CAC4BC]">
          채널 메인 화면, 메뉴 위치 이동은 불가능해요
        </span>
      </label>
      <span
        className="absolute top-[var(--host-6)] inline-flex h-[var(--host-22)] w-fit min-w-[var(--host-76)] items-center justify-center rounded-full bg-[#6D7A8A] px-[var(--host-12)] text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#F9F9F9]"
        style={{ left: "calc(var(--host-10) + var(--host-529))" }}
      >
        고정 메뉴
      </span>
    </div>
  );
}

function ChannelMenuRow({
  draggingId,
  item,
  onDragEnd,
  onDragOver,
  onDragStart,
  onRemove,
  onSelectType,
  onUpdate,
  rowIndex,
}: {
  draggingId: string | null;
  item: ChannelMenuItem;
  onDragEnd: () => void;
  onDragOver: (targetId: string) => void;
  onDragStart: () => void;
  onRemove: () => void;
  onSelectType: () => void;
  onUpdate: (patch: Partial<ChannelMenuItem>) => void;
  rowIndex: number;
}) {
  const dragging = draggingId === item.id;

  return (
    <div
      className={`group relative h-[var(--host-68)] w-full border-b border-[#CAC4BC] transition ${
        dragging ? "opacity-60" : "opacity-100"
      }`}
      onDragOver={(event) => {
        event.preventDefault();
        onDragOver(item.id);
      }}
      style={{ marginTop: rowIndex === 0 ? 0 : "var(--host-22)" }}
    >
      <button
        aria-label={`${item.label} 순서 변경`}
        className="absolute left-[var(--host-10)] top-[var(--host-6)] grid size-[var(--host-22)] cursor-grab place-items-center text-[#D9D9D9] transition active:cursor-grabbing group-hover:text-[#FE701E]"
        draggable
        onDragEnd={onDragEnd}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        type="button"
      >
        <span
          aria-hidden="true"
          className="block size-[var(--host-22)] bg-current"
          style={{
            mask: `url(${nuvioIcons.menuReorder}) center / contain no-repeat`,
            WebkitMask: `url(${nuvioIcons.menuReorder}) center / contain no-repeat`,
          }}
        />
      </button>
      <label
        className="absolute grid gap-[var(--host-6)]"
        style={{
          left: "var(--host-53-5)",
          top: 0,
          width: "var(--host-507)",
        }}
      >
        <input
          className="h-[var(--host-34)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-14)] text-[length:var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
          onChange={(event) => onUpdate({ label: event.target.value })}
          value={item.label}
        />
        <span className="text-[length:var(--host-14)] font-normal leading-[1.253] text-[#CAC4BC]">
          {item.description}
        </span>
      </label>
      <span
        className="absolute top-[var(--host-6)] inline-flex h-[var(--host-22)] w-fit min-w-[var(--host-76)] items-center justify-center rounded-full bg-[#6D7A8A] px-[var(--host-12)] text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#F9F9F9]"
        style={{ left: "var(--host-583)" }}
      >
        {channelMenuMeta[item.kind].badge}
      </span>
      <span className="absolute right-0 top-[var(--host-8)] flex items-center justify-end gap-[var(--host-11)]">
        {!item.locked ? (
          <>
            <button
              aria-label={`${item.label} 메뉴 유형 변경`}
              className="grid size-[var(--host-16)] place-items-center transition hover:opacity-70"
              onClick={onSelectType}
              type="button"
            >
              <Image alt="" height={16} src={nuvioIcons.formItemCondition} width={16} />
            </button>
            <button
              aria-label={`${item.label} 삭제`}
              className="grid size-[var(--host-16)] place-items-center transition hover:opacity-70"
              onClick={onRemove}
              type="button"
            >
              <Image alt="" height={16} src={nuvioIcons.formItemTrash} width={16} />
            </button>
          </>
        ) : null}
      </span>
    </div>
  );
}

function SelectMenuTypeDialog({
  mode,
  onClose,
  onConfirm,
  onSelect,
  selectedKind,
}: {
  mode: "create" | "update";
  onClose: () => void;
  onConfirm: () => void;
  onSelect: (kind: SelectableMenuKind) => void;
  selectedKind: SelectableMenuKind;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0D0D0C]/70 px-[var(--host-24)]"
      role="dialog"
    >
      <section className="flex h-[var(--host-386)] w-[var(--host-457)] max-w-[calc(100vw-var(--host-48))] flex-col rounded-[12px] border border-[#D9D9D9] bg-[#F9F9F9] px-[var(--host-24)] py-[var(--host-24)] shadow-[0_12px_38px_rgba(0,0,0,0.18)]">
        <div className="flex items-start justify-between">
          <h2 className="pt-[var(--host-36)] text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
            페이지 타입 선택
          </h2>
          <button
            aria-label="닫기"
            className="grid size-[var(--host-16)] place-items-center transition hover:opacity-70"
            onClick={onClose}
            type="button"
          >
            <Image alt="" height={16} src={nuvioIcons.modalClose} width={16} />
          </button>
        </div>
        <div className="mt-[var(--host-14)] grid gap-[var(--host-8)]">
          {channelMenuTypeOptions.map((option) => {
            const selected = selectedKind === option.kind;

            return (
              <button
                aria-pressed={selected}
                className={`w-full rounded-[7px] border-[0.5px] px-[var(--host-16)] py-[var(--host-10)] text-left transition ${
                  selected
                    ? "border-[#FE701E] bg-[#FCFAF7]"
                    : "border-[#D9D9D9] bg-white hover:border-[#F7B267]"
                }`}
                key={option.kind}
                onClick={() => onSelect(option.kind)}
                type="button"
              >
                <span className="block text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#6D7A8A]">
                  {option.label}
                </span>
                <span className="mt-[var(--host-6)] block text-[length:var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-auto flex w-full justify-end">
          <button
            className="inline-flex h-[var(--host-38)] items-center justify-center rounded-[4px] bg-[#FE701E] px-[var(--host-27)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] transition hover:bg-[#E96418]"
            onClick={onConfirm}
            type="button"
          >
            {mode === "create" ? "생성" : "변경"}
          </button>
        </div>
      </section>
    </div>
  );
}
