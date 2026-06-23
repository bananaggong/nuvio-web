import {
  ChannelProfileHeader,
  channelGuestContentStyle,
  channelGuestScaleRootStyle,
  px,
} from "@/components/channel-guest-gallery";
import { villagePath } from "@/lib/village-routing";
import type { Village, VillageSection } from "@/lib/village-types";

type ChannelGuestAboutPageProps = {
  village: Village;
};

const text = {
  title: "채널 소개",
  fallbackTitle: "소개",
  fallbackBody: "채널에서 운영하는 프로그램과 활동을 소개하는 공간입니다.",
} as const;

export function ChannelGuestAboutPage({ village }: ChannelGuestAboutPageProps) {
  const homeHref = villagePath(village.slug);
  const sections = getAboutSections(village);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-white font-pretendard text-[#5B3A29]"
      style={channelGuestScaleRootStyle}
    >
      <main className="mx-auto w-full max-w-[1920px]">
        <ChannelProfileHeader activeTab="home" homeHref={homeHref} village={village} />

        <section
          className="mx-auto"
          style={{
            ...channelGuestContentStyle,
            paddingBottom: px(90),
            paddingTop: px(36),
          }}
        >
          <h2
            className="font-semibold leading-[1.253] text-[#5B3A29]"
            style={{
              fontSize: px(24),
              paddingLeft: px(16),
            }}
          >
            {text.title}
          </h2>

          <div
            className="grid"
            style={{
              gap: px(24),
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              padding: `${px(28)} ${px(16)} 0`,
            }}
          >
            {sections.map((section) => (
              <AboutSectionCard key={section.id} section={section} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function AboutSectionCard({ section }: { section: VillageSection }) {
  return (
    <article
      className="border border-[#F0D8C8] bg-[#FCFCFC]"
      style={{
        borderRadius: px(10),
        minHeight: px(180),
        padding: `${px(28)} ${px(30)}`,
      }}
    >
      <h3
        className="font-semibold leading-[1.253] text-[#5B3A29]"
        style={{ fontSize: px(20) }}
      >
        {section.title || text.fallbackTitle}
      </h3>
      <p
        className="font-medium leading-[1.65] text-[#6D7A8A]"
        style={{
          fontSize: px(14),
          marginTop: px(16),
        }}
      >
        {section.body || text.fallbackBody}
      </p>
      {section.items.length > 0 ? (
        <div className="flex flex-wrap" style={{ gap: px(8), marginTop: px(18) }}>
          {section.items.map((item) => (
            <span
              className="rounded-full bg-[#FFF6EC] font-semibold leading-[1.253] text-[#FE701E]"
              key={item}
              style={{
                fontSize: px(12),
                padding: `${px(6)} ${px(10)}`,
              }}
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function getAboutSections(village: Village): VillageSection[] {
  if (village.sections.length > 0) return village.sections;

  return [
    {
      body: village.description || village.summary || text.fallbackBody,
      id: "channel-about-default",
      items: [village.region, village.city].filter(Boolean),
      title: village.name || text.fallbackTitle,
      type: "story",
    },
  ];
}
