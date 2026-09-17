"use server";

import { createClient } from "@/lib/supabase/server";
import { grantAchievement } from "@/lib/grant-achievement";
import type { AchievementDefinition } from "@/lib/achievements";
import { revalidatePath } from "next/cache";

export type CreateCategoryActionState = { error?: string; success?: boolean; achievements?: AchievementDefinition[] };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function createCategory(
  _previousState: CreateCategoryActionState,
  formData: FormData,
): Promise<CreateCategoryActionState> {
  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." };

  const type = getField(formData, "type");
  if (type !== "income" && type !== "expense") {
    return { error: "Selecciona un tipo válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("categories").insert({
    user_id: user.id,
    name,
    type,
  });
  if (error) return { error: error.message };

  const result = await grantAchievement(supabase, user.id, "tu-propia-categoria");

  revalidatePath("/categories");
  return { success: true, achievements: result.granted ? [result.achievement] : [] };
}

export async function toggleCategoryActive(id: string, active: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("categories").update({ active }).eq("id", id).eq("user_id", user.id);

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
}

export async function updateCategoryBudgetGroup(id: string, budgetGroup: "necesidad" | "deseo" | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("categories").update({ budget_group: budgetGroup }).eq("id", id).eq("user_id", user.id);

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/instruments/50-30-20");
}

export type UpdateCategoryActionState = { error?: string; success?: boolean };

export async function updateCategory(
  _previousState: UpdateCategoryActionState,
  formData: FormData,
): Promise<UpdateCategoryActionState> {
  const id = getField(formData, "id");
  const name = getField(formData, "name");
  if (!name) return { error: "Ingresa un nombre." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("categories").update({ name }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { success: true };
}

export type DeleteCategoryActionState = { error?: string; success?: boolean };

export async function deleteCategory(
  _previousState: DeleteCategoryActionState,
  formData: FormData,
): Promise<DeleteCategoryActionState> {
  const id = getField(formData, "id");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/categories");
  revalidatePath("/dashboard");
  revalidatePath("/budget");
  return { success: true };
}
