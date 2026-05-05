import { ProgramExplorer } from "@/components/program-explorer";
import { themeOptions } from "@/lib/data";
import { listPublicPrograms } from "@/lib/public-program-db";
import type { ThemeKey } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HomeProps = {
  searchParams?: Promise<{ theme?: string }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTheme = themeOptions.some(
    (theme) => theme.key === resolvedSearchParams.theme,
  )
    ? (resolvedSearchParams.theme as ThemeKey)
    : undefined;
  const publicPrograms = await listPublicPrograms();

  return <ProgramExplorer initialTheme={initialTheme} programs={publicPrograms} />;
}
