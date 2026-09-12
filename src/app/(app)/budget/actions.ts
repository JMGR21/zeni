"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BudgetActionState = { error?: string; success?: boolean };

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

  revalidatePath("/budget");
  return { success: true };
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
