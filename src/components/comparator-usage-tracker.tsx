"use client";

import { useEffect, useRef, useState } from "react";
import { recordComparatorUsage } from "@/app/(app)/dragons/actions";
import { useAchievementToasts } from "@/hooks/use-achievement-toasts";
import type { AchievementDefinition } from "@/lib/achievements";

/**
 * Dispara el logro "Decisión Informada" una sola vez cuando el comparador
 * avalancha/bola de nieve realmente se monta en pantalla. Sin salida
 * visual — `DebtStrategyComparison` es un Server Component, así que esto
 * vive en un pequeño componente cliente aparte para poder usar `useEffect`.
 */
export function ComparatorUsageTracker() {
  const recorded = useRef(false);
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  useAchievementToasts(achievements);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordComparatorUsage().then(setAchievements);
  }, []);

  return null;
}
