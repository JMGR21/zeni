import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateKi } from "@/lib/ki-engine";
import { getTotalXp } from "@/lib/grant-xp";
import { getLevelFromXp } from "@/lib/level";
import { computePeriodStart, periodRangeFromStart, toISODate } from "@/lib/period";
import { getTotalBalance, getAvailableBalanceAsOf } from "@/lib/total-balance";
import { computeNetBalanceWithCushion } from "@/lib/monthly-balance";
import { computeFiftyThirtyTwenty, type FiftyThirtyTwentyResult } from "@/lib/fifty-thirty-twenty";
import { getAttackOrder } from "@/lib/dragon-priority";
import type { ChatView } from "@/lib/chat/types";

export type ChatSnapshot = {
  profile: { name: string | null; monthStartDay: number };
  period: {
    start: string;
    end: string;
    income: number;
    expenses: number;
    rawBalance: number;
    cushionApplied: number;
    netBalance: number;
  };
  balance: { total: number; available: number; savedInDragons: number };
  ki: {
    score: number;
    levelLabel: string;
    breakdown: { saludActual: number; momentum: number; presupuesto: number; constancia: number };
    safeguardApplied: boolean;
  };
  level: { level: number; xpIntoLevel: number; xpForNextLevel: number };
  dragons: {
    id: string;
    name: string;
    type: "savings" | "debt";
    status: "active" | "completed";
    progressPct: number;
    paymentSchedule: "amortized" | "fixed_plan" | "fixed_weekly" | null;
    attackOrderRank: number | null;
  }[];
  fiftyThirtyTwenty: FiftyThirtyTwentyResult | null;
  view: ChatView;
};

function dayBefore(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

type DragonRow = {
  id: string;
  name: string;
  type: "savings" | "debt";
  status: "active" | "completed";
  current_amount: number;
  target_amount: number;
  priority: number | null;
  payment_schedule: "amortized" | "fixed_plan" | "fixed_weekly" | null;
  created_at: string;
};

/**
 * Construye el snapshot financiero que acompaña cada turno del chat.
 * Reutiliza las mismas funciones que ya alimentan el dashboard — no
 * reimplementa ningún cálculo. Nunca incluye `institution` de Dragones,
 * `description` de transacciones, ids de `auth.users` ni logros secretos:
 * eso solo se expone, acotado, a través de las herramientas (sección 4 del
 * plan) o nunca.
 */
export async function buildChatSnapshot(
  supabase: SupabaseClient,
  userId: string,
  view: ChatView,
): Promise<ChatSnapshot> {
  const now = new Date();

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("name, month_start_day")
    .eq("id", userId)
    .maybeSingle<{ name: string | null; month_start_day: number }>();

  const monthStartDay = profileRow?.month_start_day ?? 1;
  const periodStart = computePeriodStart(now, monthStartDay);
  const { start: periodStartDate, end: periodEndDate } = periodRangeFromStart(periodStart, monthStartDay);
  const periodStartISO = toISODate(periodStartDate);
  const periodEndISO = toISODate(periodEndDate);

  const [
    { data: periodTransactions },
    totalBalance,
    availableEndOfPreviousPeriod,
    kiResult,
    totalXp,
    { data: dragonRows },
    fiftyThirtyTwenty,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", userId)
      .gte("occurred_on", periodStartISO)
      .lt("occurred_on", periodEndISO)
      .returns<{ type: "income" | "expense"; amount: number }[]>(),
    getTotalBalance(supabase, userId),
    getAvailableBalanceAsOf(supabase, userId, dayBefore(periodStartDate)),
    calculateKi(userId, now),
    getTotalXp(supabase, userId),
    supabase
      .from("dragons")
      .select("id, name, type, status, current_amount, target_amount, priority, payment_schedule, created_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .returns<DragonRow[]>(),
    computeFiftyThirtyTwenty(supabase, userId, now),
  ]);

  const income = (periodTransactions ?? [])
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);
  const expenses = (periodTransactions ?? [])
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);
  const rawBalance = income - expenses;
  const netBalance = computeNetBalanceWithCushion(rawBalance, availableEndOfPreviousPeriod);
  const cushionApplied = netBalance - rawBalance;

  const activeDebtsOrdered = (dragonRows ?? [])
    .filter((dragon) => dragon.type === "debt")
    .sort((a, b) => (a.priority ?? Infinity) - (b.priority ?? Infinity) || a.created_at.localeCompare(b.created_at));
  const attackOrder =
    activeDebtsOrdered.length >= 2 ? getAttackOrder(activeDebtsOrdered.map((dragon) => dragon.id)) : null;

  const dragons = (dragonRows ?? []).map((dragon) => ({
    id: dragon.id,
    name: dragon.name,
    type: dragon.type,
    status: dragon.status,
    progressPct: dragon.target_amount > 0 ? (dragon.current_amount / dragon.target_amount) * 100 : 0,
    paymentSchedule: dragon.payment_schedule,
    attackOrderRank: attackOrder?.get(dragon.id)?.rank ?? null,
  }));

  return {
    profile: { name: profileRow?.name ?? null, monthStartDay },
    period: {
      start: periodStartISO,
      end: periodEndISO,
      income,
      expenses,
      rawBalance,
      cushionApplied,
      netBalance,
    },
    balance: {
      total: totalBalance.totalBalance,
      available: totalBalance.availableBalance,
      savedInDragons: totalBalance.savedInDragons,
    },
    ki: {
      score: kiResult.score,
      levelLabel: kiResult.level.label,
      breakdown: kiResult.breakdown,
      safeguardApplied: kiResult.safeguardApplied,
    },
    level: getLevelFromXp(totalXp),
    dragons,
    fiftyThirtyTwenty,
    view,
  };
}
