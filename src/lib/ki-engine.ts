import { createClient } from "@/lib/supabase/server";
import { getSuggestedBudget, resolveBudgetedAmount, type BudgetCategory } from "@/lib/budget";
import { getKiLevel, type KiLevel } from "@/lib/ki";
import {
  computeConstancia,
  computeFinalScore,
  computeMomentum,
  computePresupuesto,
  computeSaludActual,
  applySafeguard,
  type KiBreakdown,
  type MomentumInputs,
} from "@/lib/ki-calculations";

export type KiCalculationResult = {
  score: number;
  level: KiLevel;
  breakdown: KiBreakdown;
  safeguardApplied: boolean;
};

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// monthsAgo=0 es el mes en curso, monthsAgo=1 el mes calendario anterior,
// etc. Acepta valores negativos para obtener el inicio del mes siguiente
// (el límite exclusivo del mes en curso).
function monthStart(from: Date, monthsAgo: number): Date {
  return new Date(from.getFullYear(), from.getMonth() - monthsAgo, 1);
}

type TransactionRow = { type: "income" | "expense"; amount: number; occurred_on: string; category_id: string | null };

function sumByTypeInRange(rows: TransactionRow[], type: "income" | "expense", start: string, end: string): number {
  return rows
    .filter((row) => row.type === type && row.occurred_on >= start && row.occurred_on < end)
    .reduce((sum, row) => sum + row.amount, 0);
}

type ContributionRow = { dragon_id: string; amount: number; created_at: string };
type DragonRow = {
  id: string;
  type: "savings" | "debt";
  status: "active" | "completed";
  minimum_payment: number | null;
  extra_payment: number | null;
};

function sumContributionsInRange(
  rows: ContributionRow[],
  dragonTypeById: Map<string, "savings" | "debt">,
  dragonType: "savings" | "debt",
  start: string,
  end: string,
): number {
  return rows
    .filter((row) => {
      const type = dragonTypeById.get(row.dragon_id);
      const dateStr = row.created_at.slice(0, 10);
      return type === dragonType && dateStr >= start && dateStr < end;
    })
    .reduce((sum, row) => sum + row.amount, 0);
}

/**
 * Calcula el Ki de un usuario a partir de sus datos financieros reales.
 * Separado en dos capas: este archivo hace las consultas y arma los
 * insumos; `ki-calculations.ts` tiene la aritmética pura (fácil de ajustar
 * o probar sin tocar Supabase).
 */
export async function calculateKi(userId: string, referenceDate: Date = new Date()): Promise<KiCalculationResult> {
  const supabase = await createClient();

  const currentMonthStart = monthStart(referenceDate, 0);
  const previousMonthStart = monthStart(referenceDate, 1);
  const twoMonthsAgoStart = monthStart(referenceDate, 2);
  const nextMonthStart = monthStart(referenceDate, -1);

  const b2 = toISODate(twoMonthsAgoStart);
  const b1 = toISODate(previousMonthStart);
  const b0 = toISODate(currentMonthStart);
  const bNext = toISODate(nextMonthStart);

  const [transactionsRes, dragonsRes, contributionsRes, categoriesRes, budgetsRes, earliestRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount, occurred_on, category_id")
      .eq("user_id", userId)
      .gte("occurred_on", b2)
      .lt("occurred_on", bNext),
    supabase
      .from("dragons")
      .select("id, type, status, minimum_payment, extra_payment")
      .eq("user_id", userId),
    supabase
      .from("dragon_contributions")
      .select("dragon_id, amount, created_at")
      .eq("user_id", userId)
      .gte("created_at", b2),
    supabase.from("categories").select("id, name").eq("user_id", userId).eq("type", "expense"),
    supabase.from("budgets").select("category_id, amount").eq("user_id", userId),
    supabase
      .from("transactions")
      .select("occurred_on")
      .eq("user_id", userId)
      .order("occurred_on", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const transactions = (transactionsRes.data ?? []) as TransactionRow[];
  const dragons = (dragonsRes.data ?? []) as DragonRow[];
  const contributions = (contributionsRes.data ?? []) as ContributionRow[];
  const categories = categoriesRes.data ?? [];
  const budgets = budgetsRes.data ?? [];
  const earliest = earliestRes.data;

  // --- Salud Actual (35%) ---
  const currentIncome = sumByTypeInRange(transactions, "income", b0, bNext);
  const currentExpense = sumByTypeInRange(transactions, "expense", b0, bNext);
  const debtPayments = dragons
    .filter((dragon) => dragon.type === "debt" && dragon.status === "active")
    .reduce((sum, dragon) => sum + (dragon.minimum_payment ?? 0) + (dragon.extra_payment ?? 0), 0);
  const saludActual = computeSaludActual(currentIncome, currentExpense, debtPayments);

  // --- Momentum (35%) ---
  const dragonTypeById = new Map(dragons.map((dragon) => [dragon.id, dragon.type]));
  const previousIncome = sumByTypeInRange(transactions, "income", b1, b0);
  const previousExpense = sumByTypeInRange(transactions, "expense", b1, b0);
  const twoAgoIncome = sumByTypeInRange(transactions, "income", b2, b1);
  const twoAgoExpense = sumByTypeInRange(transactions, "expense", b2, b1);

  // Menos de un mes de antigüedad: no hay ningún dato anterior al mes en
  // curso, así que el momentum es neutral en vez de comparar contra nada.
  const hasPreviousMonthData = Boolean(earliest) && earliest!.occurred_on < b0;

  const currentMomentumInputs: MomentumInputs = {
    debtContributions: sumContributionsInRange(contributions, dragonTypeById, "debt", b0, bNext),
    savingsContributions: sumContributionsInRange(contributions, dragonTypeById, "savings", b0, bNext),
    balance: currentIncome - currentExpense,
  };
  const previousMomentumInputs: MomentumInputs | null = hasPreviousMonthData
    ? {
        debtContributions: sumContributionsInRange(contributions, dragonTypeById, "debt", b1, b0),
        savingsContributions: sumContributionsInRange(contributions, dragonTypeById, "savings", b1, b0),
        balance: previousIncome - previousExpense,
      }
    : null;
  const momentum = computeMomentum(currentMomentumInputs, previousMomentumInputs);

  // --- Presupuesto (20%) ---
  const spentByCategory = new Map<string, number>();
  for (const row of transactions) {
    if (row.type !== "expense" || !row.category_id || row.occurred_on < b0 || row.occurred_on >= bNext) continue;
    spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + row.amount);
  }
  const budgetByCategory = new Map(budgets.map((row) => [row.category_id, row.amount]));

  const budgetCategories: BudgetCategory[] = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      name: category.name,
      spent: spentByCategory.get(category.id) ?? 0,
      customAmount: budgetByCategory.get(category.id) ?? null,
      suggestion: await getSuggestedBudget(supabase, userId, category.id, referenceDate),
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
  const presupuesto = computePresupuesto(totalBudget, totalSpent);

  // --- Constancia (10%) ---
  const daysElapsed = referenceDate.getDate();
  const daysWithTransactions = new Set(
    transactions
      .filter((row) => row.occurred_on >= b0 && row.occurred_on < bNext)
      .map((row) => row.occurred_on),
  ).size;
  const constancia = computeConstancia(daysWithTransactions, daysElapsed);

  const breakdown: KiBreakdown = { saludActual, momentum, presupuesto, constancia };

  // --- Salvaguarda ---
  const balancePreviousMonth = previousIncome - previousExpense;
  const balanceTwoMonthsAgo = twoAgoIncome - twoAgoExpense;
  const bothMonthsNegative = balancePreviousMonth < 0 && balanceTwoMonthsAgo < 0;

  const contributionsByDragonLastMonth = new Map<string, number>();
  for (const row of contributions) {
    const dateStr = row.created_at.slice(0, 10);
    if (dateStr < b1 || dateStr >= b0) continue;
    contributionsByDragonLastMonth.set(row.dragon_id, (contributionsByDragonLastMonth.get(row.dragon_id) ?? 0) + row.amount);
  }
  const missedMinimumPayment = dragons.some(
    (dragon) =>
      dragon.type === "debt" &&
      dragon.status === "active" &&
      dragon.minimum_payment !== null &&
      (contributionsByDragonLastMonth.get(dragon.id) ?? 0) < dragon.minimum_payment,
  );

  const safeguardApplied = bothMonthsNegative || missedMinimumPayment;
  const score = applySafeguard(computeFinalScore(breakdown), safeguardApplied);
  const level = getKiLevel(score);

  return { score, level, breakdown, safeguardApplied };
}
