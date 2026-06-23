import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { JsonLdScript } from "@/components/json-ld";
import { ProgramExplorer } from "@/components/program-explorer";
import { listPublishedHomeHeroSlides } from "@/lib/home-hero-db";
import { listPublicPrograms } from "@/lib/public-program-db";
import {
  createSeoMetadata,
  homePageJsonLd,
  programItemListJsonLd,
  siteConfig,
} from "@/lib/seo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  absoluteTitle: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const callbackPath = getOAuthCallbackPath(await searchParams);

  if (callbackPath) {
    redirect(callbackPath);
  }

  const [publicPrograms, heroSlides] = await Promise.all([
    listPublicPrograms(),
    listPublishedHomeHeroSlides(),
  ]);

  return (
    <>
      <JsonLdScript
        data={[
          homePageJsonLd(publicPrograms),
          programItemListJsonLd(publicPrograms, "/"),
        ]}
      />
      <ProgramExplorer heroSlides={heroSlides} programs={publicPrograms} />
    </>
  );
}

function getOAuthCallbackPath(
  searchParams?: Record<string, string | string[] | undefined>,
): string | null {
  const code = getSingleValue(searchParams?.code);

  if (!code) return null;

  const callbackParams = new URLSearchParams({ code });
  const next = getSingleValue(searchParams?.next);
  const intent = getSingleValue(searchParams?.intent);

  if (next) callbackParams.set("next", next);
  if (intent) callbackParams.set("intent", intent);

  return `/auth/callback?${callbackParams.toString()}`;
}

function getSingleValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}
