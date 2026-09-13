import type { SupabaseClient } from "@supabase/supabase-js";
import { getSphereProgress } from "@/lib/spheres";
import { grantXp } from "@/lib/grant-xp";

export type SyncDragonLinkResult = { error?: string; success?: boolean };

type DragonAmounts = { current_amount: number; target_amount: number };

/**
 * Ajusta `current_amount` de un Dragón por `delta` (puede ser negativo),
 * recalcula `status` y otorga XP por cada Esfera NUEVA cruzada hacia
 * adelante — nunca la quita si `delta` negativo hace que una Esfera ya
 * otorgada vuelva a quedar incompleta (el Nivel nunca baja).
 */
async function adjustDragonAmount(
  supabase: SupabaseClient,
  userId: string,
  dragonId: string,
  delta: number,
): Promise<{ error?: string }> {
  if (delta === 0) return {};

  const { data: dragon, error: fetchError } = await supabase
    .from("dragons")
    .select("current_amount, target_amount")
    .eq("id", dragonId)
    .eq("user_id", userId)
    .single<DragonAmounts>();
  if (fetchError || !dragon) return { error: "No se encontró el dragón." };

  const spheresBefore = getSphereProgress(dragon.current_amount, dragon.target_amount);
  const nextAmount = dragon.current_amount + delta;

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

  const spheresAfter = getSphereProgress(nextAmount, dragon.target_amount);
  const newlyCompletedIndexes = spheresAfter
    .map((completed, index) => (completed && !spheresBefore[index] ? index : null))
    .filter((index): index is number => index !== null);

  for (const sphereIndex of newlyCompletedIndexes) {
    await grantXp(supabase, userId, "sphere_completed", 50, `sphere:${dragonId}:${sphereIndex}`);
  }

  return {};
}

/**
 * Refleja el monto vinculado en `dragon_contributions`. Cuando hay
 * `transactionId`, la fila queda anclada 1:1 a esa transacción (constraint
 * unique en `transaction_id`) — un `upsert` por ese conflicto crea o
 * actualiza la misma fila en vez de duplicarla en cada edición. Sin
 * `transactionId` (abono manual sin transacción), cada llamada es un abono
 * nuevo y siempre inserta una fila.
 */
async function upsertContributionRow(
  supabase: SupabaseClient,
  userId: string,
  dragonId: string,
  amount: number,
  transactionId: string | null,
): Promise<{ error?: string }> {
  if (transactionId) {
    const { error } = await supabase
      .from("dragon_contributions")
      .upsert(
        { dragon_id: dragonId, user_id: userId, amount, transaction_id: transactionId },
        { onConflict: "transaction_id" },
      );
    if (error) return { error: error.message };
    return {};
  }

  const { error } = await supabase.from("dragon_contributions").insert({ dragon_id: dragonId, user_id: userId, amount });
  if (error) return { error: error.message };
  return {};
}

async function deleteContributionRow(supabase: SupabaseClient, transactionId: string | null): Promise<void> {
  if (!transactionId) return;
  await supabase.from("dragon_contributions").delete().eq("transaction_id", transactionId);
}

/**
 * Punto único de reconciliación del vínculo transacción↔Dragón. Se llama
 * después de crear o editar una transacción (o tras crear la transacción
 * de un abono directo, ver `contributeToDragon`), comparando el vínculo
 * anterior contra el nuevo, y cubre los cuatro casos: se crea el vínculo,
 * se quita, cambia de monto, o cambia de Dragón — siempre ajustando
 * `current_amount` por la DIFERENCIA correspondiente, nunca reaplicando el
 * monto completo salvo que sea la primera vez.
 */
export async function syncDragonLinkForTransaction(
  supabase: SupabaseClient,
  userId: string,
  params: {
    transactionId: string | null;
    dragonId: string | null;
    amount: number;
    previousDragonId: string | null;
    previousAmount: number;
  },
): Promise<SyncDragonLinkResult> {
  const { transactionId, dragonId, amount, previousDragonId, previousAmount } = params;

  if (!previousDragonId && !dragonId) return { success: true };

  if (previousDragonId && !dragonId) {
    const revert = await adjustDragonAmount(supabase, userId, previousDragonId, -previousAmount);
    if (revert.error) return { error: revert.error };
    await deleteContributionRow(supabase, transactionId);
    return { success: true };
  }

  if (!previousDragonId && dragonId) {
    const apply = await adjustDragonAmount(supabase, userId, dragonId, amount);
    if (apply.error) return { error: apply.error };
    const row = await upsertContributionRow(supabase, userId, dragonId, amount, transactionId);
    if (row.error) return { error: row.error };
    return { success: true };
  }

  if (previousDragonId === dragonId && dragonId) {
    const delta = amount - previousAmount;
    if (delta !== 0) {
      const adjust = await adjustDragonAmount(supabase, userId, dragonId, delta);
      if (adjust.error) return { error: adjust.error };
    }
    const row = await upsertContributionRow(supabase, userId, dragonId, amount, transactionId);
    if (row.error) return { error: row.error };
    return { success: true };
  }

  const revert = await adjustDragonAmount(supabase, userId, previousDragonId as string, -previousAmount);
  if (revert.error) return { error: revert.error };
  const apply = await adjustDragonAmount(supabase, userId, dragonId as string, amount);
  if (apply.error) return { error: apply.error };
  const row = await upsertContributionRow(supabase, userId, dragonId as string, amount, transactionId);
  if (row.error) return { error: row.error };
  return { success: true };
}

/**
 * Se llama ANTES de eliminar una transacción vinculada a un Dragón: revierte
 * el monto correspondiente. La fila de `dragon_contributions` se borra sola
 * al eliminar la transacción (on delete cascade vía `transaction_id`).
 */
export async function revertDragonLinkForTransaction(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string,
): Promise<SyncDragonLinkResult> {
  const { data: transaction, error: fetchError } = await supabase
    .from("transactions")
    .select("dragon_id, amount")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single<{ dragon_id: string | null; amount: number }>();
  if (fetchError || !transaction) return { error: "No se encontró el movimiento." };
  if (!transaction.dragon_id) return { success: true };

  const revert = await adjustDragonAmount(supabase, userId, transaction.dragon_id, -Number(transaction.amount));
  if (revert.error) return { error: revert.error };
  return { success: true };
}
