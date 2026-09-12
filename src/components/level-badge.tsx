const xpFormatter = new Intl.NumberFormat("es-MX");

type LevelBadgeProps = {
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  totalXp: number;
};

// Nivel es un concepto distinto al Ki (sube solo con constancia, nunca
// baja) — por eso vive en su propia tarjeta, con su propio acento
// (ki-saiyan2, ya establecido para "logro/mastery" en Dragones completados)
// en vez del color dinámico del KiGauge.
export function LevelBadge({ level, xpIntoLevel, xpForNextLevel, totalXp }: LevelBadgeProps) {
  const percent = xpForNextLevel > 0 ? Math.min(100, (xpIntoLevel / xpForNextLevel) * 100) : 0;

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 px-5 py-4">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-ki-saiyan2/60" />

      <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Nivel</p>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-display text-4xl font-semibold text-ink">{level}</span>
        <span className="font-mono text-xs text-ink-muted">{xpFormatter.format(totalXp)} XP</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
        <div className="h-full rounded-full bg-ki-saiyan2 transition-all" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 font-mono text-[11px] text-ink-muted">
        {xpFormatter.format(xpIntoLevel)} / {xpFormatter.format(xpForNextLevel)} XP
      </p>
    </div>
  );
}
