import { CalendarClock, Shield, TrendingUp, TriangleAlert, Wallet } from "lucide-react";
import type { ProjectionResult } from "@/lib/projection/engine";
import { StatTile } from "@/components/stat-tile";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "long" });

export function ProjectionSummary({ projection }: { projection: ProjectionResult }) {
  const riskDate = projection.firstNegativeDate ?? projection.firstBelowBufferDate;

  // % en que lo "actual" (lo ya confirmado) se desvía de "final" (el plan
  // completo del mes) — mismo mecanismo de delta que ya usa `StatTile` en
  // el dashboard, solo que aquí compara plan vs. realidad en vez de mes vs.
  // mes anterior.
  const planBase = Math.abs(projection.available) || 1;
  const actualDeltaPercent = ((projection.availableActual - projection.available) / planBase) * 100;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon={<Wallet className="size-4" />} label="Saldo final" value={currencyFormatter.format(projection.projectedFinal)} />
        <StatTile icon={<Shield className="size-4" />} label="Colchón" value={currencyFormatter.format(projection.buffer)} />
        {projection.dailySpendAvailable !== null && (
          <StatTile
            icon={<CalendarClock className="size-4" />}
            label="Gasto diario"
            value={currencyFormatter.format(projection.dailySpendAvailable)}
          />
        )}
        <StatTile
          icon={<TrendingUp className="size-4" />}
          label="Libre final"
          value={currencyFormatter.format(projection.available)}
        />
        <StatTile
          icon={<TrendingUp className="size-4" />}
          label="Libre actual"
          value={currencyFormatter.format(projection.availableActual)}
          delta={{ percent: actualDeltaPercent, direction: "higherIsBetter" }}
          deltaLabel="vs. plan"
        />
      </div>
      {riskDate && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-ki-survival">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          {projection.firstNegativeDate
            ? `Saldo negativo a partir del ${dateFormatter.format(projection.firstNegativeDate)}`
            : `Por debajo del colchón a partir del ${dateFormatter.format(projection.firstBelowBufferDate!)}`}
        </p>
      )}
    </div>
  );
}
