import type { Metadata } from "next";
import { JsonLdScript } from "@/components/json-ld";
import { ProgramExplorer } from "@/components/program-explorer";
import { listPublicPrograms } from "@/lib/public-program-db";
import {
  createSeoMetadata,
  homePageJsonLd,
  programItemListJsonLd,
  siteConfig,
} from "@/lib/seo";
import type { ThemeKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  absoluteTitle: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

type HomeProps = {
  searchParams?: Promise<{ q?: string; theme?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialKeyword = resolvedSearchParams.q?.trim() || undefined;
  const initialTheme = themeKeys.includes(resolvedSearchParams.theme as ThemeKey)
    ? (resolvedSearchParams.theme as ThemeKey)
    : undefined;
  const publicPrograms = await listPublicPrograms();

  return (
    <>
      <JsonLdScript
        data={[
          homePageJsonLd(publicPrograms),
          programItemListJsonLd(publicPrograms, "/"),
        ]}
      />
      <ProgramExplorer
        initialKeyword={initialKeyword}
        initialTheme={initialTheme}
        programs={publicPrograms}
      />
    </>
  );
}

const themeKeys: ThemeKey[] = [
  "short",
  "month",
  "workation",
  "local",
  "returnFarm",
  "event",
  "pet",
  "half",
  "daily",
  "family",
  "easy",
  "benefit",
  "exclusive",
];
