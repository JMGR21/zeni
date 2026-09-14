"use server";

import { createClient } from "@/lib/supabase/server";
import { syncDragonLinkForTransaction } from "@/lib/sync-dragon-link";
import { getInstitution } from "@/lib/institutions";
import { toISODateString } from "@/lib/weekly-xp";
import { grantAchievement } from "@/lib/grant-achievement";
import { projectDebt } from "@/lib/debt-projection";
import { insertTransaction } from "@/lib/create-transaction";
import type { AchievementDefinition } from "@/lib/achievements";
import { revalidatePath } from "next/cache";

export type CreateDragonActionState = { error?: string; success?: boolean };
export type ContributeActionState = { error?: string; success?: boolean; achievements?: AchievementDefinition[] };
export type FinancingActionState = { error?: string; success?: boolean; achievements?: AchievementDefinition[] };
export type UpdateDragonActionState = { error?: string; success?: boolean };
export type DeleteDragonActionState = { error?: string; success?: boolean };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createDragon(
  _previousState: CreateDragonActionState,
  formData: FormData,
): Promise<CreateDragonActionState> {
  const type = getField(formData, "type");
  if (type !== "savings" && type !== "debt") {
    return { error: "Selecciona un tipo válido." };
  }

  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." };

  const targetAmount = Number(getField(formData, "target_amount"));
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { error: "Ingresa una meta válida." };
  }

  const initialAmountRaw = getField(formData, "initial_amount");
  const initialAmount = initialAmountRaw ? Number(initialAmountRaw) : 0;
  if (!Number.isFinite(initialAmount) || initialAmount < 0) {
    return { error: "Ingresa un monto inicial válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("dragons").insert({
    user_id: user.id,
    name,
    type,
    target_amount: targetAmount,
    current_amount: initialAmount,
    status: initialAmount >= targetAmount ? "completed" : "active",
  });
  if (error) return { error: error.message };

  revalidatePath("/dragons");
  return { success: true };
}

export async function updateDragon(
  _previousState: UpdateDragonActionState,
  formData: FormData,
): Promise<UpdateDragonActionState> {
  const dragonId = getField(formData, "id");
  if (!dragonId) return { error: "Dragón inválido." };

  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." };

  const targetAmount = Number(getField(formData, "target_amount"));
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return { error: "Ingresa una meta válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: dragon, error: fetchError } = await supabase
    .from("dragons")
    .select("current_amount")
    .eq("id", dragonId)
    .eq("user_id", user.id)
    .single<{ current_amount: number }>();
  if (fetchError || !dragon) return { error: "No se encontró el dragón." };

  const { error } = await supabase
    .from("dragons")
    .update({
      name,
      target_amount: targetAmount,
      status: dragon.current_amount >= targetAmount ? "completed" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", dragonId)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dragons");
  return { success: true };
}

export async function deleteDragon(
  _previousState: DeleteDragonActionState,
  formData: FormData,
): Promise<DeleteDragonActionState> {
  const dragonId = getField(formData, "id");
  if (!dragonId) return { error: "Dragón inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("dragons").delete().eq("id", dragonId).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/dragons");
  return { success: true };
}

export async function contributeToDragon(
  _previousState: ContributeActionState,
  formData: FormData,
): Promise<ContributeActionState> {
  const dragonId = getField(formData, "dragon_id");
  if (!dragonId) return { error: "Dragón inválido." };

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const dragonName = getField(formData, "dragon_name");
  const dragonType = getField(formData, "dragon_type");
  const skipTransaction = formData.get("skip_transaction") === "on";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  let transactionId: string | null = null;
  const achievements: AchievementDefinition[] = [];
  if (!skipTransaction) {
    const description = dragonType === "debt" ? `Pago a ${dragonName}` : `Abono a ${dragonName}`;
    const inserted = await insertTransaction(supabase, {
      userId: user.id,
      type: "expense",
      amount,
      categoryId: null,
      description,
      occurredOn: toISODateString(new Date()),
      dragonId,
    });
    if (!inserted.success) return { error: inserted.error };
    transactionId = inserted.id;
    achievements.push(...inserted.achievements);
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
  }

  const result = await syncDragonLinkForTransaction(supabase, user.id, {
    transactionId,
    dragonId,
    amount,
    previousDragonId: null,
    previousAmount: 0,
  });
  if (result.error) return { error: result.error };
  achievements.push(...(result.achievements ?? []));

  revalidatePath("/dragons");
  return { success: true, achievements };
}

export async function updateDebtFinancing(
  _previousState: FinancingActionState,
  formData: FormData,
): Promise<FinancingActionState> {
  const dragonId = getField(formData, "dragon_id");
  if (!dragonId) return { error: "Dragón inválido." };

  const extraPaymentRaw = getField(formData, "extra_payment");
  const extraPayment = extraPaymentRaw ? Number(extraPaymentRaw) : 0;
  if (!Number.isFinite(extraPayment) || extraPayment < 0) {
    return { error: "Ingresa un pago extra válido." };
  }

  const institutionId = getField(formData, "institution") || null;
  const institution = getInstitution(institutionId);

  let interestRate: number | null;
  let minimumPayment: number | null;

  if (institution?.kind === "fixed_plan") {
    const totalAmount = Number(getField(formData, "total_amount"));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { error: "Ingresa el monto total a pagar." };
    }
    const termMonths = Number(getField(formData, "term_months"));
    if (!Number.isFinite(termMonths) || termMonths <= 0) {
      return { error: "Ingresa el plazo en meses." };
    }
    interestRate = null;
    minimumPayment = totalAmount / termMonths;
  } else {
    const interestRateRaw = getField(formData, "interest_rate");
    interestRate = interestRateRaw ? Number(interestRateRaw) : null;
    if (interestRate !== null && (!Number.isFinite(interestRate) || interestRate < 0)) {
      return { error: "Ingresa una tasa de interés válida." };
    }

    const minimumPaymentRaw = getField(formData, "minimum_payment");
    minimumPayment = minimumPaymentRaw ? Number(minimumPaymentRaw) : null;
    if (minimumPayment !== null && (!Number.isFinite(minimumPayment) || minimumPayment < 0)) {
      return { error: "Ingresa un pago mínimo válido." };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: previousDragon } = await supabase
    .from("dragons")
    .select("current_amount, target_amount, interest_rate, minimum_payment, extra_payment")
    .eq("id", dragonId)
    .eq("user_id", user.id)
    .eq("type", "debt")
    .single<{
      current_amount: number;
      target_amount: number;
      interest_rate: number | null;
      minimum_payment: number | null;
      extra_payment: number;
    }>();

  const { error: updateError } = await supabase
    .from("dragons")
    .update({
      institution: institution?.id ?? null,
      interest_rate: interestRate,
      minimum_payment: minimumPayment,
      extra_payment: extraPayment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dragonId)
    .eq("user_id", user.id)
    .eq("type", "debt");
  if (updateError) return { error: updateError.message };

  const achievements: AchievementDefinition[] = [];
  if (previousDragon) {
    const pendingBalance = previousDragon.target_amount - previousDragon.current_amount;
    const previousProjection = projectDebt({
      pendingBalance,
      annualRate: previousDragon.interest_rate,
      minimumPayment: previousDragon.minimum_payment,
      extraPayment: previousDragon.extra_payment,
    });
    const nextProjection = projectDebt({
      pendingBalance,
      annualRate: interestRate,
      minimumPayment,
      extraPayment,
    });
    if (previousProjection.status !== "payable" && nextProjection.status === "payable") {
      const result = await grantAchievement(supabase, user.id, "deuda-rescatada");
      if (result.granted) achievements.push(result.achievement);
    }
  }

  revalidatePath("/dragons");
  return { success: true, achievements };
}

/**
 * "Decisión Informada" (Categoría H): se dispara desde el cliente
 * (`ComparatorUsageTracker`) una vez que el comparador avalancha/bola de
 * nieve realmente se muestra en pantalla (2+ Dragones de deuda activos).
 * Devuelve el logro (si se otorgó) para que el tracker lo muestre como
 * toast igual que el resto de puntos de entrada.
 */
export async function recordComparatorUsage(): Promise<AchievementDefinition[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const result = await grantAchievement(supabase, user.id, "decision-informada");
  return result.granted ? [result.achievement] : [];
}

export async function swapDragonPriority(dragonId: string, otherDragonId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: rows } = await supabase
    .from("dragons")
    .select("id, priority")
    .in("id", [dragonId, otherDragonId])
    .eq("user_id", user.id)
    .eq("type", "debt")
    .returns<{ id: string; priority: number | null }[]>();
  if (!rows || rows.length !== 2) return;

  const current = rows.find((row) => row.id === dragonId);
  const other = rows.find((row) => row.id === otherDragonId);
  if (!current || !other || current.priority === null || other.priority === null) return;

  await Promise.all([
    supabase.from("dragons").update({ priority: other.priority }).eq("id", current.id).eq("user_id", user.id),
    supabase.from("dragons").update({ priority: current.priority }).eq("id", other.id).eq("user_id", user.id),
  ]);

  revalidatePath("/dragons");
}
