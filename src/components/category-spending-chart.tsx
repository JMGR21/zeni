"use client";

import { BarList } from "@tremor/react";
import { ChartPie } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

export type CategorySpending = { name: string; value: number };

export function CategorySpendingChart({ data }: { data: CategorySpending[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
          <ChartPie className="size-3.5 text-ki-awakening" aria-hidden="true" />
          Gasto por categoría
        </div>
        <p className="mt-4 text-sm text-ink-muted">Aún no hay gastos este mes.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <ChartPie className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Gasto por categoría
      </div>
      <BarList className="mt-4" data={data} valueFormatter={(value: number) => currencyFormatter.format(value)} />
    </div>
  );
}
