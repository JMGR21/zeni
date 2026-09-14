"use server";

import { createClient } from "@/lib/supabase/server";
import { grantAchievement } from "@/lib/grant-achievement";
import type { AchievementDefinition } from "@/lib/achievements";
import { revalidatePath } from "next/cache";

export type BudgetActionState = { error?: string; success?: boolean; achievements?: AchievementDefinition[] };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function setBudget(
  _previousState: BudgetActionState,
  formData: FormData,
): Promise<BudgetActionState> {
  const categoryId = getField(formData, "category_id");
  if (!categoryId) return { error: "Categoría inválida." };

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Ingresa un monto válido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category_id: categoryId, amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id,category_id" },
    );
  if (error) return { error: error.message };

  const result = await grantAchievement(supabase, user.id, "presupuesto-a-tu-manera");

  revalidatePath("/budget");
  return { success: true, achievements: result.granted ? [result.achievement] : [] };
}

export async function resetBudget(categoryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("budgets").delete().eq("user_id", user.id).eq("category_id", categoryId);
  revalidatePath("/budget");
}
