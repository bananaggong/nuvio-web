import { BoseongFigmaHomePage } from "@/components/boseong-figma-site";
import { ChannelGuestHomePage } from "@/components/channel-guest-home";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { PublishedVillagePageSection } from "@/lib/village-page-cms";
import type { Village } from "@/lib/village-types";

type VillageHomePageProps = {
  media?: VillageMediaContent[];
  pageSections?: PublishedVillagePageSection[];
  programs: Program[];
  reviews: Review[];
  village: Village;
};

export function VillageHomePage(props: VillageHomePageProps) {
  if (props.village.slug === "boseong") {
    return (
      <BoseongFigmaHomePage
        media={props.media ?? []}
        pageSections={props.pageSections}
        programs={props.programs}
        reviews={props.reviews}
        village={props.village}
      />
    );
  }

  return (
    <ChannelGuestHomePage
      media={props.media ?? []}
      programs={props.programs}
      reviews={props.reviews}
      village={props.village}
    />
  );
}
