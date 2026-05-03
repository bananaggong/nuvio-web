import { ProgramExplorer } from "@/components/program-explorer";
import { themeOptions } from "@/lib/data";
import type { ThemeKey } from "@/lib/types";

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

  return <ProgramExplorer initialTheme={initialTheme} />;
}
