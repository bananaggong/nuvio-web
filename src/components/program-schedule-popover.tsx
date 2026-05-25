"use client";

import { ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";
import { useState } from "react";

export type ProgramScheduleItem = {
  body: string;
  day: string;
  image?: string;
  timetable?: string[];
};

export function ProgramScheduleCards({
  items,
  popupItems,
}: {
  items: ProgramScheduleItem[];
  popupItems: string[];
}) {
  const [openDay, setOpenDay] = useState<string | null>(null);
  const activeItem = items.find((item) => item.day === openDay) ??
    items[0] ?? {
      body: "",
      day: "일정",
    };
  const activeTimetable = activeItem?.timetable?.filter(Boolean) ?? [];
  const activeSchedule =
    activeTimetable.length > 0 ? activeTimetable : popupItems;

  return (
    <>
      <div className="flex w-full flex-col gap-[18px]">
        {items.map((item, index) => (
          <ScheduleCard
            item={item}
            key={`${item.day}-${index}`}
            onOpen={() => setOpenDay(item.day)}
          />
        ))}
      </div>

      {openDay ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-5 py-10"
          role="dialog"
        >
          <div className="w-[280px] rounded-md border border-[#F5E1D3] bg-white p-6 shadow-[0_18px_48px_rgba(91,58,41,0.16)]">
            <div className="flex items-center justify-between">
              <button
                className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-medium leading-[1.6] text-[#FF9A3D]"
                onClick={() => setOpenDay(null)}
                type="button"
              >
                <ChevronUp aria-hidden="true" className="size-[13px]" />
                일정 닫기
              </button>
              <button
                aria-label="일정 팝업 닫기"
                className="inline-flex size-7 items-center justify-center rounded-full border border-[#F5E1D3] bg-white text-[#6D7A8A]"
                onClick={() => setOpenDay(null)}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>

            <h3 className="mt-5 text-base font-semibold leading-[1.253] text-[#5B3A29]">
              {activeItem.day} 일정
            </h3>

            <div className="mt-5 flex flex-col gap-2">
              {activeSchedule.map((item, index) => {
                const scheduleLine = splitScheduleLine(item, index);
                return (
                  <p className="flex flex-col gap-0.5" key={`${item}-${index}`}>
                    <strong className="text-xs font-semibold leading-[1.253] text-[#FE701E]">
                      {scheduleLine.time}
                    </strong>
                    <span className="text-xs font-medium leading-[1.253] text-[#6D7A8A]">
                      {scheduleLine.label}
                    </span>
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ScheduleCard({
  item,
  onOpen,
}: {
  item: ProgramScheduleItem;
  onOpen: () => void;
}) {
  const hasImage = Boolean(item.image && isDisplayableImage(item.image));

  return (
    <div className="flex h-[200px] w-[687px] items-start gap-3 overflow-hidden rounded-md border border-[#F3F3F3] bg-white max-md:h-auto max-md:w-full max-md:flex-col">
      <div
        className="group/image flex h-[200px] w-[310px] shrink-0 items-center justify-between bg-[#7A8B52] bg-cover bg-center px-2.5 max-md:w-full"
        style={
          hasImage
            ? { backgroundImage: `url("${escapeCssUrl(item.image ?? "")}")` }
            : undefined
        }
      >
        <button
          aria-label={`${item.day} 이전`}
          className="pointer-events-none inline-flex justify-center border-0 bg-transparent p-0 text-[#FCFCFC] opacity-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100"
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="size-[18px]" />
        </button>
        <button
          aria-label={`${item.day} 다음`}
          className="pointer-events-none inline-flex justify-center border-0 bg-transparent p-0 text-[#FCFCFC] opacity-0 drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] transition-opacity group-hover/image:pointer-events-auto group-hover/image:opacity-100 group-focus-within/image:pointer-events-auto group-focus-within/image:opacity-100"
          type="button"
        >
          <ChevronRight aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-[13px] overflow-hidden pt-1.5 pr-3 max-md:h-auto max-md:w-full max-md:p-3.5">
        <h3 className="text-base font-semibold leading-[1.253] text-[#5B3A29]">
          {item.day}
        </h3>
        <p className="line-clamp-3 w-full max-w-[359px] break-keep text-xs font-medium leading-[1.46] text-[#6D7A8A]">
          {item.body}
        </p>
        <button
          className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-normal leading-[1.6] text-[#FE701E]"
          onClick={onOpen}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-3.5 w-[11px]" />
          일정 보기
        </button>
      </div>
    </div>
  );
}

function splitScheduleLine(
  value: string,
  index: number,
): { label: string; time: string } {
  const match = /^(\d{1,2}[:：]\d{2})\s*(.*)$/.exec(value);
  if (match) {
    return {
      label: match[2] || value,
      time: match[1],
    };
  }

  return {
    label: value,
    time: `${String(index * 2).padStart(2, "0")} : 00`,
  };
}

function isDisplayableImage(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)
  );
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
