"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { applyDragonContribution } from "@/lib/apply-dragon-contribution";
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

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: categoryId || null,
    type,
    amount,
    description: description || null,
    occurred_on: occurredOn,
    dragon_id: dragonId || null,
  });
  if (error) return { error: error.message };

  if (dragonId) {
    const contributionResult = await applyDragonContribution(supabase, user.id, dragonId, amount);
    if (contributionResult.error) return { error: contributionResult.error };
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
    .select("dragon_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single<{ dragon_id: string | null }>();
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

  // El abono a un Dragón solo se aplica cuando el vínculo pasa de "sin
  // Dragón" a "con Dragón" en esta edición. Cambiar de Dragón o
  // desvincular uno que ya tenía un abono aplicado NO revierte ni reaplica
  // ese abono histórico — es una simplificación intencional para evitar
  // lógica de reversión (ver resumen de Fase 7 pieza 7 en CLAUDE.md).
  if (dragonId && !existing.dragon_id) {
    const contributionResult = await applyDragonContribution(supabase, user.id, dragonId, amount);
    if (contributionResult.error) return { error: contributionResult.error };
    revalidatePath("/dragons");
  }

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

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
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
