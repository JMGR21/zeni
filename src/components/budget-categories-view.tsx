import { BudgetCategoryCard } from "@/components/budget-category-card";
import { BudgetSummary } from "@/components/budget-summary";
import type { BudgetCategory } from "@/lib/budget";

// Resumen + grid de categorías para la preferencia de "mostrar límite" ya
// resuelta (ver `BudgetPageClient`, que es quien posee ese estado y lo
// comparte con `BudgetHistoryChart`). Con el límite oculto, las tarjetas se
// reordenan por gasto descendente — sin el ancla del límite, comparar el
// monto es lo único que queda por lo que ordenar.
export function BudgetCategoriesView({
  categories,
  showLimits,
}: {
  categories: BudgetCategory[];
  showLimits: boolean;
}) {
  const sortedCategories = showLimits ? categories : [...categories].sort((a, b) => b.spent - a.spent);

  return (
    <div>
      <div className="mt-8">
        <BudgetSummary categories={categories} showLimits={showLimits} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Categorías de gasto
        </h2>
        {sortedCategories.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sortedCategories.map((category) => (
              <BudgetCategoryCard key={category.id} category={category} showLimit={showLimits} />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-ink-muted">Aún no tienes categorías de gasto.</p>
        )}
      </div>
    </div>
  );
}
