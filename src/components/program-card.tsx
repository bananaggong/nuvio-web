import Image from "next/image";
import Link from "next/link";
import { Building2, CalendarDays, MapPin } from "lucide-react";
import { formatDate, getDday } from "@/lib/format";
import type { Program } from "@/lib/types";

export function ProgramCard({ program }: { program: Program }) {
  const href = `/programs/${program.id}`;
  const deadline = getDday(program.recruitEnd, program.status);

  return (
    <article className="group min-w-0">
      <Link
        aria-label={`${program.title} 상세 보기`}
        className="relative block aspect-[4/3] overflow-hidden rounded-md bg-slate-100 shadow-sm ring-1 ring-slate-200 transition group-hover:shadow-md group-hover:ring-slate-300"
        href={href}
      >
        <Image
          alt={program.title}
          className="object-cover transition duration-300 group-hover:scale-105"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          src={program.image}
        />
      </Link>

      <div className="pt-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <Link className="min-w-0" href={href}>
            <h3 className="line-clamp-2 text-base font-black leading-6 text-slate-950 group-hover:text-[var(--primary)]">
              {program.title}
            </h3>
          </Link>
          <span
            className={`shrink-0 pt-0.5 text-base font-black ${
              program.status === "open" || program.status === "upcoming"
                ? "text-slate-950"
                : "text-slate-400"
            }`}
          >
            {deadline}
          </span>
        </div>

        <div className="mt-2 space-y-1.5 text-sm leading-5 text-slate-500">
          <Meta icon={<Building2 size={15} />} value={program.sourceName} />
          <Meta icon={<MapPin size={15} />} value={`${program.region} ${program.city}`} />
          <Meta icon={<CalendarDays size={15} />} value={`~${formatDate(program.recruitEnd)}`} />
        </div>
      </div>
    </article>
  );
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-slate-400">{icon}</span>
      <span className="truncate">{value}</span>
    </span>
  );
}
