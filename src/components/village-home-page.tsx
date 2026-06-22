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
  return (
    <ChannelGuestHomePage
      media={props.media ?? []}
      programs={props.programs}
      reviews={props.reviews}
      village={props.village}
    />
  );
}
