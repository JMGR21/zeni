import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type StatDelta = {
  percent: number;
  direction: "higherIsBetter" | "lowerIsBetter";
};

function formatPercent(value: number): string {
  const rounded = Math.round(Math.abs(value));
  return `${rounded}%`;
}

export function StatTile({
  icon,
  label,
  value,
  delta,
  deltaLabel = "vs. mes anterior",
  infoTooltip,
  bufferBreakdown,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: StatDelta | null;
  deltaLabel?: string;
  // Explicación breve mostrada en un Popover junto a la etiqueta — usado
  // por el colchón de ingreso reservado para que el desglose no se sienta
  // como un número inconsistente sin contexto.
  infoTooltip?: string;
  // Cuando el periodo recibió un colchón entrante (ver `monthly-balance.ts`),
  // sustituye el número simple por bruto/colchón/neto — el bruto nunca se
  // oculta, el colchón se muestra como contexto adicional.
  bufferBreakdown?: { rawBalance: string; incomingBuffer: string; netBalance: string };
}) {
  const isIncrease = delta ? delta.percent > 0 : null;
  const isGood =
    delta && isIncrease !== null
      ? delta.direction === "higherIsBetter"
        ? isIncrease
        : !isIncrease
      : null;

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2">
        <span className="text-ki-awakening">{icon}</span>
        <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">{label}</span>
        {infoTooltip && (
          <Popover>
            <PopoverTrigger
              render={
                <button
                  type="button"
                  aria-label="Más información"
                  className="text-ink-muted/60 hover:text-ink-muted"
                />
              }
            >
              <Info className="size-3" aria-hidden="true" />
            </PopoverTrigger>
            <PopoverContent className="max-w-64 text-xs text-ink-muted">{infoTooltip}</PopoverContent>
          </Popover>
        )}
      </div>
      {bufferBreakdown ? (
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">Balance bruto</span>
            <span className="font-mono text-sm text-ink">{bufferBreakdown.rawBalance}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ink-muted">Colchón del periodo anterior</span>
            <span className="font-mono text-sm text-ki-saiyan">{bufferBreakdown.incomingBuffer}</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 border-t border-ink-muted/10 pt-1">
            <span className="text-xs font-medium text-ink-muted">Balance neto</span>
            <span className="font-mono text-lg text-ink">{bufferBreakdown.netBalance}</span>
          </div>
        </div>
      ) : (
        <p className="mt-2 font-mono text-2xl text-ink">{value}</p>
      )}
      {delta && delta.percent !== 0 ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            isGood ? "text-emerald-400" : "text-ki-survival",
          )}
        >
          {isIncrease ? (
            <ArrowUpRight className="size-3" aria-hidden="true" />
          ) : (
            <ArrowDownRight className="size-3" aria-hidden="true" />
          )}
          {formatPercent(delta.percent)} {deltaLabel}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink-muted">Sin cambio vs. mes anterior</p>
      )}
    </div>
  );
}
