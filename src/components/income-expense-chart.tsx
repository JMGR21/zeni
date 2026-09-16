"use client";

import { BarChart } from "@tremor/react";
import type { MonthlyFlow } from "@/lib/monthly-summary";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });

function toChartData(points: MonthlyFlow[]) {
  return points.map((point) => ({
    mes: monthFormatter.format(new Date(`${point.month}T00:00:00`)),
    Ingresos: point.income,
    Gastos: point.expense,
  }));
}

// Único componente del proyecto que le pasa `colors` a Tremor — ver la
// nota en tailwind.config.js sobre el safelist de emerald/rose que esto
// requiere.
export function IncomeExpenseChart({ data }: { data: MonthlyFlow[] }) {
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return <p className="text-sm text-ink-muted">Aún no hay suficiente historial de movimientos para esta gráfica.</p>;
  }

  return (
    <BarChart
      className="h-64"
      data={toChartData(data)}
      index="mes"
      categories={["Ingresos", "Gastos"]}
      colors={["emerald", "rose"]}
      valueFormatter={(value: number) => currencyFormatter.format(value)}
      showAnimation
    />
  );
}
