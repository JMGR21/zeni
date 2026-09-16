import type { SupabaseClient } from "@supabase/supabase-js";

export type TotalBalance = {
  totalBalance: number;
  availableBalance: number;
  savedInDragons: number;
};

/**
 * Saldo Total/Disponible: capa independiente del "balance del mes" que ya
 * usan Ki/Presupuesto (ese sigue siendo income-expenses del mes en curso).
 * Aquí se agrega TODO el historial de transacciones, y los gastos
 * vinculados a un Dragón de ahorro se "revierten" porque ese dinero sigue
 * siendo del usuario, solo apartado — a diferencia de un gasto vinculado a
 * un Dragón de deuda, que sí salió de verdad.
 */
export async function getTotalBalance(supabase: SupabaseClient, userId: string): Promise<TotalBalance> {
  const [{ data: profile }, { data: transactions }, { data: savingsDragons }] = await Promise.all([
    supabase.from("profiles").select("initial_balance").eq("id", userId).maybeSingle<{ initial_balance: number }>(),
    supabase
      .from("transactions")
      .select("type, amount, dragons(type)")
      .eq("user_id", userId)
      .returns<{ type: "income" | "expense"; amount: number; dragons: { type: "savings" | "debt" } | null }[]>(),
    supabase
      .from("dragons")
      .select("current_amount")
      .eq("user_id", userId)
      .eq("type", "savings")
      .returns<{ current_amount: number }[]>(),
  ]);

  const initialBalance = profile?.initial_balance ?? 0;

  let totalBalance = initialBalance;
  for (const transaction of transactions ?? []) {
    if (transaction.type === "income") {
      totalBalance += transaction.amount;
    } else {
      totalBalance -= transaction.amount;
      if (transaction.dragons?.type === "savings") {
        totalBalance += transaction.amount;
      }
    }
  }

  const savedInDragons = (savingsDragons ?? []).reduce((sum, dragon) => sum + dragon.current_amount, 0);
  const availableBalance = totalBalance - savedInDragons;

  return { totalBalance, availableBalance, savedInDragons };
}

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Saldo Disponible histórico "a una fecha de corte" — usado por el
 * colchón del motor de Ki (`monthly-balance.ts`) para saber cuánto saldo
 * disponible existía al FINAL de un mes/periodo específico, no hoy. Misma
 * lógica que `getTotalBalance`, pero:
 * - filtra transacciones con `occurred_on <= asOfDate`
 * - lo apartado en Dragones de ahorro se suma desde la BITÁCORA
 *   (`dragon_contributions.created_at <= asOfDate`, fin del día), no desde
 *   `dragons.current_amount` — ese es el total EN VIVO de hoy, no el que
 *   había a esa fecha.
 */
export async function getAvailableBalanceAsOf(
  supabase: SupabaseClient,
  userId: string,
  asOfDate: Date,
): Promise<number> {
  const asOfDateStr = toISODateString(asOfDate);
  const asOfEndOfDay = new Date(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    asOfDate.getDate(),
    23,
    59,
    59,
    999,
  ).toISOString();

  const [{ data: profile }, { data: transactions }, { data: contributions }] = await Promise.all([
    supabase.from("profiles").select("initial_balance").eq("id", userId).maybeSingle<{ initial_balance: number }>(),
    supabase
      .from("transactions")
      .select("type, amount, dragons(type)")
      .eq("user_id", userId)
      .lte("occurred_on", asOfDateStr)
      .returns<{ type: "income" | "expense"; amount: number; dragons: { type: "savings" | "debt" } | null }[]>(),
    supabase
      .from("dragon_contributions")
      .select("amount, dragons(type)")
      .eq("user_id", userId)
      .lte("created_at", asOfEndOfDay)
      .returns<{ amount: number; dragons: { type: "savings" | "debt" } | null }[]>(),
  ]);

  const initialBalance = profile?.initial_balance ?? 0;

  let totalBalance = initialBalance;
  for (const transaction of transactions ?? []) {
    if (transaction.type === "income") {
      totalBalance += transaction.amount;
    } else {
      totalBalance -= transaction.amount;
      if (transaction.dragons?.type === "savings") {
        totalBalance += transaction.amount;
      }
    }
  }

  const savedInDragons = (contributions ?? [])
    .filter((row) => row.dragons?.type === "savings")
    .reduce((sum, row) => sum + row.amount, 0);

  return totalBalance - savedInDragons;
}
