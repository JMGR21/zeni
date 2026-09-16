"use client";

import { createElement, useEffect } from "react";
import { toast } from "sonner";
import { resolveGameIcon } from "@/lib/resolve-game-icon";
import type { AchievementDefinition } from "@/lib/achievements";

/**
 * Encola un toast breve (ícono + nombre + XP) por cada logro en
 * `achievements` — el único punto que sabe "cómo mostrar un logro
 * desbloqueado", reutilizado desde cualquier entrada: un formulario que usa
 * `useActionState` (pasa `state.achievements` directo) o un Server
 * Component que ya calculó la lista (vía `AchievementToastQueue`).
 *
 * Dispara una vez por cada array NUEVO recibido — cada resultado de acción
 * o carga de página trae su propia referencia, así que no hace falta
 * deduplicar manualmente: un array vacío (nada desbloqueado) no hace nada,
 * y un array repetido (mismo estado, sin nuevo submit) no vuelve a correr
 * el efecto porque React no ve un cambio de dependencia.
 */
export function useAchievementToasts(achievements: AchievementDefinition[] | undefined): void {
  useEffect(() => {
    if (!achievements || achievements.length === 0) return;

    for (const achievement of achievements) {
      const icon = resolveGameIcon(achievement.icon);
      toast(achievement.name, {
        description: `+${achievement.xp} XP`,
        icon: icon ? createElement(icon, { className: "size-4 text-ki-awakening", "aria-hidden": true }) : undefined,
      });
    }
  }, [achievements]);
}
