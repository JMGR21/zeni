import type { SupabaseClient } from "@supabase/supabase-js";

const UNIQUE_VIOLATION = "23505";

/**
 * Otorga XP insertando en `xp_events`. El constraint unique (user_id,
 * dedupe_key) evita otorgar el mismo XP dos veces — si ya existe, devuelve
 * `{ granted: false }` en vez de propagar el error. Cualquier otro error sí
 * se propaga.
 */
export async function grantXp(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  amount: number,
  dedupeKey: string,
): Promise<{ granted: boolean }> {
  const { error } = await supabase.from("xp_events").insert({
    user_id: userId,
    type,
    amount,
    dedupe_key: dedupeKey,
  });

  if (!error) return { granted: true };
  if (error.code === UNIQUE_VIOLATION) return { granted: false };
  throw error;
}

export async function getTotalXp(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data } = await supabase.from("xp_events").select("amount").eq("user_id", userId);
  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}
