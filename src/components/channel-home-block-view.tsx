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
        className="flex h-full min-h-[inherit] w-full items-center justify-center bg-[#D9D9D9] text-center font-pretendard font-medium leading-[1.253] text-[#0D0D0C]"
        style={{ fontSize: px(14) }}
      >
        이미지 넣을경우
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
