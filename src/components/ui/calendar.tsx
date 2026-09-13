"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Grid mensual de fecha único, hecho a mano (sin librería externa) para
 * coincidir con el vocabulario visual ya establecido — reutilizado por el
 * paso de fecha del wizard de transacción y por `DatePicker` (filtros).
 */
export function Calendar({
  selected,
  onSelect,
  showShortcuts = true,
  className,
}: {
  selected: Date | null;
  onSelect: (date: Date) => void;
  showShortcuts?: boolean;
  className?: string;
}) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(() => {
    const base = selected ?? today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const cells = monthGrid(viewDate);
  const monthLabel = viewDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className={cn("w-72 space-y-3", className)}>
      {showShortcuts && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelect(today)}
            className="rounded-full border border-ink-muted/15 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ki-awakening/40 hover:text-ink"
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={() => onSelect(yesterday)}
            className="rounded-full border border-ink-muted/15 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ki-awakening/40 hover:text-ink"
          >
            Ayer
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-display text-sm text-ink capitalize">{monthLabel}</span>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 justify-items-center gap-1.5 text-center font-mono text-[11px] text-ink-muted">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index} className="flex h-6 items-center justify-center">
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 justify-items-center gap-1.5">
        {cells.map((date, index) => {
          if (!date) return <span key={index} />;
          const active = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-sm text-ink transition-colors hover:bg-ink-muted/10",
                active && "bg-ki-awakening font-semibold text-void hover:bg-ki-awakening",
                isToday && !active && "ring-1 ring-ki-awakening/50 ring-inset",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
