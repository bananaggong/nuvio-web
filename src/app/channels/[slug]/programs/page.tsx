import VillageProgramsRoute, {
  generateMetadata as generateVillageProgramsMetadata,
} from "../../../[villageSlug]/programs/page";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ChannelProgramsRouteProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ChannelProgramsRouteProps) {
  const { slug } = await params;

  return generateVillageProgramsMetadata({
    params: Promise.resolve({ villageSlug: slug }),
  });
}

export default async function ChannelProgramsRoute({
  params,
}: ChannelProgramsRouteProps) {
  const { slug } = await params;

  return VillageProgramsRoute({
    params: Promise.resolve({ villageSlug: slug }),
  });
}
