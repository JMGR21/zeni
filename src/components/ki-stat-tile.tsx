import { KiGauge } from "@/components/ki-gauge";
import { getKiLevel, getKiProgressToNextLevel } from "@/lib/ki";

// Reemplaza al hero gigante del KiGauge en la franja superior del
// dashboard: mismo tamaño relativo que el resto de las tarjetas de esa
// fila. El medidor va sin glow (size chico, glow reservado al tamaño hero
// en otras pantallas) y sin la etiqueta interna (no cabe a este tamaño) —
// la etiqueta se muestra como texto normal junto al medidor.
export function KiStatTile({ score }: { score: number }) {
  const level = getKiLevel(score);
  const progress = getKiProgressToNextLevel(score);

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-3">
        <KiGauge score={score} size={56} glow={false} showLabel={false} />
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Ki actual</p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">{level.label}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {progress.atMaxLevel
          ? "Nivel máximo de Ki alcanzado"
          : `Faltan ${progress.pointsNeeded} pts para ${progress.nextLevel.label}`}
      </p>
    </div>
  );
}
