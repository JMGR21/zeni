"use client";

import { useState } from "react";
import { BarChart } from "@tremor/react";
import { History } from "lucide-react";
import { cn } from "cn";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SpendingHistory } from "@/lib/budget";

type Granularity = "week" | "month" | "year";

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
  { value: "year", label: "Año" },
];

const ALL_VALUE = "__all__";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const weekFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });
const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });

function labelFor(granularity: Granularity, label: string): string {
  if (granularity === "year") return label;
  const date = new Date(`${label}T00:00:00`);
  return granularity === "week" ? weekFormatter.format(date) : monthFormatter.format(date);
}

// El límite mensual configurado no existe por semana/año de forma nativa
// — se proyecta como referencia informativa (no es un tope estricto de esa
// granularidad, solo una escala del mismo número mensual).
const REFERENCE_SCALE: Record<Granularity, number> = {
  week: 7 / 30.44,
  month: 1,
  year: 12,
};

export type BudgetHistoryCategory = { id: string; name: string };

export function BudgetHistoryChart({
  history,
  categories,
  budgetedByCategory,
  totalBudgeted,
  showLimits,
}: {
  history: SpendingHistory;
  categories: BudgetHistoryCategory[];
  budgetedByCategory: Record<string, number | null>;
  totalBudgeted: number;
  showLimits: boolean;
}) {
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [categoryId, setCategoryId] = useState<string>(ALL_VALUE);

  const buckets = history[granularity];
  const chartData = buckets.map((bucket) => ({
    periodo: labelFor(granularity, bucket.label),
    Gasto: categoryId === ALL_VALUE ? bucket.total : bucket.byCategory[categoryId] ?? 0,
  }));

  const hasData = chartData.some((point) => point.Gasto > 0);
  const referenceAmount = categoryId === ALL_VALUE ? totalBudgeted : budgetedByCategory[categoryId] ?? null;
  const scaledReference = referenceAmount !== null && referenceAmount > 0 ? referenceAmount * REFERENCE_SCALE[granularity] : null;
  const selectedCategoryLabel =
    categoryId === ALL_VALUE ? "Todas las categorías" : categories.find((category) => category.id === categoryId)?.name ?? "";

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <History className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Histórico de gasto
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        Compara cuándo y cuánto se gasta a través del tiempo, por categoría o en total.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)}>
          <SelectTrigger aria-label="Categoría del histórico" className="h-8 w-48 text-xs">
            <SelectValue>{() => selectedCategoryLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
          {GRANULARITY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGranularity(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                granularity === option.value ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {showLimits && scaledReference !== null && (
        <p className="mt-3 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          Límite de referencia por {GRANULARITY_OPTIONS.find((option) => option.value === granularity)?.label.toLowerCase()}:{" "}
          <span className="text-ki-awakening">{currencyFormatter.format(scaledReference)}</span>
        </p>
      )}

      {hasData ? (
        <BarChart
          className="mt-4 h-64"
          data={chartData}
          index="periodo"
          categories={["Gasto"]}
          valueFormatter={(value: number) => currencyFormatter.format(value)}
          showAnimation
        />
      ) : (
        <p className="mt-4 text-sm text-ink-muted">Aún no hay gasto registrado en este periodo.</p>
      )}
    </div>
  );
}
