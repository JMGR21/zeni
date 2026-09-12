import { GiWeightLiftingUp } from "react-icons/gi";
import { AppHeader } from "@/components/app-header";
import { BudgetCategoryCard } from "@/components/budget-category-card";
import { BudgetSummary } from "@/components/budget-summary";
import { getSuggestedBudget, type BudgetCategory } from "@/lib/budget";
import { createClient } from "@/lib/supabase/server";

function monthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function BudgetPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { start, end } = monthRange(new Date());

  const [{ data: categories }, { data: budgets }, { data: monthExpenses }] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("type", "expense")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    supabase.from("budgets").select("category_id, amount").returns<{ category_id: string; amount: number }[]>(),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("type", "expense")
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .returns<{ category_id: string | null; amount: number }[]>(),
  ]);

  const customAmountByCategory = new Map((budgets ?? []).map((budget) => [budget.category_id, budget.amount]));
  const spentByCategory = new Map<string, number>();
  for (const transaction of monthExpenses ?? []) {
    if (!transaction.category_id) continue;
    spentByCategory.set(
      transaction.category_id,
      (spentByCategory.get(transaction.category_id) ?? 0) + transaction.amount,
    );
  }

  const budgetCategories: BudgetCategory[] = await Promise.all(
    (categories ?? []).map(async (category) => ({
      id: category.id,
      name: category.name,
      spent: spentByCategory.get(category.id) ?? 0,
      customAmount: customAmountByCategory.get(category.id) ?? null,
      suggestion: await getSuggestedBudget(supabase, user.id, category.id),
    })),
  );

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="budget" />

      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
          <GiWeightLiftingUp className="size-3.5 text-ki-awakening" aria-hidden="true" />
          Cámara de gravedad
        </div>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Presupuesto</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Cada categoría entrena bajo su propio límite de gravedad, calculado a partir de tu gasto real de los
          últimos 3 meses. Personaliza el límite cuando quieras.
        </p>

        <div className="mt-8">
          <BudgetSummary categories={budgetCategories} />
        </div>

        <div className="mt-8">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
            Categorías de gasto
          </h2>
          {budgetCategories.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {budgetCategories.map((category) => (
                <BudgetCategoryCard key={category.id} category={category} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-muted">Aún no tienes categorías de gasto.</p>
          )}
        </div>
      </section>
    </div>
  );
}
