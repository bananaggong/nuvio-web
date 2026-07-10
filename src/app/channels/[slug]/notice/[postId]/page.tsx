import VillageNoticeDetailRoute, {
  generateMetadata as generateVillageNoticeDetailMetadata,
} from "../../../../[villageSlug]/notice/[postId]/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelNoticeDetailRouteProps = {
  params: Promise<{ postId: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: ChannelNoticeDetailRouteProps) {
  const { postId, slug } = await params;

  return generateVillageNoticeDetailMetadata({
    params: Promise.resolve({ postId, villageSlug: slug }),
  });
}

export default async function ChannelNoticeDetailRoute({
  params,
}: ChannelNoticeDetailRouteProps) {
  const { postId, slug } = await params;

  return VillageNoticeDetailRoute({
    params: Promise.resolve({ postId, villageSlug: slug }),
  });
}
