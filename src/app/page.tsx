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

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = createSeoMetadata({
  absoluteTitle: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

export default async function Home() {
  const publicPrograms = await listPublicPrograms();

  return (
    <>
      <JsonLdScript
        data={[
          homePageJsonLd(publicPrograms),
          programItemListJsonLd(publicPrograms, "/"),
        ]}
      />
      <ProgramExplorer />
    </>
  );
}
