import { statusLabels } from "./data";
import type { Program, ProgramStatus } from "./types";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const compactDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}

export function formatRange(start: string, end: string): string {
  return `${compactDateFormatter.format(new Date(start))} - ${compactDateFormatter.format(
    new Date(end),
  )}`;
}

export function formatWon(value: number): string {
  if (value <= 0) return "혜택형";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDday(endDate: string, status: ProgramStatus): string {
  if (status === "closed") return "모집종료";
  if (status === "earlyClosed") return "조기종료";

  const today = new Date("2026-05-04T00:00:00+09:00");
  const end = new Date(`${endDate}T23:59:59+09:00`);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0) return "마감";
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

export function getStatusTone(status: ProgramStatus): string {
  switch (status) {
    case "open":
      return "bg-teal-50 text-teal-700 ring-teal-200";
    case "upcoming":
      return "bg-amber-50 text-amber-800 ring-amber-200";
    case "earlyClosed":
      return "bg-rose-50 text-rose-700 ring-rose-200";
    case "closed":
      return "bg-slate-100 text-slate-600 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

export function getProgramStatusText(program: Program): string {
  return statusLabels[program.status];
}
