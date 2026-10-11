"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parsePeriodISODate, shiftPeriodStart, toISODate } from "@/lib/period";

const monthYearFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// A diferencia de `FiftyThirtyTwentyMonthSelector` (que solo mira historial
// y deshabilita el mes siguiente), la Proyección es una herramienta hacia
// adelante — navegar a meses futuros es el caso de uso principal, así que
// no hay límite superior.
export function ProjectionMonthNav({ monthISO }: { monthISO: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function goToOffset(offset: number) {
    const next = shiftPeriodStart(parsePeriodISODate(monthISO), 1, offset);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", toISODate(next));
    params.delete("scenario");
    router.push(`${pathname}?${params.toString()}`);
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
        className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
