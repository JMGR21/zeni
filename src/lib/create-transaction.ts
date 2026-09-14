import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateSecretAchievements } from "@/lib/achievement-engine";
import type { AchievementDefinition } from "@/lib/achievements";

export type InsertTransactionParams = {
  userId: string;
  type: "income" | "expense";
  amount: number;
  categoryId: string | null;
  description: string | null;
  occurredOn: string;
  dragonId: string | null;
};

export type InsertTransactionResult =
  | { success: true; id: string; achievements: AchievementDefinition[] }
  | { success: false; error: string };

/**
 * Único punto de inserción en `transactions`, compartido por `addTransaction`
 * (dashboard/actions.ts) y `contributeToDragon` (dragons/actions.ts, abono
 * directo) — así los logros que deben evaluarse en CUALQUIER transacción
 * nueva, sin importar el flujo que la originó, se evalúan aquí una sola
 * vez en vez de duplicarse en cada Server Action que inserta una fila.
 * Ahora mismo eso es la Categoría L (logros secretos: monto exacto,
 * horario de registro); si aparece un futuro logro con la misma condición
 * ("al registrar cualquier transacción"), va aquí también.
 */
export async function insertTransaction(
  supabase: SupabaseClient,
  params: InsertTransactionParams,
): Promise<InsertTransactionResult> {
  const { userId, type, amount, categoryId, description, occurredOn, dragonId } = params;

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      category_id: categoryId,
      type,
      amount,
      description,
      occurred_on: occurredOn,
      dragon_id: dragonId,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !inserted) {
    return { success: false, error: error?.message ?? "No se pudo registrar el movimiento." };
  }

  const achievements = await evaluateSecretAchievements(supabase, userId, { type, amount, createdAt: new Date() });

  return { success: true, id: inserted.id, achievements };
}
