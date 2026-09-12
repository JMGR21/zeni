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
 * Presupuesto sugerido para una categoría de gasto: el promedio de gasto
 * mensual en los últimos SUGGESTION_MONTHS meses calendario completos (el
 * mes en curso no cuenta, sigue incompleto).
 *
 * Devuelve `available: false` si el usuario no tiene todavía un mes
 * calendario completo de historial (en cualquier categoría) o si esta
 * categoría en particular no tuvo gasto en la ventana de sugerencia —
 * en ambos casos no hay base suficiente para no inventar un número.
 */
export async function getSuggestedBudget(
  supabase: SupabaseClient,
  userId: string,
  categoryId: string,
  now: Date = new Date(),
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

  const { data: rows } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("category_id", categoryId)
    .eq("type", "expense")
    .gte("occurred_on", windowStart)
    .lt("occurred_on", currentMonthStart);

  if (!rows || rows.length === 0) {
    return { available: false };
  }

  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  return { available: true, amount: total / SUGGESTION_MONTHS };
}
