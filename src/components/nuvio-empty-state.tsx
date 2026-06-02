import Link from "next/link";

type NuvioEmptyStateProps = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  compact?: boolean;
  description?: string;
  iconClassName?: string;
  label?: string;
  message?: string;
  textClassName?: string;
};

export function NuvioEmptyState({
  actionHref,
  actionLabel,
  className,
  compact = false,
  description,
  iconClassName,
  label = "콘텐츠",
  message,
  textClassName,
}: NuvioEmptyStateProps) {
  const displayMessage = message ?? buildEmptyStateMessage(label);

  return (
    <div
      className={[
        "flex w-full items-center justify-center text-center",
        compact ? "min-h-[180px] px-5 py-8" : "min-h-[260px] px-5 py-12",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col items-center">
        <NuvioEmptySymbol
          className={[
            compact ? "h-[34px] w-[30px]" : "h-[42px] w-[37px]",
            "text-[#D6D6D6]",
            iconClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        />
        <p
          className={[
            "mt-4 text-[13px] font-medium leading-[1.6] text-[#C8CDD2]",
            textClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {displayMessage}
        </p>
        {description ? (
          <p className="mt-2 max-w-sm text-[13px] font-medium leading-6 text-[#AEB5BD]">
            {description}
          </p>
        ) : null}
        {actionHref && actionLabel ? (
          <Link
            className="mt-5 inline-flex h-10 items-center justify-center rounded-[4px] border border-[#F7983A] px-4 text-[13px] font-semibold text-[#F7983A] transition hover:bg-[#FFF6EC]"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function buildEmptyStateMessage(label: string) {
  return `아직 ${label}${getSubjectParticle(label)} 없어요`;
}

function getSubjectParticle(value: string) {
  const lastChar = value.trim().at(-1);
  if (!lastChar) return "이";

  const code = lastChar.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "이";

  return (code - 0xac00) % 28 === 0 ? "가" : "이";
}

function NuvioEmptySymbol({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 61.75 71.02"
    >
      <path
        d="M59.43 42.54c-1.36-.26-2.76-.25-4.13-.1-.52.06-1.03.13-1.55.23-1.52.28-6.7.95-7.59.85-2.3-.28-4.61-1.27-5.98-3.13-1.15-1.56-1.53-3.64-1.11-5.54.56-2.53 2.27-3.66 3.92-5.4.89-.93 1.18-2.35.67-3.54l-.03-.07-.06-.12c-1.47-3.06-5.45-4.54-8.43-2.72-.76.46-1.4 1.1-2.19 1.51-1.87.97-4.42.29-5.55-1.48-1.13-1.77-.68-4.38 1-5.64.67-.5 1.47-.8 2.15-1.29 2-1.46 2.4-4.58.96-6.57-1.34-1.85-3.89-2.32-6.01-1.82-6.89 1.61-13.09 5.51-17.65 10.91-11.06 13.09-10.36 31.86 1.55 41.94 1.18 1 2.42 1.86 3.72 2.62-1.02 1.23-1.49 2.64-1.18 4 .68 2.98 4.84 4.57 9.29 3.55 2.82-.64 11.92-2.69 22.67-16.86 1.05-1.39 2.17-2.74 3.39-3.99 1-1.02 2.06-1.98 3.22-2.82 1-.72 2.07-1.35 3.2-1.85 1.07-.48 2.19-.84 3.33-1.12 1.19-.28 2.41-.47 3.63-.61.35-.04.7-.07 1.05-.11-.7-.42-1.51-.66-2.32-.82ZM13 47.96c-1.46 0-2.65-2.35-2.65-5.24s1.18-5.24 2.65-5.24 2.65 2.35 2.65 5.24-1.18 5.24-2.65 5.24Zm10.67 0c-1.46 0-2.65-2.35-2.65-5.24s1.18-5.24 2.65-5.24 2.65 2.35 2.65 5.24-1.18 5.24-2.65 5.24Z"
        fill="currentColor"
      />
      <circle cx="40.81" cy="4.99" fill="currentColor" r="4.99" />
    </svg>
  );
}
