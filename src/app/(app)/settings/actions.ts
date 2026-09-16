"use server";

import { createClient } from "@/lib/supabase/server";
import { grantAchievement } from "@/lib/grant-achievement";
import type { AchievementDefinition } from "@/lib/achievements";
import { revalidatePath } from "next/cache";

export type UpdateProfileActionState = { error?: string; success?: boolean; achievements?: AchievementDefinition[] };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateProfile(
  _previousState: UpdateProfileActionState,
  formData: FormData,
): Promise<UpdateProfileActionState> {
  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." };

  const currency = getField(formData, "currency") || "MXN";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error, count } = await supabase
    .from("profiles")
    .update({ name, currency }, { count: "exact" })
    .eq("id", user.id);
  if (error) return { error: error.message };
  if (!count) return { error: "No se pudo guardar el cambio. Intenta de nuevo." };

  const result = await grantAchievement(supabase, user.id, "identidad-completa");

  revalidatePath("/settings");
  return { success: true, achievements: result.granted ? [result.achievement] : [] };
}

export type ResetAccountActionState = { error?: string; success?: boolean };

export async function resetAccount(
  _previousState: ResetAccountActionState,
  formData: FormData,
): Promise<ResetAccountActionState> {
  const password = getField(formData, "password");
  if (!password) return { error: "Ingresa tu contraseña." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password });
  if (authError) return { error: "Contraseña incorrecta." };

  const { error: rpcError } = await supabase.rpc("reset_account");
  if (rpcError) return { error: rpcError.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/dragons");
  revalidatePath("/training");
  revalidatePath("/categories");
  revalidatePath("/recurring");
  revalidatePath("/achievements");

  return { success: true };
}

export async function updateInitialBalance(initialBalance: number) {
  const amount = Number.isFinite(initialBalance) ? initialBalance : 0;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error, count } = await supabase
    .from("profiles")
    .update({ initial_balance: amount }, { count: "exact" })
    .eq("id", user.id);
  if (error || !count) {
    console.error("[updateInitialBalance] failed to persist initial_balance", error?.message ?? "0 rows updated");
    return;
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function updateMonthStartDay(monthStartDay: number) {
  const day = Math.min(28, Math.max(1, Math.floor(monthStartDay)));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error, count } = await supabase
    .from("profiles")
    .update({ month_start_day: day }, { count: "exact" })
    .eq("id", user.id);
  if (error || !count) {
    console.error("[updateMonthStartDay] failed to persist month_start_day", error?.message ?? "0 rows updated");
    return;
  }

  revalidatePath("/dashboard");
}

export async function updateAvatar(avatarId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error, count } = await supabase
    .from("profiles")
    .update({ avatar_id: avatarId }, { count: "exact" })
    .eq("id", user.id);
  if (error || !count) {
    console.error("[updateAvatar] failed to persist avatar_id", error?.message ?? "0 rows updated");
    return;
  }

  // El avatar se muestra en el header (AppHeader) de cada página, no solo
  // en /settings — hay que revalidar todas las rutas que lo renderizan.
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/budget");
  revalidatePath("/dragons");
  revalidatePath("/training");
  revalidatePath("/categories");
}
