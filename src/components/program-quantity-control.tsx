"use client";

import Image from "next/image";
import { nuvioIcons } from "@/components/icons/nuvio-icons";

type ProgramQuantityControlProps = {
  className?: string;
  countClassName?: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  value: number;
};

export function ProgramQuantityControl({
  className,
  countClassName,
  max = 99,
  min = 0,
  onChange,
  value,
}: ProgramQuantityControlProps) {
  const safeMin = Math.max(0, min);
  const safeMax = Math.max(safeMin, max);
  const currentValue = clampQuantity(value, safeMin, safeMax);
  const canDecrease = currentValue > safeMin;
  const canIncrease = currentValue < safeMax;

  return (
    <div className={`flex items-center gap-[17px] ${className ?? ""}`}>
      <QuantityIconButton
        ariaLabel="인원 줄이기"
        disabled={!canDecrease}
        icon={canDecrease ? nuvioIcons.quantityMinus : nuvioIcons.quantityDisabled}
        onClick={() => onChange(clampQuantity(currentValue - 1, safeMin, safeMax))}
      />
      <b
        aria-live="polite"
        className={`min-w-[16px] text-center text-xs font-normal leading-[1.6] text-[#6D7A8A] ${countClassName ?? ""}`}
      >
        {String(currentValue).padStart(2, "0")}
      </b>
      <QuantityIconButton
        ariaLabel="인원 늘리기"
        disabled={!canIncrease}
        icon={canIncrease ? nuvioIcons.quantityPlus : nuvioIcons.quantityPlusDisabled}
        onClick={() => onChange(clampQuantity(currentValue + 1, safeMin, safeMax))}
      />
    </div>
  );
}

function QuantityIconButton({
  ariaLabel,
  disabled,
  icon,
  onClick,
}: {
  ariaLabel: string;
  disabled: boolean;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel}
      className="inline-flex size-[14px] items-center justify-center rounded-full border-0 bg-transparent p-0 transition-opacity disabled:cursor-not-allowed disabled:opacity-100"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Image alt="" aria-hidden="true" height={18} src={icon} width={18} />
    </button>
  );
}

function clampQuantity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}
