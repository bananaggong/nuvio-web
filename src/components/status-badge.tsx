import { getStatusTone, getProgramStatusText } from "@/lib/format";
import type { Program } from "@/lib/types";

export function StatusBadge({ program }: { program: Program }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-black ring-1 ${getStatusTone(
        program.status,
      )}`}
    >
      {getProgramStatusText(program)}
    </span>
  );
}
