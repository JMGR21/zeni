"use client";

import { useTransition } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { resetBudget } from "@/app/(app)/budget/actions";
import { EditBudgetDialog } from "@/components/edit-budget-dialog";
import { resolveBudgetedAmount, type BudgetCategory } from "@/lib/budget";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function BudgetCategoryCard({ category }: { category: BudgetCategory }) {
  const [isResetting, startReset] = useTransition();

  const isCustom = category.customAmount !== null;
  const budgeted = resolveBudgetedAmount(category);
  const overBudget = budgeted !== null && category.spent > budgeted;
  const progressRatio = budgeted ? category.spent / budgeted : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-colors",
          overBudget ? "bg-ki-survival" : "bg-ki-awakening/60",
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{category.name}</p>
          {budgeted !== null ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg text-ink">{currencyFormatter.format(budgeted)}</span>
              <span
                className={cn(
                  "font-mono text-[11px] tracking-widest uppercase",
                  isCustom ? "text-ki-awakening" : "text-ink-muted",
                )}
              >
                {isCustom ? "Tu monto" : "Sugerido"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Necesitas más historial</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isCustom && (
            <button
              type="button"
              aria-label="Volver a la sugerencia automática"
              disabled={isResetting}
              onClick={() => startReset(() => resetBudget(category.id))}
              className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          <EditBudgetDialog categoryId={category.id} categoryName={category.name} initialAmount={budgeted} />
        </div>
      </div>

      {budgeted !== null && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
            <div
              className={cn("h-full rounded-full transition-all", overBudget ? "bg-ki-survival" : "bg-ki-awakening")}
              style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            <span>
              Carga actual{" "}
              <span className={cn("text-ink", overBudget && "text-ki-survival")}>
                {currencyFormatter.format(category.spent)}
              </span>
            </span>
            <span className={cn(overBudget && "text-ki-survival")}>{progressRatio.toFixed(1)}×</span>
          </div>
          {overBudget && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ki-survival">
              <TriangleAlert className="size-3.5" aria-hidden="true" />
              Gravedad excedida
            </p>
          )}
        </div>
      )}
    </div>
  );
}
