import { z } from "zod";
import { getTotalXp } from "@/lib/grant-xp";
import { getLevelFromXp } from "@/lib/level";
import { ACHIEVEMENTS, type AchievementCategory } from "@/lib/achievements";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({});

export const getLevelAndAchievementsTool: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_level_and_achievements",
    description:
      "Nivel y XP total del usuario, más la lista de logros ya desbloqueados (nombre, categoría, fecha). Nunca incluye logros secretos no desbloqueados ni su condición de desbloqueo.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx) {
    const { supabase, userId } = ctx;

    const [totalXp, { data: unlockedRows }] = await Promise.all([
      getTotalXp(supabase, userId),
      supabase
        .from("user_achievements")
        .select("achievement_slug, unlocked_at")
        .eq("user_id", userId)
        .returns<{ achievement_slug: string; unlocked_at: string }[]>(),
    ]);

    const definitionBySlug = new Map(ACHIEVEMENTS.map((achievement) => [achievement.slug, achievement]));

    const unlockedAchievements = (unlockedRows ?? [])
      .map((row) => {
        const definition = definitionBySlug.get(row.achievement_slug);
        if (!definition) return null;
        return { name: definition.name, category: definition.category, unlockedAt: row.unlocked_at };
      })
      .filter(
        (achievement): achievement is { name: string; category: AchievementCategory; unlockedAt: string } =>
          achievement !== null,
      );

    return {
      ...getLevelFromXp(totalXp),
      totalXp,
      unlockedAchievements,
      totalAchievements: ACHIEVEMENTS.length,
      unlockedCount: unlockedAchievements.length,
    };
  },
};
