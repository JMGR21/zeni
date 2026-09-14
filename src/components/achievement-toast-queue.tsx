"use client";

import { useAchievementToasts } from "@/hooks/use-achievement-toasts";
import type { AchievementDefinition } from "@/lib/achievements";

/**
 * Puente para mostrar toasts de logros desde un Server Component (ej. el
 * dashboard, donde `awardMonthlyXp`/`evaluateGeneralAchievements` calculan
 * la lista al cargar la página) — un formulario cliente ya puede llamar a
 * `useAchievementToasts` directamente con `state.achievements`, pero un
 * Server Component no puede usar hooks, así que le pasa la lista a este
 * componente cliente sin salida visual.
 */
export function AchievementToastQueue({ achievements }: { achievements: AchievementDefinition[] }) {
  useAchievementToasts(achievements);
  return null;
}
