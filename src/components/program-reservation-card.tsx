"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ProgramQuantityControl } from "@/components/program-quantity-control";
import {
  formatCompactDateRange,
  formatKoreanDate,
} from "@/lib/program-detail-view-model";
import type { Program } from "@/lib/types";

type ProgramReservationCardProps = {
  applyHref: string;
  program: Program;
};

export function ProgramReservationCard({
  applyHref,
  program,
}: ProgramReservationCardProps) {
  const [quantity, setQuantity] = useState(0);
  const maxQuantity = getCapacityNumber(program.capacity) ?? 99;
  const priceAmount = parseWonAmount(program.fee);
  const totalLabel =
    priceAmount > 0
      ? `${(priceAmount * Math.max(quantity, 1)).toLocaleString("ko-KR")}원`
      : program.fee;
  const applyWithQuantity = useMemo(
    () => appendQuantityParam(applyHref, quantity),
    [applyHref, quantity],
  );

  return (
    <section
      className="flex min-h-[333px] w-full flex-col items-center gap-[17px] rounded-md border border-[#F5E1D3] bg-[#FCFCFC] p-4 max-md:w-full"
      id="apply"
    >
      <div className="grid min-h-[35px] w-[93.208%] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center rounded-[7px] border-[0.5px] border-[#F5E1D3] max-md:w-full max-md:grid-cols-2">
        <div className="flex min-w-0 items-center justify-center gap-1 p-2 min-[1440px]:gap-[0.278vw] min-[1440px]:p-[0.556vw]">
          <strong className="shrink-0 whitespace-nowrap text-xs font-medium leading-[1.253] text-[#5B3A29]">
            일정
          </strong>
          <span className="min-w-0 whitespace-nowrap text-xs font-normal leading-[1.6] text-[#6D7A8A]">
            {formatCompactDateRange(program.activityStart, program.activityEnd)}
          </span>
        </div>
        <div className="flex min-w-0 items-center justify-center gap-1 border-l-[0.5px] border-[#F5E1D3] p-2 min-[1440px]:gap-[0.278vw] min-[1440px]:p-[0.556vw]">
          <strong className="shrink-0 whitespace-nowrap text-xs font-medium leading-[1.253] text-[#5B3A29]">
            모집
          </strong>
          <span className="min-w-0 whitespace-nowrap text-xs font-normal leading-[1.6] text-[#6D7A8A]">
            {program.capacity}
          </span>
        </div>
      </div>
      <p className="-mt-3.5 mr-[13px] w-full text-right text-xs font-normal leading-[1.6] text-[#6D7A8A]">
        ~{formatKoreanDate(program.recruitEnd)}
      </p>

      <div className="-mt-[3px] flex w-full items-center justify-between">
        <span className="text-xs font-medium leading-[1.253] text-[#F7B267]">
          자유신청
        </span>
        <strong className="text-center text-sm font-semibold leading-[1.253] text-[#7A8B52]">
          D-20
        </strong>
      </div>
      <h2 className="-mt-[13px] self-start text-base font-medium leading-[1.253] text-[#5B3A29]">
        {program.title}
      </h2>

      <div className="flex w-full items-start gap-1.5">
        <strong className="text-base font-medium leading-[1.253] text-[#5B3A29]">
          {program.fee}
        </strong>
        <span className="text-xs font-normal leading-[1.6] text-[#CAC4BC]">/명</span>
      </div>

      <div className="flex w-full flex-col items-center gap-[7px] rounded-[5px] bg-[#F3F3F3] p-1.5">
        <div className="flex w-full items-center justify-between">
          <span className="text-xs font-normal leading-[1.6] text-[#6D7A8A]">
            신청 인원
          </span>
          <ProgramQuantityControl
            max={maxQuantity}
            min={0}
            onChange={setQuantity}
            value={quantity}
          />
        </div>
        <div className="flex w-full items-center justify-between border-t border-[#F5E1D3] pt-1.5">
          <strong className="text-base font-medium leading-[1.253] text-[#5B3A29]">
            총액
          </strong>
          <strong
            aria-live="polite"
            className="text-base font-medium leading-[1.253] text-[#5B3A29]"
          >
            {totalLabel}
          </strong>
        </div>
      </div>

      <Link
        className="-mt-px flex h-[29px] w-full items-center justify-center rounded bg-[#FE701E] text-xs font-medium leading-[1.253] text-[#FFF6EC]"
        href={applyWithQuantity}
      >
        신청하기
      </Link>
    </section>
  );
}

function parseWonAmount(value: string): number {
  const amount = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function getCapacityNumber(value: string): number | null {
  const capacity = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(capacity) && capacity > 0 ? capacity : null;
}

function appendQuantityParam(href: string, quantity: number): string {
  if (quantity <= 0) return href;

  try {
    const url = new URL(href, "https://nuvio.local");
    url.searchParams.set("people", String(quantity));
    if (/^https?:\/\//i.test(href)) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
