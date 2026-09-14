"use client";

import { useState, useTransition } from "react";
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { updateMonthStartDay } from "@/app/(app)/settings/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parsePeriodISODate, shiftPeriodStart, toISODate } from "@/lib/period";

const dayMonthFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });
const monthYearFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatPeriodLabel(periodStart: string, periodEnd: string, monthStartDay: number): string {
  const start = parsePeriodISODate(periodStart);
  if (monthStartDay === 1) return capitalize(monthYearFormatter.format(start));
  const lastDayIncluded = new Date(parsePeriodISODate(periodEnd).getTime() - 86400000);
  return `${dayMonthFormatter.format(start)} – ${dayMonthFormatter.format(lastDayIncluded)}`;
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

// Dropdown del dashboard que combina dos cosas relacionadas pero
// distintas: (1) navegar entre periodos ya calculados con el
// `month_start_day` actual, y (2) cambiar ese día de inicio — ambas viven
// en un solo control porque cambiar el día de inicio siempre te regresa
// al periodo actual (no tendría sentido quedarte viendo un periodo viejo
// con límites que ya no existen).
export function PeriodSelector({
  periodStart,
  periodEnd,
  monthStartDay,
  isCurrentPeriod,
}: {
  periodStart: string;
  periodEnd: string;
  monthStartDay: number;
  isCurrentPeriod: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function goToCurrentPeriod() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("period");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function goToOffset(offset: number) {
    const nextStart = shiftPeriodStart(parsePeriodISODate(periodStart), monthStartDay, offset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", toISODate(nextStart));
    router.push(`${pathname}?${params.toString()}`);
  }

  const label = formatPeriodLabel(periodStart, periodEnd, monthStartDay);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="flex h-9 items-center gap-2 rounded-lg border border-ink-muted/15 bg-void/40 px-3 text-sm text-ink transition-colors hover:border-ki-awakening/50"
          />
        }
      >
        <CalendarRange className="size-3.5 text-ink-muted" aria-hidden="true" />
        {label}
        <ChevronDown className="size-3.5 text-ink-muted" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent>
        {open && (
          <div className="w-64 space-y-4 p-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Periodo anterior"
                onClick={() => goToOffset(-1)}
                className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium text-ink">{label}</span>
              <button
                type="button"
                aria-label="Periodo siguiente"
                onClick={() => goToOffset(1)}
                className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            {!isCurrentPeriod && (
              <button
                type="button"
                onClick={goToCurrentPeriod}
                className="w-full rounded-md border border-ink-muted/15 py-1.5 text-xs font-medium text-ki-awakening transition-colors hover:bg-ki-awakening/10"
              >
                Volver al periodo actual
              </button>
            )}

            <div className="space-y-1.5 border-t border-ink-muted/10 pt-3">
              <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
                El mes inicia el día
              </label>
              <Select
                value={String(monthStartDay)}
                disabled={isPending}
                onValueChange={(next) => {
                  if (!next) return;
                  const day = Number(next);
                  startTransition(async () => {
                    await updateMonthStartDay(day);
                    goToCurrentPeriod();
                  });
                }}
              >
                <SelectTrigger aria-label="El mes inicia el día" className="h-9 w-full">
                  <SelectValue>{(value: string) => `Día ${value}`}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      Día {day}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-ink-muted">
                {monthStartDay === 1
                  ? "Mes calendario clásico (día 1 a fin de mes)."
                  : `Cada periodo va del día ${monthStartDay} al día ${monthStartDay - 1} del mes siguiente.`}
              </p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
