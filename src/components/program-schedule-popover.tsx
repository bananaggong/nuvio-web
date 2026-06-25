"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

export type ProgramScheduleItem = {
  body: string;
  day: string;
  image?: string;
  timetable?: string[];
};

export function ProgramScheduleCards({
  fallbackItems,
  items,
}: {
  fallbackItems: string[];
  items: ProgramScheduleItem[];
}) {
  const [openItemKey, setOpenItemKey] = useState<string | null>(null);

  return (
    <div className="flex w-full flex-col gap-[18px]">
      {items.map((item, index) => {
        const itemKey = `${item.day}-${index}`;
        const timetable = item.timetable?.filter(Boolean) ?? [];
        const scheduleItems = (
          timetable.length > 0 ? timetable : fallbackItems
        ).filter(Boolean);

        return (
          <ScheduleCard
            isOpen={openItemKey === itemKey}
            item={item}
            key={itemKey}
            onToggle={() =>
              setOpenItemKey((current) => (current === itemKey ? null : itemKey))
            }
            panelId={`program-schedule-${index}`}
            scheduleItems={
              scheduleItems.length > 0 ? scheduleItems : ["세부 일정은 추후 안내됩니다."]
            }
          />
        );
      })}
    </div>
  );
}

function ScheduleCard({
  isOpen,
  item,
  onToggle,
  panelId,
  scheduleItems,
}: {
  isOpen: boolean;
  item: ProgramScheduleItem;
  onToggle: () => void;
  panelId: string;
  scheduleItems: string[];
}) {
  const hasImage = Boolean(item.image && isDisplayableImage(item.image));

  return (
    <div className="flex min-h-[200px] w-[687px] items-start gap-3 overflow-hidden rounded-md border border-[#F3F3F3] bg-white max-md:h-auto max-md:w-full max-md:flex-col">
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
          aria-controls={panelId}
          aria-expanded={isOpen}
          className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-normal leading-[1.6] text-[#FE701E]"
          onClick={onToggle}
          type="button"
        >
          <ChevronRight
            aria-hidden="true"
            className={`h-3.5 w-[11px] transition-transform ${
              isOpen ? "-rotate-90" : ""
            }`}
          />
          {isOpen ? "일정 닫기" : "일정 보기"}
        </button>
        {isOpen ? (
          <div
            className="flex w-full max-w-[359px] flex-col gap-[10px] pt-0.5"
            id={panelId}
          >
            {scheduleItems.map((scheduleItem, index) => {
              const scheduleLine = splitScheduleLine(scheduleItem, index);

              return (
                <p
                  className="grid grid-cols-[54px_1fr] items-start gap-2 text-xs leading-[1.253]"
                  key={`${scheduleItem}-${index}`}
                >
                  <strong className="font-semibold text-[#FE701E]">
                    {scheduleLine.time}
                  </strong>
                  <span className="break-keep font-medium text-[#6D7A8A]">
                    {scheduleLine.label}
                  </span>
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function splitScheduleLine(
  value: string,
  index: number,
): { label: string; time: string } {
  const match = /^(\d{1,2}\s*[:：]\s*\d{2})\s*(.*)$/u.exec(value);
  if (match) {
    return {
      label: match[2] || value,
      time: match[1].replace(/\s+/gu, ""),
    };
  }

  return {
    label: value,
    time: `${String(index * 2).padStart(2, "0")}:00`,
  };
}

function isDisplayableImage(value: string): boolean {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    /^data:image\/(png|jpe?g|webp|gif);base64,/iu.test(value)
  );
}

function escapeCssUrl(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
