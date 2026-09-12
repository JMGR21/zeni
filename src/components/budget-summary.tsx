import { cn } from "cn";
import { resolveBudgetedAmount, type BudgetCategory } from "@/lib/budget";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function BudgetSummary({ categories }: { categories: BudgetCategory[] }) {
  // Solo cuentan las categorías con un monto real (sugerido o personalizado):
  // si sumáramos gasto de categorías sin presupuesto, el % dejaría de cuadrar
  // con el total de presupuesto de arriba.
  const withBudget = categories.reduce(
    (acc, category) => {
      const budgeted = resolveBudgetedAmount(category);
      if (budgeted === null) return acc;
      acc.totalBudget += budgeted;
      acc.totalSpent += category.spent;
      return acc;
    },
    { totalBudget: 0, totalSpent: 0 },
  );

  const { totalBudget, totalSpent } = withBudget;
  const hasBudget = totalBudget > 0;
  const remaining = totalBudget - totalSpent;
  const overBudget = hasBudget && totalSpent > totalBudget;
  const percentUsed = hasBudget ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 p-5">
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-1 transition-colors",
          overBudget ? "bg-ki-survival" : "bg-ki-awakening/60",
        )}
      />

      {hasBudget ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className={cn("font-mono text-4xl text-ink", overBudget && "text-ki-survival")}>
              {Math.round(percentUsed)}%
            </span>
            <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">usado este mes</span>
          </div>

          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
            <div
              className={cn("h-full rounded-full transition-all", overBudget ? "bg-ki-survival" : "bg-ki-awakening")}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Gastado</p>
              <p className="mt-1 font-mono text-sm text-red-400">{currencyFormatter.format(totalSpent)}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Presupuesto</p>
              <p className="mt-1 font-mono text-sm text-ink">{currencyFormatter.format(totalBudget)}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Restante</p>
              <p className={cn("mt-1 font-mono text-sm", remaining < 0 ? "text-ki-survival" : "text-emerald-400")}>
                {currencyFormatter.format(remaining)}
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-ink-muted">
          Aún no hay presupuesto suficiente para un resumen — personaliza una categoría o espera a tener más
          historial.
        </p>
      )}
    </div>
  );
}
