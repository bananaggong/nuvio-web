import VillageMediaDetailRoute, {
  generateMetadata as generateVillageMediaDetailMetadata,
} from "../../../../[villageSlug]/media/[mediaId]/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelMediaDetailRouteProps = {
  params: Promise<{ mediaId: string; slug: string }>;
};

export async function generateMetadata({ params }: ChannelMediaDetailRouteProps) {
  const { mediaId, slug } = await params;

  return generateVillageMediaDetailMetadata({
    params: Promise.resolve({ mediaId, villageSlug: slug }),
  });
}

export default async function ChannelMediaDetailRoute({
  params,
}: ChannelMediaDetailRouteProps) {
  const { mediaId, slug } = await params;

  return VillageMediaDetailRoute({
    params: Promise.resolve({ mediaId, villageSlug: slug }),
  });
}
