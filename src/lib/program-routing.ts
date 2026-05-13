import type { Program } from "@/lib/types";

export function programPath(program: Program): string {
  return `/programs/${program.slug || program.id}`;
}
