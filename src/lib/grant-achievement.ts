import type { SupabaseClient } from "@supabase/supabase-js";
import { getAchievement, type AchievementDefinition } from "@/lib/achievements";
import { grantXp, getTotalXp } from "@/lib/grant-xp";
import { getXpNeededForNextLevel } from "@/lib/level";

const UNIQUE_VIOLATION = "23505";

export type GrantAchievementResult = { granted: true; achievement: AchievementDefinition } | { granted: false };

/**
 * Desbloquea un logro para un usuario: inserta en `user_achievements` (el
 * unique constraint evita otorgarlo dos veces, igual que `grantXp` con
 * `xp_events`) y, si tiene éxito, otorga su XP. Los logros con
 * `grantsLevelUp` además otorgan un segundo evento de XP calculado para
 * cruzar exactamente al siguiente nivel. Devuelve la definición del logro
 * cuando sí se otorga, para que quien lo llama pueda mostrar un aviso
 * (toast) de desbloqueo.
 */
export async function grantAchievement(
  supabase: SupabaseClient,
  userId: string,
  slug: string,
): Promise<GrantAchievementResult> {
  const definition = getAchievement(slug);
  if (!definition) throw new Error(`Logro desconocido: ${slug}`);

  const { error } = await supabase.from("user_achievements").insert({
    user_id: userId,
    achievement_slug: slug,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { granted: false };
    throw error;
  }

  await grantXp(supabase, userId, "achievement", definition.xp, `achievement:${slug}`);

  if (definition.grantsLevelUp) {
    const totalXp = await getTotalXp(supabase, userId);
    const bonus = getXpNeededForNextLevel(totalXp);
    if (bonus > 0) {
      await grantXp(supabase, userId, "achievement_levelup_bonus", bonus, `achievement-levelup:${slug}`);
    }
  }

  return { granted: true, achievement: definition };
}
