"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePeriodISODate, shiftPeriodStart, toISODate } from "@/lib/period";

const monthYearFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Navegador de mes calendario para el detalle del instrumento — a
// diferencia de `PeriodSelector` (Fase 10), este instrumento siempre opera
// sobre mes calendario real (día 1 a fin de mes, ver nota en
// `computeFiftyThirtyTwenty`), así que reutiliza `shiftPeriodStart` con
// `startDay = 1` en vez de duplicar la aritmética de meses.
export function FiftyThirtyTwentyMonthSelector({
  monthISO,
  isCurrentMonth,
}: {
  monthISO: string;
  isCurrentMonth: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToOffset(offset: number) {
    const next = shiftPeriodStart(parsePeriodISODate(monthISO), 1, offset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", toISODate(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToCurrentMonth() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("month");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  const label = capitalize(monthYearFormatter.format(parsePeriodISODate(monthISO)));

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Mes anterior"
        onClick={() => goToOffset(-1)}
        className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>
      <span className="min-w-32 text-center text-sm text-ink">{label}</span>
      <button
        type="button"
        aria-label="Mes siguiente"
        onClick={() => goToOffset(1)}
        disabled={isCurrentMonth}
        className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
      {!isCurrentMonth && (
        <button
          type="button"
          onClick={goToCurrentMonth}
          className="ml-2 text-xs font-medium text-ki-awakening hover:underline"
        >
          Mes actual
        </button>
      )}
    </div>
  );
}
