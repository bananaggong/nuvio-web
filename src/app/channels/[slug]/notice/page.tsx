import VillageNoticeRoute, {
  generateMetadata as generateVillageNoticeMetadata,
} from "../../../[villageSlug]/notice/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelNoticeRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ChannelNoticeRouteProps) {
  const { slug } = await params;

  return generateVillageNoticeMetadata({
    params: Promise.resolve({ villageSlug: slug }),
  });
}

export default async function ChannelNoticeRoute({
  params,
}: ChannelNoticeRouteProps) {
  const { slug } = await params;

  return VillageNoticeRoute({
    params: Promise.resolve({ villageSlug: slug }),
  });
}
