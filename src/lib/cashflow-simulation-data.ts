import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveInstallmentsPaid } from "@/lib/fixed-weekly-debt";
import type { SimulationInput } from "@/lib/cashflow-simulation";
import { getAvailableBalanceAsOf } from "@/lib/total-balance";

const SAVINGS_SUGGESTION_MONTHS = 3;

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type RecurringRow = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  frequency: "weekly" | "biweekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  next_occurrence_date: string;
};

type DragonRow = {
  id: string;
  name: string;
  type: "savings" | "debt";
  target_amount: number;
  current_amount: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  extra_payment: number;
  payment_schedule: "amortized" | "fixed_plan" | "fixed_weekly" | null;
  weekly_payment: number | null;
  total_installments: number | null;
  payment_day_of_week: number | null;
};

/**
 * Arma el `SimulationInput` base (sin `horizonMonths`, elegido en la UI) a
 * partir de datos reales del usuario. Todo empieza `enabled: true`, EXCEPTO
 * los Dragones de ahorro (`enabled: false`) — activarlos es una decisión
 * explícita del usuario en el simulador, no algo que ya esté "comprometido"
 * como una recurrente o un pago de deuda.
 */
export async function getSimulationBaseInput(
  supabase: SupabaseClient,
  userId: string,
): Promise<Omit<SimulationInput, "horizonMonths">> {
  const today = new Date();
  const currentMonthStartISO = toISODate(new Date(today.getFullYear(), today.getMonth(), 1));
  const savingsWindowStartISO = toISODate(new Date(today.getFullYear(), today.getMonth() - SAVINGS_SUGGESTION_MONTHS, 1));

  const [availableBalance, { data: recurringRows }, { data: dragonRows }, { data: contributionRows }] =
    await Promise.all([
      getAvailableBalanceAsOf(supabase, userId, today),
      supabase
        .from("recurring_transactions")
        .select("id, name, type, amount, frequency, day_of_week, day_of_month, next_occurrence_date")
        .eq("user_id", userId)
        .eq("active", true)
        .returns<RecurringRow[]>(),
      supabase
        .from("dragons")
        .select(
          "id, name, type, target_amount, current_amount, interest_rate, minimum_payment, extra_payment, payment_schedule, weekly_payment, total_installments, payment_day_of_week",
        )
        .eq("user_id", userId)
        .eq("status", "active")
        .returns<DragonRow[]>(),
      supabase
        .from("dragon_contributions")
        .select("dragon_id, amount")
        .eq("user_id", userId)
        .gte("created_at", savingsWindowStartISO)
        .lt("created_at", currentMonthStartISO)
        .returns<{ dragon_id: string; amount: number }[]>(),
    ]);

  const recurringItems = (recurringRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    frequency: row.frequency,
    dayOfWeek: row.day_of_week ?? undefined,
    dayOfMonth: row.day_of_month ?? undefined,
    nextOccurrenceDate: new Date(`${row.next_occurrence_date}T00:00:00`),
    enabled: true,
  }));

  const debtDragons = (dragonRows ?? []).filter((dragon) => dragon.type === "debt");

  const fixedWeeklyDebts = debtDragons
    .filter((dragon) => dragon.payment_schedule === "fixed_weekly")
    .filter((dragon) => dragon.weekly_payment !== null && dragon.total_installments !== null)
    .map((dragon) => {
      const installmentsPaid = deriveInstallmentsPaid(dragon.current_amount, dragon.weekly_payment!);
      return {
        id: dragon.id,
        name: dragon.name,
        weeklyPayment: dragon.weekly_payment!,
        remainingInstallments: Math.max(0, dragon.total_installments! - installmentsPaid),
        paymentDayOfWeek: dragon.payment_day_of_week ?? 0,
        enabled: true,
      };
    });

  const otherDebts = debtDragons
    .filter((dragon) => dragon.payment_schedule !== "fixed_weekly")
    .map((dragon) => ({
      id: dragon.id,
      name: dragon.name,
      pendingBalance: Math.max(0, dragon.target_amount - dragon.current_amount),
      monthlyPayment: (dragon.minimum_payment ?? 0) + dragon.extra_payment,
      monthlyRate: dragon.interest_rate !== null ? dragon.interest_rate / 100 / 12 : null,
      enabled: true,
    }));

  const contributionTotalByDragonId = new Map<string, number>();
  for (const row of contributionRows ?? []) {
    contributionTotalByDragonId.set(row.dragon_id, (contributionTotalByDragonId.get(row.dragon_id) ?? 0) + row.amount);
  }

  const savingsDragons = (dragonRows ?? [])
    .filter((dragon) => dragon.type === "savings")
    .map((dragon) => ({
      id: dragon.id,
      name: dragon.name,
      suggestedMonthlyAmount: (contributionTotalByDragonId.get(dragon.id) ?? 0) / SAVINGS_SUGGESTION_MONTHS,
      enabled: false,
    }));

  return {
    startingAvailableBalance: availableBalance,
    recurringItems,
    fixedWeeklyDebts,
    otherDebts,
    savingsDragons,
  };
}
