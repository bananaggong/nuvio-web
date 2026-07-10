import { BoseongFigmaHomePage } from "@/components/boseong-figma-site";
import { ChannelGuestHomePage } from "@/components/channel-guest-home";
import type { ChannelBoardPost } from "@/lib/channel-board-posts";
import type { Program, Review, VillageMediaContent } from "@/lib/types";
import type { PublishedVillagePageSection } from "@/lib/village-page-cms";
import type { Village } from "@/lib/village-types";

type VillageHomePageProps = {
  boardPosts?: ChannelBoardPost[];
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
      boardPosts={props.boardPosts ?? []}
      media={props.media ?? []}
      programs={props.programs}
      reviews={props.reviews}
      village={props.village}
    />
  );
}
