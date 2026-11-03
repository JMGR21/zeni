import type { SupabaseClient } from "@supabase/supabase-js";

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tope diario de mensajes del chat. Lee/crea la fila de `chat_usage_daily`
 * del día de hoy y, si todavía hay cupo, la incrementa en el mismo paso —
 * evita una carrera entre "leer cuántos van" y "sumar uno" en dos consultas
 * separadas.
 */
export async function checkAndIncrementDailyUsage(
  supabase: SupabaseClient,
  userId: string,
  limit: number,
  now: Date = new Date(),
): Promise<{ allowed: boolean; count: number }> {
  const day = toISODate(now);

  const { data: existing } = await supabase
    .from("chat_usage_daily")
    .select("message_count")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle<{ message_count: number }>();

  const currentCount = existing?.message_count ?? 0;
  if (currentCount >= limit) {
    return { allowed: false, count: currentCount };
  }

  const nextCount = currentCount + 1;
  await supabase
    .from("chat_usage_daily")
    .upsert({ user_id: userId, day, message_count: nextCount }, { onConflict: "user_id,day" });

  return { allowed: true, count: nextCount };
}
