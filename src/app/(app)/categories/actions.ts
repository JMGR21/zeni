"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type CreateCategoryActionState = { error?: string; success?: boolean };

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

  revalidatePath("/categories");
  return { success: true };
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
