"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useState } from "react";

const regionOptions = [
  "수도권",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
];

export function SearchPage({ currentMonth }: { currentMonth: number }) {
  const router = useRouter();
  const monthOptions = getVisibleMonthOptions(currentMonth);
  const [keyword, setKeyword] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [showDetailedDates, setShowDetailedDates] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  function resetSearch() {
    setKeyword("");
    setSelectedRegion("");
    setSelectedMonth("");
    setShowDetailedDates(false);
    setStartDate("");
    setEndDate("");
  }

  function submitSearch() {
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("q", keyword.trim());
    if (selectedRegion) params.set("region", selectedRegion);
    if (selectedMonth) params.set("month", selectedMonth);
    if (showDetailedDates && startDate) params.set("start", startDate);
    if (showDetailedDates && endDate) params.set("end", endDate);

    const query = params.toString();
    router.push(query ? `/?${query}` : "/");
  }

  return (
    <div className="font-pretendard flex justify-center bg-[#F3F3F3] px-4 pb-10">
      <section className="relative w-[min(636px,100%)] bg-white px-[13px] py-[9px]">
        <div className="mx-auto flex w-full max-w-[592px] flex-col items-center pb-[10px] pt-4">
          <div className="flex w-full justify-end pr-3">
            <Link
              aria-label="검색 닫기"
              className="inline-flex size-11 items-center justify-center text-[#5B3A29] transition-colors hover:text-[#FE701E] min-[1100px]:size-[17px]"
              href="/"
            >
              <X aria-hidden="true" className="size-[17px]" strokeWidth={1.8} />
            </Link>
          </div>

          <h1 className="pb-[22px] pt-0.5 text-center text-sm font-semibold leading-[1.253] text-[#5B3A29]">
            어떤 여행을 떠나고 싶나요?
          </h1>

          <label className="flex w-full items-center gap-3 rounded-2xl border border-[#FF9A3D] bg-white px-4 py-[11px]">
            <Search
              aria-hidden="true"
              className="size-[14px] shrink-0 text-[#FF9A3D]"
              strokeWidth={2}
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-base font-normal leading-[1.6] text-[#5B3A29] outline-none placeholder:text-[#6D7A8A] min-[1100px]:text-xs"
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitSearch();
              }}
              placeholder="새로운 여행 프로그램을 검색해보세요"
              type="search"
              value={keyword}
            />
          </label>
        </div>

        <FilterSection
          items={regionOptions}
          onSelect={(value) => setSelectedRegion(toggleValue(selectedRegion, value))}
          selectedValue={selectedRegion}
          title="지역"
        />
        <FilterSection
          items={monthOptions}
          className="pb-4"
          onSelect={(value) => setSelectedMonth(toggleValue(selectedMonth, value))}
          selectedValue={selectedMonth}
          title="일정"
        />

        <section className="flex w-full flex-col items-center border-t-[0.8px] border-[#FFF6EC]">
          <button
            className="flex w-full items-center justify-between px-4 py-4 text-sm font-semibold leading-[1.253] text-[#5B3A29]"
            onClick={() => setShowDetailedDates((value) => !value)}
            type="button"
          >
            세부 일정
            <span className="text-xs font-medium text-[#FF9A3D]">
              {showDetailedDates ? "접기" : "더보기"}
            </span>
          </button>
          {showDetailedDates ? (
            <div className="grid w-full max-w-[574px] gap-2 px-4 pb-4 sm:grid-cols-2">
              <label className="grid gap-1 text-xs font-semibold text-[#6D7A8A]">
                시작일
                <input
                  className="h-11 rounded border border-[#E8E7E2] px-3 text-base text-[#5B3A29] outline-none focus:border-[#FF9A3D] min-[1100px]:h-[34px] min-[1100px]:text-xs"
                  onChange={(event) => setStartDate(event.target.value)}
                  type="date"
                  value={startDate}
                />
              </label>
              <label className="grid gap-1 text-xs font-semibold text-[#6D7A8A]">
                종료일
                <input
                  className="h-11 rounded border border-[#E8E7E2] px-3 text-base text-[#5B3A29] outline-none focus:border-[#FF9A3D] min-[1100px]:h-[34px] min-[1100px]:text-xs"
                  onChange={(event) => setEndDate(event.target.value)}
                  type="date"
                  value={endDate}
                />
              </label>
            </div>
          ) : null}
        </section>

        <div className="flex w-full items-center border-t-[0.8px] border-[#FFF6EC] pt-2">
          <button
            className="inline-flex min-h-11 items-center px-4 text-sm font-semibold leading-[1.253] text-[#6D7A8A] min-[1100px]:min-h-0 min-[1100px]:pl-4 min-[1100px]:pr-0"
            onClick={resetSearch}
            type="button"
          >
            초기화
          </button>
          <button
            className="ml-auto inline-flex h-11 items-center justify-center rounded bg-[#FE701E] px-[18px] text-sm font-medium leading-[1.253] text-[#FFF6EC] transition-colors hover:bg-[#f05f12] min-[1100px]:h-[29px] min-[1100px]:pb-[5px] min-[1100px]:pt-[6px] min-[1100px]:text-xs"
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

function FilterSection({
  className = "",
  items,
  onSelect,
  selectedValue,
  title,
}: {
  className?: string;
  items: string[];
  onSelect: (value: string) => void;
  selectedValue: string;
  title: string;
}) {
  return (
    <section className={`flex w-full flex-col items-center ${className}`}>
      <div className="flex w-full items-center p-4">
        <h2 className="text-center text-sm font-semibold leading-[1.253] text-[#5B3A29]">
          {title}
        </h2>
      </div>
      <div className="flex w-full max-w-[574px] flex-wrap gap-1.5">
        {items.map((item) => (
          <FilterButton
            key={`${title}-${item}`}
            label={item}
            onClick={() => onSelect(item)}
            selected={selectedValue === item}
          />
        ))}
      </div>
    </section>
  );
}

function FilterButton({
  label,
  onClick,
  selected,
}: {
  label: string;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <button
      className={`h-11 min-w-[110px] rounded-[20px] px-3 text-center text-sm font-bold transition-colors min-[1100px]:h-[30px] min-[1100px]:pb-1.5 min-[1100px]:pt-[5px] min-[1100px]:text-xs ${
        selected
          ? "bg-[#FF9A3D] text-[#F9F9F9]"
          : "bg-[#F3F3F3] text-[#5B3A29] hover:bg-[#FFF6EC]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function toggleValue(current: string, next: string): string {
  return current === next ? "" : next;
}

function getVisibleMonthOptions(currentMonth: number): string[] {
  void currentMonth;

  return Array.from({ length: 12 }, (_, index) => `${index + 1}월`);
}
