"use client";

import { useState } from "react";
import { cn } from "cn";
import { IncomeExpenseChart } from "@/components/income-expense-chart";
import { KiEvolutionChart, type KiScorePoint } from "@/components/ki-evolution-chart";
import type { MonthlyFlow } from "@/lib/monthly-summary";

type View = "flow" | "ki";

const OPTIONS: { view: View; label: string }[] = [
  { view: "flow", label: "Ingresos/Gastos" },
  { view: "ki", label: "Ki" },
];

// Tarjeta central del dashboard: un toggle entre el flujo mensual (nuevo)
// y la evolución de Ki (ya existente) — reutiliza KiEvolutionChart tal
// cual en vez de duplicar su lógica, así que al ver "Ki" aparece anidada
// en su propia tarjeta con su propio título.
export function TrendChartCard({ monthlyFlow, kiHistory }: { monthlyFlow: MonthlyFlow[]; kiHistory: KiScorePoint[] }) {
  const [view, setView] = useState<View>("flow");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">Tendencia</h2>
        <div className="flex gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
          {OPTIONS.map((option) => (
            <button
              key={option.view}
              type="button"
              onClick={() => setView(option.view)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                view === option.view ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {view === "flow" ? (
        <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
          <IncomeExpenseChart data={monthlyFlow} />
        </div>
      ) : (
        <KiEvolutionChart points={kiHistory} />
      )}
    </div>
  );
}
