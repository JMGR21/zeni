import type { SupabaseClient } from "@supabase/supabase-js";

export interface FiftyThirtyTwentyResult {
  necessityAmount: number;
  wantAmount: number;
  savingsAmount: number;
  unclassifiedAmount: number;
  necessityPct: number;
  wantPct: number;
  savingsPct: number;
  unclassifiedPct: number;
}

export type FiftyThirtyTwentyMonth = { month: string; result: FiftyThirtyTwentyResult | null };

type BudgetGroup = "necesidad" | "deseo" | "ahorro" | null;

type Bucket = {
  income: number;
  necessityAmount: number;
  wantAmount: number;
  savingsAmount: number;
  unclassifiedAmount: number;
};

function emptyBucket(): Bucket {
  return { income: 0, necessityAmount: 0, wantAmount: 0, savingsAmount: 0, unclassifiedAmount: 0 };
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthStart(date: Date, offsetMonths: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + offsetMonths, 1);
}

// `income = 0` no tiene base sobre la cual calcular porcentajes, así que
// devuelve `null` en vez de una división por cero.
function bucketToResult(bucket: Bucket): FiftyThirtyTwentyResult | null {
  if (bucket.income <= 0) return null;
  return {
    necessityAmount: bucket.necessityAmount,
    wantAmount: bucket.wantAmount,
    savingsAmount: bucket.savingsAmount,
    unclassifiedAmount: bucket.unclassifiedAmount,
    necessityPct: (bucket.necessityAmount / bucket.income) * 100,
    wantPct: (bucket.wantAmount / bucket.income) * 100,
    savingsPct: (bucket.savingsAmount / bucket.income) * 100,
    unclassifiedPct: (bucket.unclassifiedAmount / bucket.income) * 100,
  };
}

/**
 * Reparte una transacción de gasto (ya excluidas las vinculadas a Dragón,
 * ver nota en `computeFiftyThirtyTwenty`) en el bucket que le corresponde
 * según `budget_group` de su categoría — `ahorro` cuenta como el 20% de
 * Ahorro/Deuda (deudas pagadas sin llevarse como Dragón), `necesidad`/
 * `deseo` van directo, y sin clasificar (o sin categoría) es "sin clasificar".
 */
function applyExpense(bucket: Bucket, amount: number, group: BudgetGroup | undefined) {
  if (group === "necesidad") bucket.necessityAmount += amount;
  else if (group === "deseo") bucket.wantAmount += amount;
  else if (group === "ahorro") bucket.savingsAmount += amount;
  else bucket.unclassifiedAmount += amount;
}

async function fetchExpenseCategoryGroups(
  supabase: SupabaseClient,
  userId: string,
): Promise<Map<string, BudgetGroup>> {
  const { data: categories } = await supabase
    .from("categories")
    .select("id, budget_group")
    .eq("user_id", userId)
    .eq("type", "expense")
    .returns<{ id: string; budget_group: BudgetGroup }[]>();

  return new Map((categories ?? []).map((category) => [category.id, category.budget_group]));
}

/**
 * Regla 50/30/20 (Necesidad/Deseo/Ahorro) para un mes calendario dado.
 *
 * El 20% de Ahorro/Deuda combina dos fuentes: `dragon_contributions`
 * (abonos reales a Dragones) MÁS las transacciones de gasto en categorías
 * clasificadas como `budget_group = 'ahorro'` — deudas que el usuario paga
 * pero no lleva como Dragón (sin seguimiento estricto de saldo/interés).
 * Las transacciones de gasto vinculadas a un Dragón (`dragon_id` no nulo) se
 * excluyen de Necesidad/Deseo/Ahorro-por-categoría para no contar el mismo
 * monto dos veces (ya entra por `dragon_contributions`).
 */
export async function computeFiftyThirtyTwenty(
  supabase: SupabaseClient,
  userId: string,
  month: Date,
): Promise<FiftyThirtyTwentyResult | null> {
  const start = toISODate(monthStart(month, 0));
  const end = toISODate(monthStart(month, 1));

  const [{ data: incomeRows }, { data: expenseRows }, groupByCategory, { data: contributionRows }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "income")
        .gte("occurred_on", start)
        .lt("occurred_on", end),
      supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("user_id", userId)
        .eq("type", "expense")
        .is("dragon_id", null)
        .gte("occurred_on", start)
        .lt("occurred_on", end),
      fetchExpenseCategoryGroups(supabase, userId),
      supabase
        .from("dragon_contributions")
        .select("amount")
        .eq("user_id", userId)
        .gte("created_at", start)
        .lt("created_at", end),
    ]);

  const bucket = emptyBucket();
  bucket.income = (incomeRows ?? []).reduce((sum, row) => sum + row.amount, 0);
  for (const row of expenseRows ?? []) {
    applyExpense(bucket, row.amount, row.category_id ? groupByCategory.get(row.category_id) : undefined);
  }
  bucket.savingsAmount += (contributionRows ?? []).reduce((sum, row) => sum + row.amount, 0);

  return bucketToResult(bucket);
}

/**
 * Historial mensual de la Regla 50/30/20, más reciente al final — misma
 * idea que `getMonthlyIncomeExpenseSeries` (una sola consulta por tabla
 * sobre toda la ventana, agregado por mes en memoria) en vez de repetir
 * `computeFiftyThirtyTwenty` una vez por mes. Los meses sin ingreso quedan
 * con `result: null` (nunca se inventa un porcentaje).
 */
export async function getFiftyThirtyTwentyHistory(
  supabase: SupabaseClient,
  userId: string,
  months = 6,
): Promise<FiftyThirtyTwentyMonth[]> {
  const now = new Date();
  const earliestStart = toISODate(monthStart(now, -(months - 1)));
  const rangeEnd = toISODate(monthStart(now, 1));

  const [{ data: transactionRows }, groupByCategory, { data: contributionRows }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, category_id, dragon_id, occurred_on")
      .eq("user_id", userId)
      .gte("occurred_on", earliestStart)
      .lt("occurred_on", rangeEnd)
      .returns<
        { type: "income" | "expense"; amount: number; category_id: string | null; dragon_id: string | null; occurred_on: string }[]
      >(),
    fetchExpenseCategoryGroups(supabase, userId),
    supabase
      .from("dragon_contributions")
      .select("amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", earliestStart)
      .lt("created_at", rangeEnd)
      .returns<{ amount: number; created_at: string }[]>(),
  ]);

  const byMonth = new Map<string, Bucket>();
  for (let i = 0; i < months; i++) {
    byMonth.set(toISODate(monthStart(now, -(months - 1) + i)), emptyBucket());
  }

  for (const row of transactionRows ?? []) {
    const bucket = byMonth.get(`${row.occurred_on.slice(0, 7)}-01`);
    if (!bucket) continue;
    if (row.type === "income") {
      bucket.income += row.amount;
      continue;
    }
    if (row.dragon_id) continue;
    applyExpense(bucket, row.amount, row.category_id ? groupByCategory.get(row.category_id) : undefined);
  }

  for (const row of contributionRows ?? []) {
    const bucket = byMonth.get(`${row.created_at.slice(0, 7)}-01`);
    if (!bucket) continue;
    bucket.savingsAmount += row.amount;
  }

  return Array.from(byMonth.entries()).map(([month, bucket]) => ({ month, result: bucketToResult(bucket) }));
}
