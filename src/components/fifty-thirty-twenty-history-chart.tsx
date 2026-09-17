import { cn } from "cn";
import type { FiftyThirtyTwentyMonth, FiftyThirtyTwentyResult } from "@/lib/fifty-thirty-twenty";

const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "short", year: "2-digit" });

type GroupSpec = {
  key: "necessity" | "want" | "savings";
  pctKey: keyof Pick<FiftyThirtyTwentyResult, "necessityPct" | "wantPct" | "savingsPct">;
  label: string;
  idealPct: number;
  barColor: string;
  lineColor: string;
};

const GROUPS: GroupSpec[] = [
  { key: "necessity", pctKey: "necessityPct", label: "Necesidad", idealPct: 50, barColor: "bg-ki-awakening", lineColor: "border-ki-awakening/40" },
  { key: "want", pctKey: "wantPct", label: "Deseo", idealPct: 30, barColor: "bg-ki-warrior", lineColor: "border-ki-warrior/40" },
  { key: "savings", pctKey: "savingsPct", label: "Ahorro / Deuda", idealPct: 20, barColor: "bg-ki-saiyan", lineColor: "border-ki-saiyan/40" },
];

// 3 "small multiples" (una por grupo) en vez de un BarChart de Tremor: cada
// serie necesita su propio color de la paleta Ki (`ki-awakening`/
// `ki-warrior`/`ki-saiyan`), y Tremor solo puede colorear series pasándole
// `colors` con nombres de la paleta estándar de Tailwind (construye clases
// `bg-${color}-500` en runtime) — no hay forma de pasarle un token custom.
// La línea punteada marca el % ideal de esa fila, así se ve de un vistazo
// qué meses estuvieron arriba o abajo del objetivo.
export function FiftyThirtyTwentyHistoryChart({ history }: { history: FiftyThirtyTwentyMonth[] }) {
  const hasAnyData = history.some((entry) => entry.result !== null);

  if (!hasAnyData) {
    return (
      <p className="text-sm text-ink-muted">
        Aún no hay suficiente historial de ingresos para mostrar una tendencia.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => (
        <div key={group.key}>
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">{group.label}</span>
            <span className="text-xs text-ink-muted">ideal {group.idealPct}%</span>
          </div>
          <div className="relative mt-2 h-20">
            <div
              aria-hidden="true"
              className={cn("absolute inset-x-0 border-t border-dashed", group.lineColor)}
              style={{ bottom: `${group.idealPct}%` }}
            />
            <div className="flex h-full items-end gap-1.5">
              {history.map((entry) => {
                const pct = entry.result ? Math.min(entry.result[group.pctKey], 100) : 0;
                const label = entry.result
                  ? `${monthFormatter.format(new Date(`${entry.month}T00:00:00`))}: ${Math.round(pct)}%`
                  : `${monthFormatter.format(new Date(`${entry.month}T00:00:00`))}: sin datos`;
                return (
                  <div key={entry.month} className="flex h-full flex-1 items-end" title={label}>
                    {entry.result ? (
                      <div className={cn("w-full rounded-t transition-all", group.barColor)} style={{ height: `${pct}%` }} />
                    ) : (
                      <div className="h-1 w-full rounded-full bg-ink-muted/15" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      <div className="flex gap-1.5">
        {history.map((entry) => (
          <span key={entry.month} className="flex-1 text-center font-mono text-[10px] text-ink-muted uppercase">
            {monthFormatter.format(new Date(`${entry.month}T00:00:00`))}
          </span>
        ))}
      </div>
    </div>
  );
}
