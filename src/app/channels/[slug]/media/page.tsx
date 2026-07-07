import VillageMediaRoute, {
  generateMetadata as generateVillageMediaMetadata,
} from "../../../[villageSlug]/media/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelMediaRouteProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ type?: string | string[] }>;
};

export async function generateMetadata({ params }: ChannelMediaRouteProps) {
  const { slug } = await params;

  return generateVillageMediaMetadata({
    params: Promise.resolve({ villageSlug: slug }),
  });
}

export default async function ChannelMediaRoute({
  params,
  searchParams,
}: ChannelMediaRouteProps) {
  const { slug } = await params;

  return VillageMediaRoute({
    params: Promise.resolve({ villageSlug: slug }),
    searchParams,
  });
}
