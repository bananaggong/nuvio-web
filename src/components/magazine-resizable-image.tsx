"use client";

import ImageExtension from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useRef, useState } from "react";

const minImageWidth = 120;
const maxImageWidth = 1200;

export const ResizableMagazineImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) =>
          normalizeImageWidth(
            element.getAttribute("width") ?? parseStyleWidth(element.getAttribute("style")),
          ),
        renderHTML: (attributes) => {
          const width = normalizeImageWidth(attributes.width);
          return width ? { width: String(width) } : {};
        },
      },
      height: {
        default: null,
        parseHTML: () => null,
        renderHTML: () => ({}),
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },
});

function ResizableImageNodeView({
  node,
  selected,
  updateAttributes,
}: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [draftWidth, setDraftWidth] = useState<number | null>(null);
  const storedWidth = normalizeImageWidth(node.attrs.width);
  const activeWidth = draftWidth ?? storedWidth;

  const src = String(node.attrs.src ?? "");
  const alt = String(node.attrs.alt ?? "");
  const title = node.attrs.title ? String(node.attrs.title) : undefined;

  function applyWidth(nextWidth: number | null) {
    const width = normalizeImageWidth(nextWidth);
    setDraftWidth(null);
    updateAttributes({ height: null, width: width ? String(width) : null });
  }

  function applyRatio(ratio: number) {
    const containerWidth = getEditorWidth(wrapperRef.current);
    applyWidth(Math.round(containerWidth * ratio));
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>) {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = wrapper.getBoundingClientRect().width;
    const maxWidth = getEditorWidth(wrapper);
    let nextWidth = startWidth;

    function onMove(moveEvent: PointerEvent) {
      const delta = moveEvent.clientX - startX;
      nextWidth = clampImageWidth(startWidth + delta, maxWidth);
      setDraftWidth(Math.round(nextWidth));
    }

    function onUp() {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      applyWidth(Math.round(nextWidth));
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  return (
    <NodeViewWrapper
      className={`magazine-resizable-image ${selected ? "is-selected" : ""}`}
      ref={wrapperRef}
      style={
        activeWidth
          ? {
              maxWidth: "100%",
              width: `${activeWidth}px`,
            }
          : undefined
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt={alt} draggable={false} src={src} title={title} />
      {selected ? (
        <div className="magazine-image-controls" contentEditable={false}>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => applyRatio(0.5)} type="button">
            50%
          </button>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => applyRatio(0.75)} type="button">
            75%
          </button>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => applyRatio(1)} type="button">
            100%
          </button>
          <button onMouseDown={(event) => event.preventDefault()} onClick={() => applyWidth(null)} type="button">
            원본
          </button>
        </div>
      ) : null}
      {selected ? (
        <button
          aria-label="이미지 크기 조절"
          className="magazine-image-resize-handle"
          contentEditable={false}
          onPointerDown={startResize}
          type="button"
        />
      ) : null}
    </NodeViewWrapper>
  );
}

function getEditorWidth(element: HTMLElement | null): number {
  const editorElement = element?.closest(".ProseMirror");
  const width = editorElement?.clientWidth ?? maxImageWidth;
  return Math.max(minImageWidth, Math.min(width, maxImageWidth));
}

function clampImageWidth(value: number, maxWidth: number): number {
  return Math.max(minImageWidth, Math.min(value, maxWidth, maxImageWidth));
}

function normalizeImageWidth(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = typeof value === "number" ? value : Number(String(value).replace(/px$/u, ""));
  if (!Number.isFinite(raw)) return null;
  return Math.round(Math.max(minImageWidth, Math.min(raw, maxImageWidth)));
}

function parseStyleWidth(style: string | null): string | null {
  if (!style) return null;
  return style.match(/(?:^|;)\s*width\s*:\s*(\d{1,4})(?:px)?\s*(?:;|$)/iu)?.[1] ?? null;
}
