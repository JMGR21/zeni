"use server";

import { revalidatePath } from "next/cache";
import type { AchievementDefinition } from "@/lib/achievements";
import { insertTransaction } from "@/lib/create-transaction";
import { computeNextOccurrenceDate, type RecurringFrequency } from "@/lib/recurring-schedule";
import { createClient } from "@/lib/supabase/server";

export type RecurringActionState = { error?: string; success?: boolean };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseRecurringFields(formData: FormData) {
  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." } as const;

  const type = getField(formData, "type");
  if (type !== "income" && type !== "expense") {
    return { error: "Selecciona un tipo válido." } as const;
  }

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." } as const;
  }

  const frequency = getField(formData, "frequency");
  if (frequency !== "weekly" && frequency !== "biweekly" && frequency !== "monthly") {
    return { error: "Selecciona una frecuencia válida." } as const;
  }

  const categoryId = getField(formData, "category_id") || null;
  const autoApply = formData.get("auto_apply") === "on";

  let dayOfWeek: number | null = null;
  let dayOfMonth: number | null = null;

  if (frequency === "weekly") {
    dayOfWeek = Number(getField(formData, "day_of_week"));
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return { error: "Selecciona un día de la semana válido." } as const;
    }
  }

  if (frequency === "monthly") {
    dayOfMonth = Number(getField(formData, "day_of_month"));
    if (!Number.isInteger(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      return { error: "Selecciona un día del mes válido (1-31)." } as const;
    }
  }

  return {
    name,
    type,
    amount,
    categoryId,
    frequency: frequency as RecurringFrequency,
    dayOfWeek,
    dayOfMonth,
    autoApply,
  } as const;
}

export async function createRecurringTransaction(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const parsed = parseRecurringFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const nextOccurrenceDate = computeNextOccurrenceDate(
    parsed.frequency,
    new Date(),
    parsed.dayOfWeek ?? undefined,
    parsed.dayOfMonth ?? undefined,
  );

  const { error } = await supabase.from("recurring_transactions").insert({
    user_id: user.id,
    name: parsed.name,
    type: parsed.type,
    amount: parsed.amount,
    category_id: parsed.categoryId,
    frequency: parsed.frequency,
    day_of_week: parsed.dayOfWeek,
    day_of_month: parsed.dayOfMonth,
    next_occurrence_date: toISODate(nextOccurrenceDate),
    auto_apply: parsed.autoApply,
  });
  if (error) return { error: error.message };

  revalidatePath("/recurring");
  return { success: true };
}

export async function updateRecurringTransaction(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const id = getField(formData, "id");
  if (!id) return { error: "Registro inválido." };

  const parsed = parseRecurringFields(formData);
  if ("error" in parsed) return { error: parsed.error };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase
    .from("recurring_transactions")
    .update({
      name: parsed.name,
      type: parsed.type,
      amount: parsed.amount,
      category_id: parsed.categoryId,
      frequency: parsed.frequency,
      day_of_week: parsed.dayOfWeek,
      day_of_month: parsed.dayOfMonth,
      auto_apply: parsed.autoApply,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/recurring");
  return { success: true };
}

export async function deleteRecurringTransaction(
  _previousState: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const id = getField(formData, "id");
  if (!id) return { error: "Registro inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("recurring_transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/recurring");
  return { success: true };
}

export async function toggleRecurringActive(id: string, active: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("recurring_transactions").update({ active }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/recurring");
}

export async function toggleRecurringAutoApply(id: string, autoApply: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("recurring_transactions").update({ auto_apply: autoApply }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/recurring");
}

type OccurrenceWithDefinition = {
  id: string;
  scheduled_date: string;
  status: "pending" | "insufficient_funds" | "applied" | "rejected";
  recurring_transactions: {
    name: string;
    type: "income" | "expense";
    amount: number;
    category_id: string | null;
  } | null;
};

const REVIEWABLE_STATUSES = ["pending", "insufficient_funds"] as const;

/**
 * Aprueba una ocurrencia `pending` o `insufficient_funds` desde la bandeja
 * de revisión manual. Reusa `insertTransaction` (mismo punto de inserción
 * que `addTransaction`/`contributeToDragon`) para que esta transacción
 * dispare logros con normalidad, en vez de duplicar el insert aquí.
 */
export async function approveRecurringOccurrence(
  occurrenceId: string,
): Promise<{ achievements: AchievementDefinition[] } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: occurrence } = await supabase
    .from("recurring_transaction_occurrences")
    .select("id, scheduled_date, status, recurring_transactions(name, type, amount, category_id)")
    .eq("id", occurrenceId)
    .eq("user_id", user.id)
    .single<OccurrenceWithDefinition>();

  if (!occurrence || !REVIEWABLE_STATUSES.includes(occurrence.status as (typeof REVIEWABLE_STATUSES)[number])) {
    return { error: "Esta ocurrencia ya no está pendiente de revisión." };
  }

  const definition = occurrence.recurring_transactions;
  if (!definition) return { error: "No se encontró la recurrente asociada." };

  const inserted = await insertTransaction(supabase, {
    userId: user.id,
    type: definition.type,
    amount: definition.amount,
    categoryId: definition.category_id,
    description: definition.name,
    occurredOn: occurrence.scheduled_date,
    dragonId: null,
  });
  if (!inserted.success) return { error: inserted.error };

  await supabase
    .from("recurring_transaction_occurrences")
    .update({ status: "applied", transaction_id: inserted.id, resolved_at: new Date().toISOString() })
    .eq("id", occurrenceId)
    .eq("user_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/recurring");

  return { achievements: inserted.achievements };
}

export async function rejectRecurringOccurrence(occurrenceId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase
    .from("recurring_transaction_occurrences")
    .update({ status: "rejected", resolved_at: new Date().toISOString() })
    .eq("id", occurrenceId)
    .eq("user_id", user.id)
    .in("status", REVIEWABLE_STATUSES);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/recurring");
  return {};
}
