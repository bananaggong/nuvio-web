import type { ReactNode } from "react";

const urlPattern = /(https?:\/\/[^\s<>"']+)/giu;

export function GalleryRichText({
  className,
  lines,
}: {
  className?: string;
  lines: string[];
}) {
  return (
    <div className={className}>
      {lines.map((line, index) => (
        <p key={`${line}-${index}`}>{renderLinkedLine(line)}</p>
      ))}
    </div>
  );
}

function renderLinkedLine(line: string): ReactNode[] | string {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(urlPattern)) {
    const url = match[0];
    const index = match.index ?? 0;
    const before = line.slice(lastIndex, index);

    if (before) parts.push(before);
    parts.push(
      <a
        className="text-[#FE701E] underline underline-offset-4"
        href={url}
        key={`${url}-${index}`}
        rel="noreferrer"
        target="_blank"
      >
        {url}
      </a>,
    );
    lastIndex = index + url.length;
  }

  const after = line.slice(lastIndex);
  if (after) parts.push(after);

  return parts.length > 0 ? parts : line;
}
