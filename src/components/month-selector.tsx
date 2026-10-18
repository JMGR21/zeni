"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePeriodISODate, shiftPeriodStart, toISODate } from "@/lib/period";

const monthYearFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Navegador de mes calendario genérico vía query param (`startDay = 1`,
// siempre mes calendario real) — usado por cualquier pantalla que
// necesite navegar mes a mes sin repetir esta lógica (Regla 50/30/20,
// Presupuesto). `paramName` permite más de un selector de fecha en la
// misma página sin pisarse.
export function MonthSelector({
  monthISO,
  isCurrentMonth,
  paramName = "month",
}: {
  monthISO: string;
  isCurrentMonth: boolean;
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToOffset(offset: number) {
    const next = shiftPeriodStart(parsePeriodISODate(monthISO), 1, offset);
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, toISODate(next));
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToCurrentMonth() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
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
