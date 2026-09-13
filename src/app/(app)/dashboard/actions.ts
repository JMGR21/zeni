"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { revertDragonLinkForTransaction, syncDragonLinkForTransaction } from "@/lib/sync-dragon-link";
import { grantXp } from "@/lib/grant-xp";
import { getWeekDedupeKey, getWeekStart, getWeeklyXpTierAmount, resolveWeeklyXpAction, toISODateString } from "@/lib/weekly-xp";

export type AddTransactionActionState = { error?: string; success?: boolean };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function addTransaction(
  _previousState: AddTransactionActionState,
  formData: FormData,
): Promise<AddTransactionActionState> {
  const type = getField(formData, "type");
  if (type !== "income" && type !== "expense") {
    return { error: "Selecciona un tipo válido." };
  }

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const occurredOn = getField(formData, "occurred_on");
  if (!occurredOn) {
    return { error: "Selecciona una fecha." };
  }

  const categoryId = getField(formData, "category_id");
  const description = getField(formData, "description");
  const dragonId = type === "expense" ? getField(formData, "dragon_id") : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: inserted, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      category_id: categoryId || null,
      type,
      amount,
      description: description || null,
      occurred_on: occurredOn,
      dragon_id: dragonId || null,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !inserted) return { error: error?.message ?? "No se pudo registrar el movimiento." };

  if (dragonId) {
    const syncResult = await syncDragonLinkForTransaction(supabase, user.id, {
      transactionId: inserted.id,
      dragonId,
      amount,
      previousDragonId: null,
      previousAmount: 0,
    });
    if (syncResult.error) return { error: syncResult.error };
    revalidatePath("/dragons");
  }

  await grantDailyAndWeeklyXp(supabase, user.id);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export type UpdateTransactionActionState = { error?: string; success?: boolean };

export async function updateTransaction(
  _previousState: UpdateTransactionActionState,
  formData: FormData,
): Promise<UpdateTransactionActionState> {
  const id = getField(formData, "id");
  if (!id) return { error: "Falta el movimiento a editar." };

  const type = getField(formData, "type");
  if (type !== "income" && type !== "expense") {
    return { error: "Selecciona un tipo válido." };
  }

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const occurredOn = getField(formData, "occurred_on");
  if (!occurredOn) {
    return { error: "Selecciona una fecha." };
  }

  const categoryId = getField(formData, "category_id");
  const description = getField(formData, "description");
  const dragonId = type === "expense" ? getField(formData, "dragon_id") : "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: existing, error: fetchError } = await supabase
    .from("transactions")
    .select("dragon_id, amount")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<{ dragon_id: string | null; amount: number }>();
  if (fetchError || !existing) return { error: "No se encontró el movimiento." };

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: categoryId || null,
      type,
      amount,
      description: description || null,
      occurred_on: occurredOn,
      dragon_id: dragonId || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  const syncResult = await syncDragonLinkForTransaction(supabase, user.id, {
    transactionId: id,
    dragonId: dragonId || null,
    amount,
    previousDragonId: existing.dragon_id,
    previousAmount: Number(existing.amount),
  });
  if (syncResult.error) return { error: syncResult.error };
  if (existing.dragon_id || dragonId) revalidatePath("/dragons");

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}

export type DeleteTransactionActionState = { error?: string; success?: boolean };

export async function deleteTransaction(
  _previousState: DeleteTransactionActionState,
  formData: FormData,
): Promise<DeleteTransactionActionState> {
  const id = getField(formData, "id");
  if (!id) return { error: "Falta el movimiento a eliminar." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const revertResult = await revertDragonLinkForTransaction(supabase, user.id, id);
  if (revertResult.error) return { error: revertResult.error };

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/dragons");
  return { success: true };
}

async function grantDailyAndWeeklyXp(supabase: SupabaseClient, userId: string): Promise<void> {
  const now = new Date();

  await grantXp(supabase, userId, "daily_activity", 10, toISODateString(now));

  const weekStartDate = getWeekStart(now);
  const weekStart = toISODateString(weekStartDate);
  const weekEnd = toISODateString(
    new Date(weekStartDate.getFullYear(), weekStartDate.getMonth(), weekStartDate.getDate() + 7),
  );

  const { data: weekRows } = await supabase
    .from("transactions")
    .select("occurred_on")
    .eq("user_id", userId)
    .gte("occurred_on", weekStart)
    .lt("occurred_on", weekEnd);

  const activeDays = new Set((weekRows ?? []).map((row) => row.occurred_on)).size;
  const tierAmount = getWeeklyXpTierAmount(activeDays);
  const dedupeKey = getWeekDedupeKey(now);

  const { data: existing } = await supabase
    .from("xp_events")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  const action = resolveWeeklyXpAction(existing?.amount ?? null, tierAmount);
  if (action.kind === "insert") {
    await grantXp(supabase, userId, "weekly_activity", action.amount, dedupeKey);
  } else if (action.kind === "update" && existing) {
    const { error: updateError } = await supabase.from("xp_events").update({ amount: action.amount }).eq("id", existing.id);
    if (updateError) throw updateError;
  }
}
