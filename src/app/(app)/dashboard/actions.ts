"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}
