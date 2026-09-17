import type { FiftyThirtyTwentyResult } from "@/lib/fifty-thirty-twenty";

// Versión compacta para el dashboard: una sola barra apilada (Necesidad/
// Deseo/Ahorro, recortada a 100% entre las tres) más los 3 porcentajes
// debajo — el detalle completo (comparación contra el ideal, sin clasificar)
// vive en /instruments/50-30-20.
export function FiftyThirtyTwentySummary({ result }: { result: FiftyThirtyTwentyResult | null }) {
  if (!result) {
    return (
      <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
        <p className="text-sm text-ink-muted">Registra un ingreso este mes para ver tu 50/30/20.</p>
      </div>
    );
  }

  const necessity = Math.max(0, Math.min(100, result.necessityPct));
  const want = Math.max(0, Math.min(100 - necessity, result.wantPct));
  const savings = Math.max(0, Math.min(100 - necessity - want, result.savingsPct));

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-ink-muted/15">
        <div className="h-full bg-ki-awakening" style={{ width: `${necessity}%` }} />
        <div className="h-full bg-ki-warrior" style={{ width: `${want}%` }} />
        <div className="h-full bg-ki-saiyan" style={{ width: `${savings}%` }} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Necesidad</p>
          <p className="mt-1 font-mono text-sm text-ki-awakening">{Math.round(result.necessityPct)}%</p>
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Deseo</p>
          <p className="mt-1 font-mono text-sm text-ki-warrior">{Math.round(result.wantPct)}%</p>
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Ahorro</p>
          <p className="mt-1 font-mono text-sm text-ki-saiyan">{Math.round(result.savingsPct)}%</p>
        </div>
      </div>
    </div>
  );
}
