import { GiWeightLiftingUp } from "react-icons/gi";
import { BudgetPageClient } from "@/components/budget-page-client";
import { MonthSelector } from "@/components/month-selector";
import {
  getCategorySpendingHistory,
  getSuggestedBudget,
  resolveBudgetedAmount,
  type BudgetCategory,
} from "@/lib/budget";
import { computePeriodStart, parsePeriodISODate, toISODate } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function monthRange(monthStart: Date) {
  const start = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const end = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
  return { start: toISODate(start), end: toISODate(end) };
}

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const currentMonthStart = computePeriodStart(new Date(), 1);
  const monthParam = firstParam(params.month);
  const requestedMonth = monthParam && ISO_DATE_RE.test(monthParam) ? parsePeriodISODate(monthParam) : currentMonthStart;
  // No tiene sentido navegar a un mes futuro — no hay gasto real que mostrar.
  const selectedMonth = requestedMonth.getTime() > currentMonthStart.getTime() ? currentMonthStart : requestedMonth;
  const isCurrentMonth = toISODate(selectedMonth) === toISODate(currentMonthStart);

  const { start, end } = monthRange(selectedMonth);

  const [{ data: categories }, { data: budgets }, { data: monthExpenses }, history] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name")
      .eq("type", "expense")
      .eq("active", true)
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
    getCategorySpendingHistory(supabase, user.id),
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
      suggestion: await getSuggestedBudget(supabase, user.id, category.id, selectedMonth),
    })),
  );

  const budgetedByCategory: Record<string, number | null> = {};
  let totalBudgeted = 0;
  for (const category of budgetCategories) {
    const budgeted = resolveBudgetedAmount(category);
    budgetedByCategory[category.id] = budgeted;
    if (budgeted !== null) totalBudgeted += budgeted;
  }

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <GiWeightLiftingUp className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Cámara de gravedad
      </div>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Presupuesto</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Cada categoría entrena bajo su propio límite de gravedad, calculado a partir de tu gasto real de los
        últimos 3 meses. Personaliza el límite cuando quieras, o navega meses anteriores para ver cómo entrenaste.
      </p>

      <div className="mt-6">
        <MonthSelector monthISO={toISODate(selectedMonth)} isCurrentMonth={isCurrentMonth} />
      </div>

      <BudgetPageClient
        categories={budgetCategories}
        history={history}
        historyCategories={categories ?? []}
        budgetedByCategory={budgetedByCategory}
        totalBudgeted={totalBudgeted}
      />
    </section>
  );
}
