"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateProfileActionState = { error?: string; success?: boolean };

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

  revalidatePath("/settings");
  return { success: true };
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
