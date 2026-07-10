import type { Program } from "@/lib/types";

export function programSlugPath(programSlug: string | number): string {
  return `/programs/${programSlug}`;
}

export function programPath(program: Program): string {
  return programSlugPath(program.slug || program.id);
}
