import { createElement } from "react";
import { GiHelp } from "react-icons/gi";
import { cn } from "cn";
import { formatRelativeDays } from "@/lib/relative-time";
import { resolveGameIcon } from "@/lib/resolve-game-icon";
import type { AchievementDefinition } from "@/lib/achievements";

/**
 * Una fila de la vitrina de logros. Tres estados posibles:
 * desbloqueado (ícono a color + fecha), pendiente normal (ícono atenuado,
 * pero nombre/descripción visibles como guía de qué hacer), y pendiente
 * secreto (Categoría L: ni nombre ni descripción, solo un ícono de
 * interrogación — no arruina la sorpresa).
 */
export function AchievementCard({
  achievement,
  unlockedAt,
}: {
  achievement: AchievementDefinition;
  unlockedAt: string | null;
}) {
  const unlocked = unlockedAt !== null;
  const isHiddenSecret = achievement.secret && !unlocked;
  const icon = isHiddenSecret ? GiHelp : resolveGameIcon(achievement.icon);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          unlocked ? "bg-ki-awakening/15 text-ki-awakening" : "bg-ink-muted/10 text-ink-muted/60",
        )}
      >
        {icon ? createElement(icon, { className: "size-5", "aria-hidden": true }) : null}
      </div>

      {isHiddenSecret ? (
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">Logro secreto</p>
          <p className="mt-0.5 text-xs text-ink-muted/70">Desbloquéalo para revelarlo</p>
        </div>
      ) : (
        <div className="min-w-0">
          <p className={cn("text-sm font-medium", unlocked ? "text-ink" : "text-ink-muted")}>{achievement.name}</p>
          <p className="mt-0.5 text-xs text-ink-muted">{achievement.description}</p>
          {unlocked && (
            <p className="mt-1 font-mono text-[11px] tracking-widest text-ki-awakening uppercase">
              {formatRelativeDays(unlockedAt)} · +{achievement.xp} XP
            </p>
          )}
        </div>
      )}
    </div>
  );
}
