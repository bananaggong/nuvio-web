"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import { HostWorkspaceLayout } from "@/components/host-workspace-ui";

type ChannelMenuKind = "fixed" | "program" | "review" | "gallery" | "magazine" | "board" | "free";

type ChannelMenuItem = {
  description: string;
  id: string;
  kind: ChannelMenuKind;
  label: string;
  locked?: boolean;
};

type MenuTypeOption = {
  description: string;
  kind: ChannelMenuKind;
  label: string;
};

const defaultMenuItems: ChannelMenuItem[] = [
  {
    description: "채널 메인 화면에 쓰는 위치 이동은 불가능해요",
    id: "home",
    kind: "fixed",
    label: "채널 홈",
    locked: true,
  },
  {
    description: "운영 중인 프로그램 목록이 표시돼요",
    id: "program",
    kind: "program",
    label: "프로그램",
    locked: true,
  },
  {
    description: "호스트가 오픈한 모든 프로그램의 후기가 표시돼요",
    id: "review",
    kind: "review",
    label: "후기",
    locked: true,
  },
  {
    description: "이미지와 영상을 그리드로 표시돼요",
    id: "gallery",
    kind: "gallery",
    label: "갤러리",
  },
  {
    description: "블로그처럼 글을 작성하고 목록은 원페이지 카드로 표시돼요",
    id: "magazine",
    kind: "magazine",
    label: "매거진",
  },
  {
    description: "공지사항과 글 목록이 게시판 형태로 표시돼요",
    id: "board",
    kind: "board",
    label: "게시판",
  },
  {
    description:
      "소개 페이지 등 원페이지 형태로 자유롭게 구성할 수 있으며, 홈 화면에는 표시되지 않고 메뉴에서만 접근할 수 있어요",
    id: "free",
    kind: "free",
    label: "자유",
  },
];

const menuTypeOptions: MenuTypeOption[] = [
  {
    description: "이미지와 영상을 그리드로 표시돼요",
    kind: "gallery",
    label: "갤러리 형",
  },
  {
    description: "블로그처럼 글을 작성하고 목록은 원페이지 카드로 표시돼요",
    kind: "magazine",
    label: "매거진 형",
  },
  {
    description: "공지사항과 글 목록이 게시판 형태로 표시돼요",
    kind: "board",
    label: "게시판 형",
  },
  {
    description:
      "소개 페이지 등 원페이지 형태로 자유롭게 구성할 수 있으며, 홈 화면에는 표시되지 않고 메뉴에서만 접근할 수 있어요",
    kind: "free",
    label: "자유 형",
  },
];

const typeLabelByKind: Record<ChannelMenuKind, string> = {
  board: "게시판 형",
  fixed: "고정 메뉴",
  free: "자유 형",
  gallery: "갤러리 형",
  magazine: "매거진 형",
  program: "기본 메뉴",
  review: "기본 메뉴",
};

const storageKey = "nuvio-channel-menu-settings";

export function HostChannelMenuSettings() {
  const [items, setItems] = useState<ChannelMenuItem[]>(defaultMenuItems);
  const [selectedKind, setSelectedKind] = useState<ChannelMenuKind>("gallery");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const customItemCount = useMemo(
    () => items.filter((item) => !item.locked && item.kind !== "fixed").length,
    [items],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored) as ChannelMenuItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        window.setTimeout(() => setItems(parsed), 0);
      }
    } catch {
      // Local draft persistence is optional for this first menu editor frame.
    }
  }, []);

  function updateItem(id: string, patch: Partial<ChannelMenuItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
    setSaved(false);
  }

  function duplicateItem(source: ChannelMenuItem) {
    setItems((current) => [
      ...current,
      {
        ...source,
        id: `${source.kind}-${current.length + 1}`,
        label: `${source.label} 복사본`,
        locked: false,
      },
    ]);
    setSaved(false);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  }

  function openTypeDialog() {
    setSelectedKind("gallery");
    setTypeDialogOpen(true);
  }

  function createMenuItem() {
    const option = menuTypeOptions.find((item) => item.kind === selectedKind) ?? menuTypeOptions[0];
    setItems((current) => [
      ...current,
      {
        description: option.description,
        id: `${option.kind}-${current.length + 1}`,
        kind: option.kind,
        label: option.label.replace(" 형", ""),
      },
    ]);
    setTypeDialogOpen(false);
    setSaved(false);
  }

  function saveDraft() {
    window.localStorage.setItem(storageKey, JSON.stringify(items));
    setSaved(true);
  }

  return (
    <HostWorkspaceLayout sidebarHeight="min-h-[var(--host-1086)]">
      <section className="min-w-0 flex-1 overflow-x-auto">
        <div className="w-[var(--host-1230)] min-w-[1230px] max-md:min-w-full max-md:w-full">
          <section className="h-[var(--host-156)] border-b border-[#6D7A8A] bg-white">
            <div className="flex items-start gap-[var(--host-42)] px-[var(--host-58)] pt-[var(--host-14)] max-md:px-0">
              <div className="size-[var(--host-128)] shrink-0 rounded-full bg-[#D9D9D9]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-end gap-[var(--host-10)] pt-[var(--host-3)]">
                  <h1 className="text-[var(--host-24)] font-medium leading-[1.253] text-[#0D0D0C]">
                    호스트 채널 명
                  </h1>
                  <span className="pb-[var(--host-2)] text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
                    지역명
                  </span>
                </div>
                <p className="mt-[var(--host-10)] text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                  호스트 채널 소개내용
                </p>
                <p className="mt-[var(--host-10)] text-[var(--host-16)] font-medium leading-[1.253] text-[#6D7A8A]">
                  <span className="mr-[var(--host-8)] text-[#FE701E]">ↄ</span>
                  이름&nbsp;&nbsp; 연결링크
                </p>
              </div>
            </div>
            <nav className="ml-[var(--host-228)] -mt-[var(--host-32)] flex items-end gap-[var(--host-40)] text-[var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29] max-md:ml-0 max-md:overflow-x-auto">
              {items.slice(0, 7).map((item) => (
                <span className="shrink-0" key={item.id}>
                  {item.label}
                </span>
              ))}
            </nav>
          </section>

          <section className="h-[var(--host-129)] px-[var(--host-58)] pt-[var(--host-40)] max-md:px-0">
            <h2 className="text-[var(--host-20)] font-semibold leading-[1.253] text-[#6D7A8A]">
              메뉴 설정
            </h2>
            <p className="mt-[var(--host-12)] text-[var(--host-16)] font-normal leading-[1.6] text-[#6D7A8A]">
              채널 네비게이션에 표시되는 메뉴를 관리해요
            </p>
            <p className="mt-[var(--host-6)] text-[var(--host-16)] font-normal leading-[1.6] text-[#6D7A8A]">
              모든 메뉴 이름은 자유롭게 변경할 수 있어요
            </p>
          </section>

          <section className="h-[var(--host-636)] px-[var(--host-58)] pt-[var(--host-14)] max-md:px-0">
            {items.map((item, index) => (
              <ChannelMenuRow
                item={item}
                key={item.id}
                onDuplicate={() => duplicateItem(item)}
                onRemove={() => removeItem(item.id)}
                onUpdate={(patch) => updateItem(item.id, patch)}
                rowIndex={index}
              />
            ))}
          </section>

          <div className="flex h-[var(--host-64)] flex-col items-center justify-start pt-[var(--host-2)]">
            <span className="text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A]">
              메뉴 추가
            </span>
            <button
              aria-label="메뉴 추가"
              className="mt-[var(--host-5)] grid size-[var(--host-28)] place-items-center rounded-full bg-[#6D7A8A] text-[var(--host-24)] font-medium leading-none text-white transition hover:bg-[#FE701E]"
              onClick={openTypeDialog}
              type="button"
            >
              +
            </button>
          </div>

          <div className="flex h-[var(--host-69)] items-start border-t border-[#6D7A8A] px-[var(--host-28)] pt-[var(--host-18)]">
            <button
              className="inline-flex h-[var(--host-29)] w-[var(--host-58)] items-center justify-center rounded-[4px] border border-[#6D7A8A] bg-white text-[var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A] transition hover:border-[#FE701E] hover:text-[#FE701E]"
              onClick={saveDraft}
              type="button"
            >
              저장
            </button>
            {saved ? (
              <span className="ml-[var(--host-12)] text-[var(--host-11)] font-medium leading-[1.253] text-[#7A8B52]">
                저장되었습니다
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {typeDialogOpen ? (
        <SelectMenuTypeDialog
          customItemCount={customItemCount}
          onClose={() => setTypeDialogOpen(false)}
          onCreate={createMenuItem}
          onSelect={setSelectedKind}
          selectedKind={selectedKind}
        />
      ) : null}
    </HostWorkspaceLayout>
  );
}

function ChannelMenuRow({
  item,
  onDuplicate,
  onRemove,
  onUpdate,
  rowIndex,
}: {
  item: ChannelMenuItem;
  onDuplicate: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<ChannelMenuItem>) => void;
  rowIndex: number;
}) {
  return (
    <div
      className="grid h-[var(--host-68)] w-[var(--host-1114)] grid-cols-[var(--host-28)_var(--host-509)_var(--host-110)_1fr] items-start gap-[var(--host-18)] border-b border-[#CAC4BC] pt-0"
      style={{ marginTop: rowIndex === 0 ? 0 : "var(--host-22)" }}
    >
      <span className="mt-[var(--host-6)] grid size-[var(--host-22)] place-items-center rounded-[4px] border border-[#D9D9D9]">
        <span
          aria-hidden="true"
          className="block h-[var(--host-13)] w-[var(--host-8)]"
          style={{
            backgroundImage: "radial-gradient(circle, #D3CFC8 1.2px, transparent 1.4px)",
            backgroundSize: "6px 6px",
          }}
        />
      </span>
      <label className="grid gap-[var(--host-6)]">
        <input
          className="h-[var(--host-29)] rounded-[4px] border border-[#6D7A8A] bg-white px-[var(--host-14)] text-[var(--host-14)] font-medium leading-[1.253] text-[#6D7A8A] outline-none transition placeholder:text-[#CAC4BC] focus:border-[#FE701E]"
          onChange={(event) => onUpdate({ label: event.target.value })}
          value={item.label}
        />
        <span className="text-[var(--host-14)] font-normal leading-[1.253] text-[#CAC4BC]">
          {item.description}
        </span>
      </label>
      <span className="mt-[var(--host-4)] inline-flex h-[var(--host-22)] w-fit min-w-[var(--host-76)] items-center justify-center rounded-full bg-[#6D7A8A] px-[var(--host-12)] text-[var(--host-14)] font-semibold leading-[1.253] text-[#F9F9F9]">
        {typeLabelByKind[item.kind]}
      </span>
      <span className="mt-[var(--host-8)] flex items-center justify-end gap-[var(--host-11)]">
        {!item.locked ? (
          <>
            <button
              aria-label={`${item.label} 복제`}
              className="grid size-[var(--host-16)] place-items-center"
              onClick={onDuplicate}
              type="button"
            >
              <Image alt="" height={16} src={nuvioIcons.formItemCopy} width={16} />
            </button>
            <button
              aria-label={`${item.label} 삭제`}
              className="grid size-[var(--host-16)] place-items-center"
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
  customItemCount,
  onClose,
  onCreate,
  onSelect,
  selectedKind,
}: {
  customItemCount: number;
  onClose: () => void;
  onCreate: () => void;
  onSelect: (kind: ChannelMenuKind) => void;
  selectedKind: ChannelMenuKind;
}) {
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[90] bg-[#F3F3F3]/80 px-[var(--host-24)] py-[var(--host-40)]"
      role="dialog"
    >
      <div className="ml-[var(--host-48)] mt-[var(--host-16)] w-[var(--host-427)] max-w-[calc(100vw-48px)]">
        <p className="text-[var(--host-12)] font-medium leading-[1.253] text-[#CAC4BC]">
          Select Menu Type
        </p>
        <section className="mt-[var(--host-12)] rounded-[10px] border border-[#D9D9D9] bg-white px-[var(--host-18)] py-[var(--host-20)] shadow-[0_18px_44px_rgba(91,58,41,0.08)]">
          <div className="flex justify-end">
            <button
              aria-label="닫기"
              className="grid size-[var(--host-20)] place-items-center text-[#0D0D0C] transition hover:text-[#FE701E]"
              onClick={onClose}
              type="button"
            >
              <span aria-hidden="true" className="text-[var(--host-18)] leading-none">
                ×
              </span>
            </button>
          </div>
          <p className="text-[var(--host-12)] font-semibold leading-[1.253] text-[#0D0D0C]">
            페이지 타입 선택
          </p>
          <div className="mt-[var(--host-8)] grid gap-[var(--host-6)]">
            {menuTypeOptions.map((option) => {
              const selected = selectedKind === option.kind;

              return (
                <button
                  aria-pressed={selected}
                  className={`rounded-[6px] border px-[var(--host-10)] py-[var(--host-8)] text-left transition ${
                    selected
                      ? "border-[#F7B267] bg-[#FFF8F1]"
                      : "border-[#D9D9D9] bg-white hover:border-[#F7B267]"
                  }`}
                  key={option.kind}
                  onClick={() => onSelect(option.kind)}
                  type="button"
                >
                  <span className="block text-[var(--host-12)] font-medium leading-[1.253] text-[#5B3A29]">
                    {option.label}
                  </span>
                  <span className="mt-[var(--host-3)] block text-[var(--host-10)] font-normal leading-[1.45] text-[#CAC4BC]">
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-[var(--host-16)] flex items-center justify-between gap-[var(--host-12)]">
            <span className="text-[var(--host-10)] font-normal leading-[1.253] text-[#FE701E]">
              현재 추가 메뉴 {customItemCount}개
            </span>
            <button
              className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#FE701E] px-[var(--host-16)] text-[var(--host-11)] font-medium leading-[1.253] text-white"
              onClick={onCreate}
              type="button"
            >
              생성
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
