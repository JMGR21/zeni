import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "cn";

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
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: StatDelta | null;
  deltaLabel?: string;
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
      </div>
      <p className="mt-2 font-mono text-2xl text-ink">{value}</p>
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
