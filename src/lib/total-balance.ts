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
