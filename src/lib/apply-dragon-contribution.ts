import type { SupabaseClient } from "@supabase/supabase-js";
import { getSphereProgress } from "@/lib/spheres";
import { grantXp } from "@/lib/grant-xp";

export type ApplyDragonContributionResult = { error?: string; success?: boolean };

/**
 * Aplica un abono/pago a un Dragón: suma el monto a `current_amount`,
 * actualiza `status` si se completa, registra la fila en
 * `dragon_contributions` y otorga XP por cada Esfera que se cruza con este
 * abono. Compartida entre `contributeToDragon` (abono manual desde
 * Dragones) y el registro de una transacción de gasto vinculada a un
 * Dragón — ambos caminos deben aplicar el abono de la misma forma.
 */
export async function applyDragonContribution(
  supabase: SupabaseClient,
  userId: string,
  dragonId: string,
  amount: number,
): Promise<ApplyDragonContributionResult> {
  const { data: dragon, error: fetchError } = await supabase
    .from("dragons")
    .select("current_amount, target_amount")
    .eq("id", dragonId)
    .eq("user_id", userId)
    .single<{ current_amount: number; target_amount: number }>();
  if (fetchError || !dragon) return { error: "No se encontró el dragón." };

  const spheresBefore = getSphereProgress(dragon.current_amount, dragon.target_amount);
  const nextAmount = dragon.current_amount + amount;

  const { error } = await supabase
    .from("dragons")
    .update({
      current_amount: nextAmount,
      status: nextAmount >= dragon.target_amount ? "completed" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dragonId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  await supabase.from("dragon_contributions").insert({ dragon_id: dragonId, user_id: userId, amount });

  const spheresAfter = getSphereProgress(nextAmount, dragon.target_amount);
  const newlyCompletedIndexes = spheresAfter
    .map((completed, index) => (completed && !spheresBefore[index] ? index : null))
    .filter((index): index is number => index !== null);

  for (const sphereIndex of newlyCompletedIndexes) {
    await grantXp(supabase, userId, "sphere_completed", 50, `sphere:${dragonId}:${sphereIndex}`);
  }

  return { success: true };
}
