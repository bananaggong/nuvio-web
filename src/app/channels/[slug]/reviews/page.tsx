import VillageReviewsRoute, {
  generateMetadata as generateVillageReviewsMetadata,
} from "../../../[villageSlug]/reviews/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelReviewsRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: ChannelReviewsRouteProps) {
  const { slug } = await params;

  return generateVillageReviewsMetadata({
    params: Promise.resolve({ villageSlug: slug }),
  });
}

export default async function ChannelReviewsRoute({
  params,
  searchParams,
}: ChannelReviewsRouteProps) {
  const { slug } = await params;

  return VillageReviewsRoute({
    params: Promise.resolve({ villageSlug: slug }),
    searchParams,
  });
}
