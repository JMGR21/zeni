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

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={<Wallet className="size-4" />} label="Saldo final" value={currencyFormatter.format(projection.projectedFinal)} />
        <StatTile icon={<Shield className="size-4" />} label="Colchón" value={currencyFormatter.format(projection.buffer)} />
        <StatTile icon={<TrendingUp className="size-4" />} label="Disponible" value={currencyFormatter.format(projection.available)} />
        {projection.dailySpendAvailable !== null && (
          <StatTile
            icon={<CalendarClock className="size-4" />}
            label="Gasto diario"
            value={currencyFormatter.format(projection.dailySpendAvailable)}
          />
        )}
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
