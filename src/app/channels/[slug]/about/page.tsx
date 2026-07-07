import VillageAboutRoute, {
  generateMetadata as generateVillageAboutMetadata,
} from "../../../[villageSlug]/about/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelAboutRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ChannelAboutRouteProps) {
  const { slug } = await params;

  return generateVillageAboutMetadata({
    params: Promise.resolve({ villageSlug: slug }),
  });
}

export default async function ChannelAboutRoute({
  params,
}: ChannelAboutRouteProps) {
  const { slug } = await params;

  return VillageAboutRoute({
    params: Promise.resolve({ villageSlug: slug }),
  });
}
