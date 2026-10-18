import type { SupabaseClient } from "@supabase/supabase-js";

export type SuggestedBudget = { available: true; amount: number } | { available: false };

export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  customAmount: number | null;
  suggestion: SuggestedBudget;
};

// El monto que realmente aplica para una categoría: el override manual si
// existe, si no la sugerencia calculada; `null` si no hay ninguno de los
// dos todavía (necesita más historial).
export function resolveBudgetedAmount(category: BudgetCategory): number | null {
  return category.customAmount ?? (category.suggestion.available ? category.suggestion.amount : null);
}

const SUGGESTION_MONTHS = 3;

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(from: Date, monthsAgo: number) {
  return new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1);
}

/**
 * Promedio de gasto mensual en los últimos SUGGESTION_MONTHS meses
 * calendario completos (el mes en curso no cuenta, sigue incompleto) —
 * `categoryId: null` para el gasto TOTAL del usuario (todas las
 * categorías), o el id de una categoría para el gasto solo de esa.
 *
 * Devuelve `available: false` si el usuario no tiene todavía un mes
 * calendario completo de historial, o si no hubo gasto (de esa categoría,
 * o total) en la ventana — en ambos casos no hay base suficiente para no
 * inventar un número.
 */
async function getAverageMonthlyExpenseAmount(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string | null,
  now: Date,
): Promise<SuggestedBudget> {
  const currentMonthStart = toISODate(monthStart(now, 0));

  const { data: earliest } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("user_id", userId)
    .order("occurred_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!earliest || earliest.occurred_on >= currentMonthStart) {
    return { available: false };
  }

  const windowStart = toISODate(monthStart(now, SUGGESTION_MONTHS));

  let query = supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("occurred_on", windowStart)
    .lt("occurred_on", currentMonthStart);
  if (categoryId !== null) {
    query = query.eq("category_id", categoryId);
  }

  const { data: rows } = await query;

  if (!rows || rows.length === 0) {
    return { available: false };
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return { available: true, amount: total / SUGGESTION_MONTHS };
}

/** Presupuesto sugerido para una categoría de gasto — ver `getAverageMonthlyExpenseAmount`. */
export async function getSuggestedBudget(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string,
  now: Date = new Date(),
): Promise<SuggestedBudget> {
  return getAverageMonthlyExpenseAmount(supabase, userId, categoryId, now);
}

/**
 * Gasto mensual promedio TOTAL del usuario (todas las categorías), misma
 * ventana que `getSuggestedBudget` — usado por los logros de "colchón"/
 * fondo de emergencia (Categoría H), que miden contra el gasto real del
 * usuario en vez de un monto fijo.
 */
export async function getAverageMonthlyExpense(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<SuggestedBudget> {
  return getAverageMonthlyExpenseAmount(supabase, userId, null, now);
}

/**
 * Si un mes calendario (ya cerrado o no) se mantuvo dentro del presupuesto
 * total — misma lógica que `budget-summary.tsx`: gastado total (de las
 * categorías con un monto presupuestado, sugerido o manual) contra el
 * presupuesto total de esas mismas categorías. Sin ninguna categoría
 * presupuestada no hay base para calificar el mes como cumplido.
 */
export async function wasMonthWithinBudget(
  supabase: SupabaseClient,
  userId: string,
  monthStart: Date,
): Promise<boolean> {
  const start = toISODate(monthStart);
  const end = toISODate(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1));

  const [{ data: categories }, { data: budgets }, { data: transactions }] = await Promise.all([
    supabase.from("categories").select("id").eq("user_id", userId).eq("type", "expense"),
    supabase.from("budgets").select("category_id, amount").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("category_id, amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("occurred_on", start)
      .lt("occurred_on", end),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const row of transactions ?? []) {
    if (!row.category_id) continue;
    spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + row.amount);
  }
  const budgetByCategory = new Map((budgets ?? []).map((row) => [row.category_id, row.amount]));

  const budgetCategories: BudgetCategory[] = await Promise.all(
    (categories ?? []).map(async (category) => ({
      id: category.id,
      name: "",
      spent: spentByCategory.get(category.id) ?? 0,
      customAmount: budgetByCategory.get(category.id) ?? null,
      suggestion: await getSuggestedBudget(supabase, userId, category.id, monthStart),
    })),
  );

  const { totalBudget, totalSpent } = budgetCategories.reduce(
    (acc, category) => {
      const budgeted = resolveBudgetedAmount(category);
      if (budgeted === null) return acc;
      acc.totalBudget += budgeted;
      acc.totalSpent += category.spent;
      return acc;
    },
    { totalBudget: 0, totalSpent: 0 },
  );

  return totalBudget > 0 && totalSpent <= totalBudget;
}

export type HistoryBucket = { label: string; total: number; byCategory: Record<string, number> };
export type SpendingHistory = { week: HistoryBucket[]; month: HistoryBucket[]; year: HistoryBucket[] };

const WEEK_BUCKETS = 12;
const MONTH_BUCKETS = 12;
const YEAR_BUCKETS = 5;

// Lunes de la semana que contiene `date` — igual criterio ISO que el resto
// del proyecto usa implícitamente para "semana" (no se usó antes, primer
// lugar que necesita agrupar por semana).
function mondayOf(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/**
 * Histórico de gasto por categoría en 3 granularidades a la vez (semana,
 * mes, año) — una sola consulta sobre la ventana más amplia (años) y
 * agregación en memoria, mismo patrón que `getFiftyThirtyTwentyHistory`.
 * Cada bucket trae el total (todo el gasto, incluido sin categoría) y el
 * desglose por categoría (`byCategory`, sin incluir transacciones sin
 * categoría — mismo criterio que el resto de los mapas de gasto por
 * categoría del proyecto).
 */
export async function getCategorySpendingHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<SpendingHistory> {
  const now = new Date();
  const earliestStart = toISODate(new Date(now.getFullYear() - (YEAR_BUCKETS - 1), 0, 1));
  const rangeEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  const { data: rows } = await supabase
    .from("transactions")
    .select("category_id, amount, occurred_on")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("occurred_on", earliestStart)
    .lt("occurred_on", rangeEnd)
    .returns<{ category_id: string | null; amount: number; occurred_on: string }[]>();

  const monthBuckets = new Map<string, HistoryBucket>();
  for (let i = 0; i < MONTH_BUCKETS; i++) {
    const start = toISODate(monthStart(now, MONTH_BUCKETS - 1 - i));
    monthBuckets.set(start, { label: start, total: 0, byCategory: {} });
  }

  const currentWeekStart = mondayOf(now);
  const weekBuckets = new Map<string, HistoryBucket>();
  for (let i = 0; i < WEEK_BUCKETS; i++) {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - 7 * (WEEK_BUCKETS - 1 - i));
    const key = toISODate(start);
    weekBuckets.set(key, { label: key, total: 0, byCategory: {} });
  }

  const yearBuckets = new Map<string, HistoryBucket>();
  for (let i = 0; i < YEAR_BUCKETS; i++) {
    const year = String(now.getFullYear() - (YEAR_BUCKETS - 1) + i);
    yearBuckets.set(year, { label: year, total: 0, byCategory: {} });
  }

  for (const row of rows ?? []) {
    const occurred = new Date(`${row.occurred_on}T00:00:00`);

    const monthBucket = monthBuckets.get(toISODate(new Date(occurred.getFullYear(), occurred.getMonth(), 1)));
    const weekBucket = weekBuckets.get(toISODate(mondayOf(occurred)));
    const yearBucket = yearBuckets.get(String(occurred.getFullYear()));

    for (const bucket of [monthBucket, weekBucket, yearBucket]) {
      if (!bucket) continue;
      bucket.total += row.amount;
      if (row.category_id) {
        bucket.byCategory[row.category_id] = (bucket.byCategory[row.category_id] ?? 0) + row.amount;
      }
    }
  }

  return {
    week: Array.from(weekBuckets.values()),
    month: Array.from(monthBuckets.values()),
    year: Array.from(yearBuckets.values()),
  };
}
