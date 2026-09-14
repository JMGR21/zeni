import type { KiBreakdown as KiBreakdownData } from "@/lib/ki-calculations";

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

const ROWS: { key: keyof KiBreakdownData; label: string; weight: string; color: string }[] = [
  { key: "saludActual", label: "Salud actual", weight: "35%", color: "bg-ki-awakening" },
  { key: "momentum", label: "Momentum", weight: "35%", color: "bg-ki-saiyan2" },
  { key: "presupuesto", label: "Presupuesto", weight: "20%", color: "bg-ki-saiyan" },
  { key: "constancia", label: "Constancia", weight: "10%", color: "bg-ki-dormant" },
];

export function KiBreakdown({ breakdown }: { breakdown: KiBreakdownData }) {
  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-5">
      <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
        Desglose de Ki
      </h2>
      <div className="mt-4 space-y-4">
        {ROWS.map((row) => (
          <div key={row.key}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">
                {row.label} · {row.weight}
              </span>
              <span className="font-mono text-sm text-ink">{Math.round(breakdown[row.key])}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
              <div
                className={`h-full rounded-full ${row.color}`}
                style={{ width: `${clampPercent(breakdown[row.key])}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
