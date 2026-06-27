"use client";

import Image from "next/image";
import {
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
} from "react";
import { ChannelHomeBlockView } from "@/components/channel-home-block-view";
import { nuvioIcons } from "@/components/icons/nuvio-icons";
import {
  applyChannelHomeBlocksToSections,
  channelHomeBlockTextPresets,
  channelHomeBlockTextWeights,
  defaultChannelHomeBlock,
  getChannelHomeBlocks,
  hasChannelHomeBlockContent,
  type ChannelHomeBlock,
  type ChannelHomeBlockTextAlign,
  type ChannelHomeBlockTextPreset,
  type ChannelHomeBlockTextWeight,
  type ChannelHomeBlockVerticalAlign,
} from "@/lib/channel-home-blocks";
import type { Village } from "@/lib/village-types";

type HostChannelHomeBlocksProps = {
  channel: Village | null;
  onChannelSaved: (channel: Village) => void;
};

type AssetUploadPayload = {
  data?: {
    url?: string;
  };
  error?: string;
};

type SaveChannelPayload = {
  data?: Village;
  error?: string;
};

type ColorTarget = "background" | "text";

type ColorPickerState = {
  blockId: string;
  target: ColorTarget;
} | null;

const maxBlockImageBytes = 5 * 1024 * 1024;
const formatHostPx = (value: number) => Number(value.toFixed(3)).toString();
const hostPx = (value: number) =>
  `clamp(${formatHostPx(value)}px, ${formatHostPx(value / 14.4)}vw, ${formatHostPx(
    value * 1.333333,
  )}px)`;

const colorSwatches = [
  "#F47F7F",
  "#FE701E",
  "#8E5B59",
  "#A56356",
  "#7B1209",
  "#8CEDEF",
  "#5BE4E7",
  "#378ADD",
  "#093EF3",
  "#1230A6",
  "#1F5A91",
  "#142EA0",
];

export function HostChannelHomeBlocks({
  channel,
  onChannelSaved,
}: HostChannelHomeBlocksProps) {
  return (
    <HostChannelHomeBlocksInner
      channel={channel}
      initialBlocks={getChannelHomeBlocks(channel)}
      key={channel?.id ?? "empty-channel"}
      onChannelSaved={onChannelSaved}
    />
  );
}

function HostChannelHomeBlocksInner({
  channel,
  initialBlocks,
  onChannelSaved,
}: HostChannelHomeBlocksProps & {
  initialBlocks: ChannelHomeBlock[];
}) {
  const [blocks, setBlocks] = useState<ChannelHomeBlock[]>(initialBlocks);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadingBlockId, setUploadingBlockId] = useState<string | null>(null);
  const [pendingUploadBlockId, setPendingUploadBlockId] = useState<string | null>(null);
  const [colorPicker, setColorPicker] = useState<ColorPickerState>(null);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function createBlock(): ChannelHomeBlock {
    return {
      ...defaultChannelHomeBlock,
      id: `channel-home-block-${Date.now().toString(36)}`,
      order: blocks.length,
    };
  }

  async function saveBlocks(nextBlocks: ChannelHomeBlock[], message: string) {
    if (!channel) {
      setStatusMessage("먼저 채널을 선택해 주세요.");
      return;
    }

    setSaving(true);
    setStatusMessage("저장 중입니다...");

    try {
      const orderedBlocks = nextBlocks.map((block, index) => ({
        ...block,
        order: index,
      }));
      const nextChannel: Village = {
        ...channel,
        sections: applyChannelHomeBlocksToSections(channel, orderedBlocks),
        updatedAt: new Date().toISOString(),
      };
      const response = await fetch("/api/host/channels", {
        body: JSON.stringify(nextChannel),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as SaveChannelPayload;

      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "블록을 저장하지 못했습니다.");
      }

      onChannelSaved(payload.data);
      setBlocks(getChannelHomeBlocks(payload.data));
      setStatusMessage(message);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "블록을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function updateBlock(blockId: string, patch: Partial<ChannelHomeBlock>) {
    setBlocks((current) =>
      current.map((block) => (block.id === blockId ? { ...block, ...patch } : block)),
    );
  }

  function addBlock() {
    const nextBlocks = blocks.concat(createBlock());
    setBlocks(nextBlocks);
    setEditingId(null);
    void saveBlocks(nextBlocks, "블록이 추가되었습니다.");
  }

  function removeBlock(blockId: string) {
    const nextBlocks = blocks.filter((block) => block.id !== blockId);
    setBlocks(nextBlocks);
    if (editingId === blockId) setEditingId(null);
    void saveBlocks(nextBlocks, "블록이 삭제되었습니다.");
  }

  function openImageUpload(block: ChannelHomeBlock) {
    setPendingUploadBlockId(block.id);
    updateBlock(block.id, { mode: block.mode === "split" ? "split" : "image" });
    imageInputRef.current?.click();
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !pendingUploadBlockId) return;

    if (!channel?.slug) {
      setStatusMessage("먼저 채널을 생성하거나 선택해 주세요.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatusMessage("이미지 파일만 업로드할 수 있어요.");
      return;
    }

    if (file.size > maxBlockImageBytes) {
      setStatusMessage("5MB 이하 이미지만 업로드할 수 있어요.");
      return;
    }

    setUploadingBlockId(pendingUploadBlockId);
    setStatusMessage("이미지를 업로드 중입니다...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("villageSlug", channel.slug);
      formData.append("usage", "channel-home-block");
      formData.append("altText", `${channel.name || "채널"} 홈 블록 이미지`);

      const response = await fetch("/api/host/village-pages/assets", {
        body: formData,
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AssetUploadPayload;
      const uploadedUrl = payload.data?.url;

      if (!response.ok || !uploadedUrl) {
        throw new Error(payload.error || "이미지를 업로드하지 못했습니다.");
      }

      updateBlock(pendingUploadBlockId, { imageUrl: uploadedUrl });
      setStatusMessage("이미지가 추가되었습니다. 저장 버튼을 눌러 저장해 주세요.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "이미지를 업로드하지 못했습니다.");
    } finally {
      setUploadingBlockId(null);
      setPendingUploadBlockId(null);
    }
  }

  function applyColor(blockId: string, target: ColorTarget, color: string) {
    const nextColor = normalizeHexInput(color);
    if (!nextColor) return;

    updateBlock(
      blockId,
      target === "text"
        ? { textColor: nextColor }
        : { backgroundColor: nextColor },
    );
    setRecentColors((current) =>
      [nextColor, ...current.filter((item) => item !== nextColor)].slice(0, 5),
    );
  }

  return (
    <section className="border-t border-[#D9D9D9] pb-[var(--host-34)] pt-[var(--host-22)]">
      <input
        accept="image/gif,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleImageChange}
        ref={imageInputRef}
        type="file"
      />
      <div className="mb-[var(--host-18)] flex items-center justify-between">
        <div className="flex items-center gap-[var(--host-8)]">
          <span className="grid size-[var(--host-16)] place-items-center rounded-[4px] border border-[#D9D9D9] bg-white">
            <span className="size-[var(--host-5)] rounded-full bg-[#CAC4BC]" />
          </span>
          <h2 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#5B3A29]">
            블록
          </h2>
        </div>
        {statusMessage ? (
          <span className="text-[length:var(--host-11)] font-medium leading-[1.253] text-[#6D7A8A]">
            {statusMessage}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-[var(--host-18)]">
        {blocks.map((block) => (
          <div key={block.id}>
            <HostBlockPreview
              active={editingId === block.id}
              block={block}
              onEdit={() => setEditingId((current) => (current === block.id ? null : block.id))}
              onRemove={() => removeBlock(block.id)}
            />
            {editingId === block.id ? (
              <BlockEditor
                block={block}
                colorPicker={colorPicker}
                onClose={() => {
                  setEditingId(null);
                  setColorPicker(null);
                }}
                onCommit={() => {
                  setColorPicker(null);
                  void saveBlocks(blocks, "블록이 저장되었습니다.");
                }}
                onOpenColorPicker={(target) =>
                  setColorPicker((current) =>
                    current?.blockId === block.id && current.target === target
                      ? null
                      : { blockId: block.id, target },
                  )
                }
                onPickColor={(target, color) => applyColor(block.id, target, color)}
                onRequestImage={() => openImageUpload(block)}
                onUpdate={(patch) => updateBlock(block.id, patch)}
                recentColors={recentColors}
                saving={saving || uploadingBlockId === block.id}
              />
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-[var(--host-16)] flex justify-center">
        <button
          aria-label="블록 추가"
          className="grid size-[var(--host-18)] place-items-center text-[#FF9A3D] transition hover:text-[#FE701E] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={saving || !channel}
          onClick={addBlock}
          type="button"
        >
          <IconMask icon={nuvioIcons.channelBlockAdd} size="var(--host-18)" />
        </button>
      </div>
    </section>
  );
}

function HostBlockPreview({
  active,
  block,
  onEdit,
  onRemove,
}: {
  active: boolean;
  block: ChannelHomeBlock;
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <section className="relative">
      <div
        className={`relative overflow-hidden border ${
          active ? "border-[#F7B267]" : "border-transparent"
        }`}
        style={{ minHeight: hostPx(hasChannelHomeBlockContent(block) ? 80 : 40) }}
      >
        {hasChannelHomeBlockContent(block) ? (
          <ChannelHomeBlockView block={block} px={hostPx} />
        ) : (
          <div
            className="flex items-center justify-center border border-dashed border-[#D9D9D9] text-center text-[length:var(--host-11)] font-medium leading-[1.45] text-[#A8AFB8]"
            style={{ height: hostPx(40) }}
          >
            이미지나 텍스트를 추가해서 자유롭게 꾸밀 수 있어요
            <br />
            비워두면 섹션 사이 여백(40px)으로 사용할 수 있어요
          </div>
        )}
      </div>
      <div className="absolute right-[var(--host-8)] top-[var(--host-6)] flex items-center gap-[var(--host-6)]">
        <button
          aria-label="블록 편집"
          className={`grid size-[var(--host-16)] place-items-center transition ${
            active ? "text-[#FE701E]" : "text-[#6D7A8A] hover:text-[#FE701E]"
          }`}
          onClick={onEdit}
          type="button"
        >
          <IconMask icon={nuvioIcons.channelBlockEdit} />
        </button>
        <button
          aria-label="블록 삭제"
          className="grid size-[var(--host-16)] place-items-center text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={onRemove}
          type="button"
        >
          <IconMask icon={nuvioIcons.formItemTrash} />
        </button>
      </div>
    </section>
  );
}

function BlockEditor({
  block,
  colorPicker,
  onClose,
  onCommit,
  onOpenColorPicker,
  onPickColor,
  onRequestImage,
  onUpdate,
  recentColors,
  saving,
}: {
  block: ChannelHomeBlock;
  colorPicker: ColorPickerState;
  onClose: () => void;
  onCommit: () => void;
  onOpenColorPicker: (target: ColorTarget) => void;
  onPickColor: (target: ColorTarget, color: string) => void;
  onRequestImage: () => void;
  onUpdate: (patch: Partial<ChannelHomeBlock>) => void;
  recentColors: string[];
  saving: boolean;
}) {
  const splitActive = block.mode === "split";
  const textActive = block.mode === "text" || block.mode === "split";
  const colorPickerValue =
    colorPicker?.target === "background" ? block.backgroundColor : block.textColor;

  return (
    <section className="relative mt-[var(--host-22)] rounded-[8px] border border-[#D9D9D9] bg-white px-[var(--host-18)] pb-[var(--host-22)] pt-[var(--host-24)]">
      <button
        aria-label="블록 편집 닫기"
        className="absolute right-[var(--host-14)] top-[var(--host-14)] grid size-[var(--host-16)] place-items-center text-[#0D0D0C] transition hover:text-[#FE701E]"
        onClick={onClose}
        type="button"
      >
        <Image alt="" height={16} src={nuvioIcons.modalClose} width={16} />
      </button>

      <div className="text-[#6D7A8A]">
        <h3 className="text-[length:var(--host-14)] font-semibold leading-[1.253] text-[#0D0D0C]">
          블록 편집
        </h3>
        <p className="mt-[var(--host-18)] text-[length:var(--host-12)] font-normal leading-[1.6]">
          이미지 업로드 시
          <br />
          ① 가로 최대 사이즈 초과 시 자동 축소
          <br />
          ② JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
        </p>
      </div>

      <div
        className="relative mt-[var(--host-12)] flex min-w-0 items-center px-[var(--host-22)] text-[#6D7A8A]"
        style={{ gap: hostPx(15) }}
      >
        <ToolbarIconButton
          active={block.mode === "image"}
          icon={nuvioIcons.channelBlockImage}
          label="이미지 입력"
          onClick={onRequestImage}
        />
        <ToolbarIconButton
          active={block.mode === "text"}
          label="텍스트 입력"
          onClick={() => onUpdate({ mode: "text" })}
        >
          <TextToolbarIcon />
        </ToolbarIconButton>
        <div
          className="relative h-[var(--host-29)] shrink-0"
          style={{ width: hostPx(100) }}
        >
          <select
          aria-label="글자 크기"
          className="h-full w-full appearance-none rounded-[4px] border border-[#CAC4BC] bg-white pl-[var(--host-8)] pr-[var(--host-28)] text-[length:var(--host-20)] font-medium leading-[1.253] text-[#6D7A8A] outline-none transition focus:border-[#FE701E]"
          onChange={(event) =>
            onUpdate({ textPreset: event.target.value as ChannelHomeBlockTextPreset })
          }
          value={block.textPreset}
        >
          {Object.entries(channelHomeBlockTextPresets).map(([key, value]) => (
            <option key={key} value={key}>
              {value.label}
            </option>
          ))}
          </select>
          <span className="pointer-events-none absolute right-[var(--host-8)] top-1/2 block -translate-y-1/2 text-[#CAC4BC]">
            <IconMask
              height={hostPx(8.5)}
              icon={nuvioIcons.channelBlockDropdown}
              width={hostPx(13.5)}
            />
          </span>
        </div>
        {(["regular", "medium", "semibold"] as ChannelHomeBlockTextWeight[]).map(
          (weight) => (
            <button
              aria-pressed={block.textWeight === weight}
              className={`h-[var(--host-20)] min-w-[var(--host-12)] text-[length:var(--host-16)] font-medium leading-[1.253] transition ${
                block.textWeight === weight ? "text-[#FE701E]" : "text-[#6D7A8A]"
              }`}
              key={weight}
              onClick={() => onUpdate({ textWeight: weight })}
              type="button"
            >
              {channelHomeBlockTextWeights[weight].label}
            </button>
          ),
        )}
        <ToolbarIconButton
          active={colorPicker?.blockId === block.id && colorPicker.target === "text"}
          icon={nuvioIcons.channelBlockPaint}
          label="글자 색상"
          onClick={() => onOpenColorPicker("text")}
        />
        <QuickColorButton
          color="#000000"
          label="검은색 글자"
          onClick={() => onPickColor("text", "#000000")}
        />
        <QuickColorButton
          color="#D9D9D9"
          label="연한 회색 글자"
          onClick={() => onPickColor("text", "#D9D9D9")}
        />
        <ToolbarDivider />
        {(["top", "middle", "bottom"] as ChannelHomeBlockVerticalAlign[]).map(
          (align) => (
            <ToolbarIconButton
              active={splitActive && block.verticalAlign === align}
              disabled={!splitActive}
              icon={
                align === "top"
                  ? nuvioIcons.channelBlockAlignTop
                  : align === "bottom"
                    ? nuvioIcons.channelBlockAlignBottom
                    : nuvioIcons.channelBlockAlignMiddle
              }
              key={align}
              label={`분할 ${align} 정렬`}
              onClick={() => onUpdate({ verticalAlign: align })}
            />
          ),
        )}
        <ToolbarDivider />
        {(["left", "center", "right"] as ChannelHomeBlockTextAlign[]).map((align) => (
          <ToolbarIconButton
            active={textActive && block.textAlign === align}
            disabled={!textActive}
            icon={
              align === "left"
                ? nuvioIcons.channelBlockTextLeft
                : align === "right"
                  ? nuvioIcons.channelBlockTextRight
                  : nuvioIcons.channelBlockTextCenter
            }
            key={align}
            label={`본문 ${align} 정렬`}
            onClick={() => onUpdate({ textAlign: align })}
          />
        ))}
        <ToolbarDivider />
        <ToolbarIconButton
          active={block.mode === "split"}
          icon={nuvioIcons.channelBlockSplit}
          label="이미지와 텍스트 분할"
          onClick={() => onUpdate({ mode: "split", verticalAlign: "middle" })}
        />
        <ToolbarIconButton
          disabled
          icon={nuvioIcons.channelBlockAttachment}
          label="첨부파일 기능 준비 중"
          onClick={() => undefined}
        />

        {colorPicker?.blockId === block.id ? (
          <ColorPickerPopover
            key={`${block.id}-${colorPicker.target}`}
            onChange={(color) => onPickColor(colorPicker.target, color)}
            recentColors={recentColors}
            value={colorPickerValue}
          />
        ) : null}
      </div>

      <div
        className="relative mt-[var(--host-18)] rounded-[4px] border border-[#F7B267] p-[var(--host-16)]"
        style={{ backgroundColor: block.backgroundColor }}
      >
        <button
          aria-label="블록 배경색"
          className="absolute right-[var(--host-12)] top-[var(--host-10)] z-10 grid size-[var(--host-20)] place-items-center text-[#6D7A8A] transition hover:text-[#FE701E]"
          onClick={() => onOpenColorPicker("background")}
          type="button"
        >
          <IconMask
            height={hostPx(20)}
            icon={nuvioIcons.channelBlockBgRoller}
            width={hostPx(17)}
          />
        </button>
        <BlockEditorCanvas
          block={block}
          onRequestImage={onRequestImage}
          onUpdate={onUpdate}
        />
      </div>

      <div className="mt-[var(--host-16)] flex justify-end">
        <button
          className="inline-flex h-[var(--host-29)] items-center justify-center rounded-[4px] bg-[#FE701E] px-[var(--host-18)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#FFF6EC] transition hover:bg-[#E96418] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving}
          onClick={onCommit}
          type="button"
        >
          저장
        </button>
      </div>
    </section>
  );
}

function BlockEditorCanvas({
  block,
  onRequestImage,
  onUpdate,
}: {
  block: ChannelHomeBlock;
  onRequestImage: () => void;
  onUpdate: (patch: Partial<ChannelHomeBlock>) => void;
}) {
  if (block.mode === "split") {
    return (
      <div
        className="grid gap-[var(--host-16)]"
        style={{
          alignItems: block.verticalAlign === "top"
            ? "start"
            : block.verticalAlign === "bottom"
              ? "end"
              : "center",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: hostPx(198),
        }}
      >
        <ImageDropArea block={block} onRequestImage={onRequestImage} />
        <TextEditArea block={block} onUpdate={onUpdate} />
      </div>
    );
  }

  if (block.mode === "text") {
    return <TextEditArea block={block} onUpdate={onUpdate} />;
  }

  return <ImageDropArea block={block} onRequestImage={onRequestImage} />;
}

function ImageDropArea({
  block,
  onRequestImage,
}: {
  block: ChannelHomeBlock;
  onRequestImage: () => void;
}) {
  return (
    <button
      className="relative flex min-h-[var(--host-198)] w-full items-center justify-center overflow-hidden bg-[#F4F4F4] text-center transition hover:bg-[#EFEFEF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FE701E]"
      onClick={onRequestImage}
      type="button"
    >
      {block.imageUrl ? (
        <Image
          alt="블록 이미지"
          className="object-contain object-center"
          fill
          sizes="(min-width: 1920px) 760px, 570px"
          src={block.imageUrl}
        />
      ) : (
        <ImageUploadHint />
      )}
    </button>
  );
}

function ImageUploadHint() {
  return (
    <span className="flex flex-col items-center justify-center px-[var(--host-16)] font-pretendard text-[#6D7A8A]">
      <IconMask icon={nuvioIcons.channelBlockImage} size="var(--host-20)" />
      <span className="mt-[var(--host-6)] text-[length:var(--host-12)] font-medium leading-[1.253]">
        파일 업로드
      </span>
      <span className="mt-[var(--host-18)] text-[length:var(--host-12)] font-normal leading-[1.253]">
        JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
      </span>
      <span className="mt-[var(--host-14)] text-[length:var(--host-12)] font-normal leading-[1.45]">
        권장 이미지 사이즈
        <br />
        가로 : 1920px(풀스크린) 이하
        <br />
        세로 : 200px ~ 560px
      </span>
    </span>
  );
}

function TextEditArea({
  block,
  onUpdate,
}: {
  block: ChannelHomeBlock;
  onUpdate: (patch: Partial<ChannelHomeBlock>) => void;
}) {
  const preset = channelHomeBlockTextPresets[block.textPreset];
  const weight = channelHomeBlockTextWeights[block.textWeight];

  return (
    <textarea
      aria-label="블록 텍스트"
      className="min-h-[var(--host-198)] w-full resize-y border border-dashed border-[#D9D9D9] bg-transparent p-[var(--host-16)] font-pretendard leading-[1.6] outline-none transition placeholder:text-[#6D7A8A] focus:border-[#FE701E]"
      onChange={(event) => onUpdate({ text: event.target.value })}
      placeholder="텍스트를 입력해 주세요."
      style={{
        color: block.textColor,
        fontSize: `var(--host-${preset.fontSize})`,
        fontWeight: weight.fontWeight,
        textAlign: block.textAlign,
      }}
      value={block.text}
    />
  );
}

function ColorPickerPopover({
  onChange,
  recentColors,
  value,
}: {
  onChange: (color: string) => void;
  recentColors: string[];
  value: string;
}) {
  const [draftHex, setDraftHex] = useState(() => value.toUpperCase());
  const [hue, setHue] = useState(() => hexToHsv(value).h);

  const rgb = hexToRgb(draftHex) ?? { b: 0, g: 0, r: 0 };
  const spectrumMarker = hexToHsv(draftHex);

  function commitColor(color: string) {
    const normalized = normalizeHexInput(color);
    if (!normalized) return;
    setDraftHex(normalized);
    setHue(hexToHsv(normalized).h);
    onChange(normalized);
  }

  function pickSpectrum(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const saturation = clamp01((event.clientX - rect.left) / rect.width);
    const valueRatio = 1 - clamp01((event.clientY - rect.top) / rect.height);
    commitColor(hsvToHex(hue, saturation, valueRatio));
  }

  function pickHue(event: PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextHue = Math.round(clamp01((event.clientY - rect.top) / rect.height) * 360);
    setHue(nextHue);
    commitColor(hsvToHex(nextHue, 1, 1));
  }

  function updateRgb(channel: "b" | "g" | "r", nextValue: string) {
    const numeric = Math.max(0, Math.min(255, Number.parseInt(nextValue || "0", 10)));
    commitColor(rgbToHex({ ...rgb, [channel]: numeric }));
  }

  return (
    <div className="absolute left-0 top-[var(--host-32)] z-30 w-[var(--host-546)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-18)] py-[var(--host-18)] text-[#0D0D0C] shadow-[0_18px_48px_rgba(0,0,0,0.16)]">
      <h4 className="text-[length:var(--host-16)] font-semibold leading-[1.253] text-[#0D0D0C]">
        색 편집
      </h4>
      <div className="mt-[var(--host-18)] grid grid-cols-[var(--host-257)_var(--host-44)_var(--host-12)_var(--host-123)_auto] gap-[var(--host-14)]">
        <button
          aria-label="색상 영역에서 선택"
          className="relative h-[var(--host-188)] rounded-[4px] border border-[#D9D9D9]"
          onPointerDown={pickSpectrum}
          style={{
            background:
              `linear-gradient(to top, #000 0%, transparent 55%), linear-gradient(to right, #fff 0%, hsl(${hue} 100% 50%) 100%)`,
          }}
          type="button"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute size-[var(--host-14)] rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.55),0_2px_6px_rgba(0,0,0,0.2)]"
            style={{
              left: `${spectrumMarker.s * 100}%`,
              top: `${(1 - spectrumMarker.v) * 100}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </button>
        <div className="h-[var(--host-188)] rounded-[3px] border border-[#D9D9D9]" style={{ backgroundColor: draftHex }} />
        <button
          aria-label="색상 슬라이더"
          className="h-[var(--host-188)] rounded-full border border-[#D9D9D9]"
          onPointerDown={pickHue}
          style={{
            background:
              "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
          }}
          type="button"
        />
        <div className="flex flex-col gap-[var(--host-10)]">
          <input
            aria-label="HEX 색상 코드"
            className="h-[var(--host-31)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-10)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none focus:border-[#FE701E]"
            onChange={(event) => {
              setDraftHex(event.target.value);
              const normalized = normalizeHexInput(event.target.value);
              if (normalized) commitColor(normalized);
            }}
            value={draftHex}
          />
          <select
            aria-label="색상 입력 방식"
            className="h-[var(--host-31)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-10)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none"
            value="RGB"
            onChange={() => undefined}
          >
            <option>RGB</option>
          </select>
          {(["r", "g", "b"] as const).map((channel) => (
            <input
              aria-label={`${channel.toUpperCase()} 색상값`}
              className="h-[var(--host-31)] rounded-[4px] border border-[#D9D9D9] bg-white px-[var(--host-10)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#0D0D0C] outline-none focus:border-[#FE701E]"
              key={channel}
              max={255}
              min={0}
              onChange={(event) => updateRgb(channel, event.target.value)}
              type="number"
              value={rgb[channel]}
            />
          ))}
        </div>
        <div className="flex flex-col justify-end gap-[var(--host-17)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
          <span>빨강</span>
          <span>녹색</span>
          <span>파랑</span>
        </div>
      </div>
      <div className="mt-[var(--host-24)] grid grid-cols-2 gap-[var(--host-40)]">
        <ColorChipGroup label="기본 색" colors={colorSwatches} onPick={commitColor} />
        <ColorChipGroup
          colors={recentColors}
          emptyCount={Math.max(0, 5 - recentColors.length)}
          label="최근 선택한 색"
          onPick={commitColor}
        />
      </div>
    </div>
  );
}

function ColorChipGroup({
  colors,
  emptyCount = 0,
  label,
  onPick,
}: {
  colors: string[];
  emptyCount?: number;
  label: string;
  onPick: (color: string) => void;
}) {
  return (
    <div>
      <p className="mb-[var(--host-14)] text-[length:var(--host-12)] font-medium leading-[1.253] text-[#6D7A8A]">
        {label}
      </p>
      <div className="flex items-center gap-[var(--host-10)]">
        {colors.slice(0, 12).map((color) => (
          <button
            aria-label={`${color} 선택`}
            className="size-[var(--host-18)] rounded-full border border-[#D9D9D9]"
            key={color}
            onClick={() => onPick(color)}
            style={{ backgroundColor: color }}
            type="button"
          />
        ))}
        {Array.from({ length: emptyCount }).map((_, index) => (
          <span
            aria-hidden
            className="size-[var(--host-18)] rounded-full border border-dashed border-[#D9D9D9]"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function ToolbarIconButton({
  active = false,
  children,
  disabled = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  children?: ReactNode;
  disabled?: boolean;
  icon?: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={`grid size-[var(--host-20)] shrink-0 place-items-center rounded-[3px] transition ${
        active ? "text-[#FE701E]" : "text-[#6D7A8A] hover:text-[#FE701E]"
      } disabled:cursor-not-allowed disabled:opacity-35`}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children ?? (icon ? <IconMask icon={icon} size="var(--host-20)" /> : null)}
    </button>
  );
}

function TextToolbarIcon() {
  return (
    <svg
      aria-hidden
      className="block size-[var(--host-20)]"
      fill="none"
      viewBox="0 0 20 20"
    >
      <rect fill="currentColor" height="17" rx="3" width="17" x="1.5" y="1.5" />
      <path
        d="M6.45 7H13.55M10 7V14M8.45 14H11.55"
        stroke="white"
        strokeLinecap="round"
        strokeWidth="1.45"
      />
    </svg>
  );
}

function QuickColorButton({
  color,
  label,
  onClick,
}: {
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="shrink-0 rounded-[2px] border border-[#D9D9D9]"
      onClick={onClick}
      style={{ backgroundColor: color, height: hostPx(14), width: hostPx(14) }}
      type="button"
    />
  );
}

function ToolbarDivider() {
  return <span className="w-px shrink-0 bg-[#D9D9D9]" style={{ height: hostPx(25) }} />;
}

function IconMask({
  height,
  icon,
  size = "var(--host-16)",
  width,
}: {
  height?: string;
  icon: string;
  size?: string;
  width?: string;
}) {
  return (
    <span
      aria-hidden
      className="block bg-current"
      style={{
        height: height ?? size,
        mask: `url(${icon}) center / contain no-repeat`,
        WebkitMask: `url(${icon}) center / contain no-repeat`,
        width: width ?? size,
      } as CSSProperties}
    />
  );
}

function normalizeHexInput(value: string): string | null {
  const normalized = value.trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/iu.test(normalized)) {
    return `#${normalized
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`.toUpperCase();
  }

  if (/^[0-9a-f]{6}$/iu.test(normalized)) {
    return `#${normalized}`.toUpperCase();
  }

  return null;
}

function hexToRgb(value: string) {
  const normalized = normalizeHexInput(value);
  if (!normalized) return null;

  return {
    b: Number.parseInt(normalized.slice(5, 7), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    r: Number.parseInt(normalized.slice(1, 3), 16),
  };
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function hexToHsv(value: string) {
  const rgb = hexToRgb(value) ?? { b: 0, g: 0, r: 0 };
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    if (max === g) h = 60 * ((b - r) / delta + 2);
    if (max === b) h = 60 * ((r - g) / delta + 4);
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return rgbToHex({
    b: Math.round((b + m) * 255),
    g: Math.round((g + m) * 255),
    r: Math.round((r + m) * 255),
  });
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
