import { GiLaurelsTrophy } from "react-icons/gi";
import { AchievementCard } from "@/components/achievement-card";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORY_LABELS,
  ACHIEVEMENT_CATEGORY_ORDER,
  TOTAL_ACHIEVEMENT_COUNT,
} from "@/lib/achievements";
import { createClient } from "@/lib/supabase/server";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: unlockedRows } = user
    ? await supabase
        .from("user_achievements")
        .select("achievement_slug, unlocked_at")
        .eq("user_id", user.id)
        .returns<{ achievement_slug: string; unlocked_at: string }[]>()
    : { data: [] };

  const unlockedAtBySlug = new Map((unlockedRows ?? []).map((row) => [row.achievement_slug, row.unlocked_at]));

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <GiLaurelsTrophy className="size-3.5 text-ki-awakening" aria-hidden="true" />
        Vitrina
      </div>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Logros</h1>
      <p className="mt-1 text-sm text-ink-muted">
        {unlockedAtBySlug.size} de {TOTAL_ACHIEVEMENT_COUNT} desbloqueados
      </p>

      {ACHIEVEMENT_CATEGORY_ORDER.map((category) => {
        const items = ACHIEVEMENTS.filter((achievement) => achievement.category === category);
        if (items.length === 0) return null;

        return (
          <div key={category} className="mt-8">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
              {ACHIEVEMENT_CATEGORY_LABELS[category]}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((achievement) => (
                <AchievementCard
                  key={achievement.slug}
                  achievement={achievement}
                  unlockedAt={unlockedAtBySlug.get(achievement.slug) ?? null}
                />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
