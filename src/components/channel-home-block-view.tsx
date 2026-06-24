import Image from "next/image";
import {
  channelHomeBlockTextPresets,
  channelHomeBlockTextWeights,
  hasChannelHomeBlockContent,
  type ChannelHomeBlock,
} from "@/lib/channel-home-blocks";

type ChannelHomeBlockViewProps = {
  block: ChannelHomeBlock;
  px: (value: number) => string;
};

export function ChannelHomeBlockView({ block, px }: ChannelHomeBlockViewProps) {
  if (!hasChannelHomeBlockContent(block)) {
    return <div aria-hidden style={{ height: px(40) }} />;
  }

  if (block.mode === "image") {
    return (
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: block.backgroundColor,
          borderRadius: px(4),
          minHeight: px(220),
        }}
      >
        <BlockImage alt="채널 홈 블록 이미지" block={block} px={px} />
      </section>
    );
  }

  if (block.mode === "split") {
    return (
      <section
        className="grid overflow-hidden"
        style={{
          alignItems: block.verticalAlign === "top"
            ? "start"
            : block.verticalAlign === "bottom"
              ? "end"
              : "center",
          backgroundColor: block.backgroundColor,
          borderRadius: px(4),
          gap: px(20),
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: px(240),
          padding: px(24),
        }}
      >
        <div
          className="relative overflow-hidden bg-[#D9D9D9]"
          style={{ borderRadius: px(4), minHeight: px(190) }}
        >
          <BlockImage alt="채널 홈 분할 블록 이미지" block={block} px={px} />
        </div>
        <BlockText block={block} px={px} />
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden"
      style={{
        backgroundColor: block.backgroundColor,
        borderRadius: px(4),
        minHeight: px(120),
        padding: px(24),
      }}
    >
      <BlockText block={block} px={px} />
    </section>
  );
}

function BlockImage({
  alt,
  block,
  px,
}: {
  alt: string;
  block: ChannelHomeBlock;
  px: (value: number) => string;
}) {
  if (!block.imageUrl) {
    return (
      <div
        className="flex h-full min-h-[inherit] w-full items-center justify-center bg-[#F4F4F4] text-center font-pretendard text-[#6D7A8A]"
      >
        <ImagePlaceholder px={px} />
      </div>
    );
  }

  return (
    <Image
      alt={alt}
      className="object-contain object-center"
      fill
      sizes="(min-width: 1920px) 760px, 570px"
      src={block.imageUrl}
    />
  );
}

function ImagePlaceholder({ px }: { px: (value: number) => string }) {
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{ padding: px(16) }}
    >
      <svg
        aria-hidden
        fill="none"
        style={{ height: px(20), width: px(20) }}
        viewBox="0 0 20 20"
      >
        <path
          d="M5.75 17.25H14.25C15.08 17.25 15.75 16.58 15.75 15.75V7.32L11.46 3.25H5.75C4.92 3.25 4.25 3.92 4.25 4.75V15.75C4.25 16.58 4.92 17.25 5.75 17.25Z"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.35"
        />
        <path
          d="M11.35 3.55V6.35C11.35 7.02 11.89 7.56 12.56 7.56H15.37"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.35"
        />
        <path
          d="M10 13.9V9.1M7.95 11.25L10 9.1L12.05 11.25"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.35"
        />
      </svg>
      <span
        className="font-medium leading-[1.253]"
        style={{ fontSize: px(12), marginTop: px(6) }}
      >
        파일 업로드
      </span>
      <span
        className="font-normal leading-[1.253]"
        style={{ fontSize: px(12), marginTop: px(18) }}
      >
        JPG, PNG, WebP, GIF 파일을 5MB 이하로 업로드할 수 있어요
      </span>
      <span
        className="font-normal leading-[1.45]"
        style={{ fontSize: px(12), marginTop: px(14) }}
      >
        권장 이미지 사이즈
        <br />
        가로 : 1920px(풀스크린) 이하
        <br />
        세로 : 200px ~ 560px
      </span>
    </div>
  );
}

function BlockText({
  block,
  px,
}: {
  block: ChannelHomeBlock;
  px: (value: number) => string;
}) {
  const text = block.text.trim() || "텍스트를 입력해 주세요.";
  const preset = channelHomeBlockTextPresets[block.textPreset];
  const weight = channelHomeBlockTextWeights[block.textWeight];

  return (
    <p
      className="whitespace-pre-wrap font-pretendard leading-[1.6]"
      style={{
        color: block.textColor,
        fontSize: px(preset.fontSize),
        fontWeight: weight.fontWeight,
        textAlign: block.textAlign,
      }}
    >
      {text}
    </p>
  );
}
