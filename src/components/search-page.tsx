"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Minus,
  Plus,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ActivePopup = "date" | "guest" | null;
type CategoryState = "active" | "default" | "disabled";
type DateSelectionStep = "start" | "end" | "complete";
type GuestKey = "adult" | "child" | "infant";

const categoryRows: Array<{
  title: string;
  items: Array<{ label: string; state?: CategoryState }>;
}> = [
  {
    title: "카테고리1",
    items: [
      { label: "버튼", state: "active" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
    ],
  },
  {
    title: "카테고리2",
    items: [
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼" },
      { label: "버튼", state: "disabled" },
      { label: "버튼", state: "disabled" },
    ],
  },
];

const guestRows: Array<{
  key: GuestKey;
  label: string;
  subLabel?: string;
}> = [
  { key: "adult", label: "성인" },
  { key: "child", label: "아동", subLabel: "13세 미만" },
  { key: "infant", label: "영유아", subLabel: "24개월 미만" },
];

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
const may2026Days = Array.from({ length: 31 }, (_, index) => index + 1);

export function SearchPage() {
  const router = useRouter();
  const [activePopup, setActivePopup] = useState<ActivePopup>(null);
  const [keyword, setKeyword] = useState("");
  const [selectedStart, setSelectedStart] = useState(19);
  const [selectedEnd, setSelectedEnd] = useState(22);
  const [draftStart, setDraftStart] = useState(19);
  const [draftEnd, setDraftEnd] = useState(22);
  const [dateSelectionStep, setDateSelectionStep] =
    useState<DateSelectionStep>("complete");
  const [guests, setGuests] = useState<Record<GuestKey, number>>({
    adult: 2,
    child: 0,
    infant: 0,
  });
  const [draftGuests, setDraftGuests] = useState<Record<GuestKey, number>>({
    adult: 2,
    child: 0,
    infant: 0,
  });

  const nights = Math.max(selectedEnd - selectedStart, 0);
  const guestTotal = guests.adult + guests.child + guests.infant;
  const dateLabel = `${nights}박`;
  const rangeLabel = `10.${selectedStart}(월) -10.${selectedEnd}(목)`;
  const guestLabel = guestTotal > 0 ? `인원 ${guestTotal}` : "인원";

  function openPopup(nextPopup: ActivePopup) {
    if (nextPopup === "date") {
      setDraftStart(selectedStart);
      setDraftEnd(selectedEnd);
      setDateSelectionStep("complete");
    }

    if (nextPopup === "guest") {
      setDraftGuests(guests);
    }

    setActivePopup((current) => (current === nextPopup ? null : nextPopup));
  }

  function submitSearch() {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    params.set("start", `2026-05-${String(selectedStart).padStart(2, "0")}`);
    params.set("end", `2026-05-${String(selectedEnd).padStart(2, "0")}`);
    params.set("guests", String(guestTotal));
    router.push(`/?${params.toString()}`);
  }

  function selectDraftDate(day: number) {
    if (dateSelectionStep === "start" || dateSelectionStep === "complete") {
      setDraftStart(day);
      setDraftEnd(day);
      setDateSelectionStep("end");
      return;
    }

    if (day <= draftStart) {
      setDraftStart(day);
      setDraftEnd(day);
      return;
    }

    setDraftEnd(day);
    setDateSelectionStep("complete");
  }

  return (
    <div className="font-pretendard flex min-h-[calc(100vh-4.861vw)] justify-center bg-[#F3F3F3] px-4 pb-14">
      <section className="relative w-[min(636px,100%)] bg-white px-[13px] py-[9px]">
        <div className="mx-auto flex w-full max-w-[592px] flex-col items-center pb-[10px] pt-4">
          <div className="flex w-full justify-end pr-3">
            <Link
              aria-label="검색 닫기"
              className="inline-flex size-[17px] items-center justify-center text-[#5B3A29] transition-colors hover:text-[#FE701E]"
              href="/"
            >
              <X aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
            </Link>
          </div>

          <h1 className="pb-[22px] pt-0.5 text-center text-sm font-semibold leading-[1.253] text-[#5B3A29]">
            어떤 여정을 기다리나요?
          </h1>

          <div className="relative w-full">
            <div className="rounded-2xl border border-[#FF9A3D] bg-white px-4 py-[9px]">
              <label className="flex w-full items-center justify-between gap-3 pb-2">
                <Search
                  aria-hidden="true"
                  className="size-[14px] shrink-0 text-[#FF9A3D]"
                  strokeWidth={2}
                />
                <input
                  className="min-w-0 flex-1 bg-transparent text-xs font-normal leading-[1.6] text-[#5B3A29] outline-none placeholder:text-[#6D7A8A]"
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="여행을 검색 하세요"
                  type="search"
                  value={keyword}
                />
              </label>

              <div className="flex items-start border-t-[0.8px] border-[#F7B267] pt-2 max-sm:flex-col max-sm:gap-3">
                <button
                  className="inline-flex min-w-0 items-center gap-2 border-0 bg-transparent p-0 text-left"
                  onClick={() => openPopup("date")}
                  type="button"
                >
                  <CalendarDays
                    aria-hidden="true"
                    className="size-[14px] shrink-0 text-[#FF9A3D]"
                    strokeWidth={1.8}
                  />
                  <span className="flex min-w-0 items-center gap-2 pl-1.5 text-sm leading-[1.253]">
                    <strong className="shrink-0 font-semibold text-[#5B3A29]">
                      {dateLabel}
                    </strong>
                    <span className="truncate font-normal text-[#6D7A8A]">{rangeLabel}</span>
                  </span>
                </button>

                <button
                  className="ml-auto inline-flex items-center gap-2 border-0 bg-transparent p-0 text-sm font-semibold leading-[1.253] text-[#5B3A29] max-sm:ml-0"
                  onClick={() => openPopup("guest")}
                  type="button"
                >
                  <UserRound
                    aria-hidden="true"
                    className="size-[14px] shrink-0 text-[#FF9A3D]"
                    strokeWidth={1.8}
                  />
                  <span className="pl-[11px]">{guestLabel}</span>
                </button>
              </div>
            </div>

            {activePopup === "date" ? (
              <DatePopup
                canApply={dateSelectionStep === "complete"}
                endDay={draftEnd}
                onApply={() => {
                  if (dateSelectionStep !== "complete") return;
                  setSelectedStart(draftStart);
                  setSelectedEnd(draftEnd);
                  setActivePopup(null);
                }}
                onSelectDay={selectDraftDate}
                selectionStep={dateSelectionStep}
                startDay={draftStart}
              />
            ) : null}

            {activePopup === "guest" ? (
              <GuestPopup
                guests={draftGuests}
                onApply={() => {
                  setGuests(draftGuests);
                  setActivePopup(null);
                }}
                onChange={(key, value) =>
                  setDraftGuests((current) => ({
                    ...current,
                    [key]: Math.max(0, value),
                  }))
                }
              />
            ) : null}
          </div>
        </div>

        {categoryRows.map((row) => (
          <CategorySection key={row.title} row={row} />
        ))}

        <div className="flex w-full items-center border-t-[0.8px] border-[#FFF6EC] pt-2">
          <button
            className="pl-4 text-sm font-semibold leading-[1.253] text-[#6D7A8A]"
            onClick={() => {
              setKeyword("");
              setSelectedStart(19);
              setSelectedEnd(22);
              setDateSelectionStep("complete");
              setGuests({ adult: 2, child: 0, infant: 0 });
            }}
            type="button"
          >
            초기화
          </button>
          <button
            className="ml-auto inline-flex h-[29px] items-center justify-center rounded bg-[#FE701E] px-[18px] pb-[5px] pt-[6px] text-xs font-medium leading-[1.253] text-[#FFF6EC] transition-colors hover:bg-[#f05f12]"
            onClick={submitSearch}
            type="button"
          >
            검색하기
          </button>
        </div>
      </section>
    </div>
  );
}

function CategorySection({
  row,
}: {
  row: (typeof categoryRows)[number];
}) {
  return (
    <section className="flex w-full flex-col items-center">
      <div className="flex w-full items-center p-4">
        <h2 className="text-center text-sm font-semibold leading-[1.253] text-[#5B3A29]">
          {row.title}
        </h2>
      </div>
      <div className="flex w-full max-w-[574px] flex-wrap gap-1.5">
        {row.items.map((item, index) => (
          <FilterButton
            key={`${row.title}-${index}`}
            label={item.label}
            state={item.state ?? "default"}
          />
        ))}
      </div>
    </section>
  );
}

function FilterButton({
  label,
  state,
}: {
  label: string;
  state: CategoryState;
}) {
  const [selected, setSelected] = useState(state === "active");
  const disabled = state === "disabled";
  const active = selected && !disabled;

  return (
    <button
      className={`h-[30px] w-[110px] rounded-[20px] pb-1.5 pt-[5px] text-center text-xs font-bold transition-colors ${
        disabled
          ? "bg-[#CAC4BC] text-[#F3F3F3]"
          : active
            ? "bg-[#FF9A3D] text-[#F9F9F9]"
            : "bg-[#F3F3F3] text-[#5B3A29] hover:bg-[#FFF6EC]"
      }`}
      disabled={disabled}
      onClick={() => setSelected((value) => !value)}
      type="button"
    >
      {label}
    </button>
  );
}

function DatePopup({
  canApply,
  endDay,
  onApply,
  onSelectDay,
  selectionStep,
  startDay,
}: {
  canApply: boolean;
  endDay: number;
  onApply: () => void;
  onSelectDay: (day: number) => void;
  selectionStep: DateSelectionStep;
  startDay: number;
}) {
  const title =
    selectionStep === "end"
      ? "종료일 선택"
      : selectionStep === "start"
        ? "시작일 선택"
        : "일정 선택";

  return (
    <div className="absolute left-0 top-[95px] z-20 flex h-[385px] w-[310px] flex-col gap-2 overflow-hidden rounded-md border-[0.5px] border-[#FF9A3D] bg-white px-[15px] py-[19px] shadow-[0_12px_32px_rgba(91,58,41,0.08)] max-sm:left-1/2 max-sm:-translate-x-1/2">
      <div className="flex w-full items-center gap-2 border-b border-[#FFF6EC] pb-1.5 pl-1.5">
        <h2 className="text-center text-sm font-medium leading-[1.253] text-[#5B3A29]">
          {title}
        </h2>
        <button
          className={`ml-auto inline-flex h-[29px] items-center justify-center rounded px-[18px] pb-[5px] pt-[6px] text-xs font-medium leading-[1.253] ${
            canApply
              ? "bg-[#FE701E] text-[#FFF6EC]"
              : "cursor-not-allowed bg-[#CAC4BC] text-[#F3F3F3]"
          }`}
          disabled={!canApply}
          onClick={onApply}
          type="button"
        >
          적용
        </button>
      </div>

      <CalendarMonth
        endDay={endDay}
        onSelectDay={onSelectDay}
        startDay={startDay}
      />
    </div>
  );
}

function CalendarMonth({
  endDay,
  onSelectDay,
  startDay,
}: {
  endDay: number;
  onSelectDay: (day: number) => void;
  startDay: number;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium leading-[1.253] text-[#5B3A29]">2026년 5월</h3>
      <div className="grid w-[280px] grid-cols-7">
        {weekdays.map((weekday, index) => (
          <span
            className={`flex size-10 items-center justify-center text-center text-xs font-normal leading-[1.6] ${
              index === 0
                ? "text-[#DE1D1D]"
                : index === 6
                  ? "text-[#106AD9]"
                  : "text-[#5B3A29]"
            }`}
            key={weekday}
          >
            {weekday}
          </span>
        ))}
        {Array.from({ length: 5 }).map((_, index) => (
          <span aria-hidden="true" className="size-10" key={`blank-${index}`} />
        ))}
        {may2026Days.map((day) => (
          <CalendarDay
            day={day}
            endDay={endDay}
            key={day}
            onSelectDay={onSelectDay}
            startDay={startDay}
          />
        ))}
      </div>
    </div>
  );
}

function CalendarDay({
  day,
  endDay,
  onSelectDay,
  startDay,
}: {
  day: number;
  endDay: number;
  onSelectDay: (day: number) => void;
  startDay: number;
}) {
  const isPast = day <= 12;
  const isEndpoint = day === startDay || day === endDay;
  const isStart = day === startDay;
  const isEnd = day === endDay;
  const isRange = day > startDay && day < endDay;
  const hasRange = endDay > startDay;
  const weekday = (day + 5) % 7;

  const textClass = useMemo(() => {
    if (isEndpoint) return "font-semibold text-[#FFF6EC]";
    if (isPast) return "font-normal text-[#CAC4BC]";
    if (weekday === 0) return "font-normal text-[#DE1D1D]";
    if (weekday === 6) return "font-normal text-[#106AD9]";
    return isRange
      ? "font-semibold text-[#5B3A29]"
      : "font-normal text-[#5B3A29]";
  }, [isEndpoint, isPast, isRange, weekday]);

  return (
    <button
      className="relative flex size-10 items-center justify-center border-0 bg-transparent p-0 text-xs leading-[1.253]"
      disabled={isPast}
      onClick={() => onSelectDay(day)}
      type="button"
    >
      {isStart && hasRange ? (
        <span className="absolute right-0 top-[3px] h-[34px] w-1/2 bg-[#D9D9D9]" />
      ) : null}
      {isRange ? <span className="absolute inset-x-0 top-[3px] h-[34px] bg-[#D9D9D9]" /> : null}
      {isEnd && hasRange ? (
        <span className="absolute left-0 top-[3px] h-[34px] w-1/2 bg-[#D9D9D9]" />
      ) : null}
      {isEndpoint ? (
        <span className="absolute left-[3px] top-[3px] size-[34px] rounded-full bg-[#FF9A3D]" />
      ) : null}
      <span className={`relative z-10 w-5 text-center ${textClass}`}>{day}</span>
    </button>
  );
}

function GuestPopup({
  guests,
  onApply,
  onChange,
}: {
  guests: Record<GuestKey, number>;
  onApply: () => void;
  onChange: (key: GuestKey, value: number) => void;
}) {
  return (
    <div className="absolute right-0 top-[95px] z-20 flex h-[230px] w-[310px] flex-col items-center gap-2 overflow-hidden rounded-md border-[0.5px] border-[#FF9A3D] bg-white px-[15px] py-[19px] shadow-[0_12px_32px_rgba(91,58,41,0.08)] max-sm:left-1/2 max-sm:right-auto max-sm:-translate-x-1/2">
      <div className="flex w-full items-center gap-2 border-b border-[#FFF6EC] pb-1.5 pl-1.5">
        <h2 className="text-center text-sm font-medium leading-[1.253] text-[#5B3A29]">
          인원 선택
        </h2>
        <button
          className="ml-auto inline-flex h-[29px] items-center justify-center rounded bg-[#FE701E] px-[18px] pb-[5px] pt-[6px] text-xs font-medium leading-[1.253] text-[#FFF6EC]"
          onClick={onApply}
          type="button"
        >
          적용
        </button>
      </div>

      {guestRows.map((row) => (
        <div
          className="flex w-[231px] items-center justify-between py-3"
          key={row.key}
        >
          <div className="flex w-[117.5px] flex-col items-start gap-0.5">
            <p className="text-center text-xs font-medium leading-[1.253] text-black">
              {row.label}
            </p>
            {row.subLabel ? (
              <p className="text-center text-[6px] font-normal leading-[1.6] text-[#6D7A8A]">
                {row.subLabel}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-[13px]">
            <QuantityButton
              disabled={guests[row.key] <= 0}
              label={`${row.label} 줄이기`}
              onClick={() => onChange(row.key, guests[row.key] - 1)}
              type="minus"
            />
            <span className="w-[15px] text-center text-xs font-normal leading-[1.6] text-[#5B3A29]">
              {guests[row.key]}
            </span>
            <QuantityButton
              label={`${row.label} 늘리기`}
              onClick={() => onChange(row.key, guests[row.key] + 1)}
              type="plus"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuantityButton({
  disabled = false,
  label,
  onClick,
  type,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  type: "minus" | "plus";
}) {
  return (
    <button
      aria-label={label}
      className={`inline-flex size-3 items-center justify-center rounded-full ${
        disabled ? "bg-[#CAC4BC] text-white" : "bg-[#FF9A3D] text-white"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {type === "minus" ? (
        <Minus aria-hidden="true" className="size-[8px]" strokeWidth={2} />
      ) : (
        <Plus aria-hidden="true" className="size-[8px]" strokeWidth={2} />
      )}
    </button>
  );
}
