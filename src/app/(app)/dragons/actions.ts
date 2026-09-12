"use server";

import { createClient } from "@/lib/supabase/server";
import { getInstitution } from "@/lib/institutions";
import { getSphereProgress } from "@/lib/spheres";
import { grantXp } from "@/lib/grant-xp";
import { revalidatePath } from "next/cache";

export type CreateDragonActionState = { error?: string; success?: boolean };
export type ContributeActionState = { error?: string; success?: boolean };
export type FinancingActionState = { error?: string; success?: boolean };

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: dragon, error: fetchError } = await supabase
    .from("dragons")
    .select("current_amount, target_amount")
    .eq("id", dragonId)
    .eq("user_id", user.id)
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
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  await supabase.from("dragon_contributions").insert({ dragon_id: dragonId, user_id: user.id, amount });

  const spheresAfter = getSphereProgress(nextAmount, dragon.target_amount);
  const newlyCompletedIndexes = spheresAfter
    .map((completed, index) => (completed && !spheresBefore[index] ? index : null))
    .filter((index): index is number => index !== null);

  for (const sphereIndex of newlyCompletedIndexes) {
    await grantXp(supabase, user.id, "sphere_completed", 50, `sphere:${dragonId}:${sphereIndex}`);
  }

  revalidatePath("/dragons");
  return { success: true };
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

  revalidatePath("/dragons");
  return { success: true };
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
