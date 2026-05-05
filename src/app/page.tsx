import { ProgramExplorer } from "@/components/program-explorer";
import { listPublicPrograms } from "@/lib/public-program-db";
import type { ThemeKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HomeProps = {
  searchParams?: Promise<{ theme?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTheme = themeKeys.includes(resolvedSearchParams.theme as ThemeKey)
    ? (resolvedSearchParams.theme as ThemeKey)
    : undefined;
  const publicPrograms = await listPublicPrograms();

  return <ProgramExplorer initialTheme={initialTheme} programs={publicPrograms} />;
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
