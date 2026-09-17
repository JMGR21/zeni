import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { cn } from "cn";
import type { FiftyThirtyTwentyResult } from "@/lib/fifty-thirty-twenty";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

type GroupKey = "necessity" | "want" | "savings";

const GROUPS: { key: GroupKey; label: string; idealPct: number; barColor: string; textColor: string }[] = [
  { key: "necessity", label: "Necesidad", idealPct: 50, barColor: "bg-ki-awakening", textColor: "text-ki-awakening" },
  { key: "want", label: "Deseo", idealPct: 30, barColor: "bg-ki-warrior", textColor: "text-ki-warrior" },
  { key: "savings", label: "Ahorro / Deuda", idealPct: 20, barColor: "bg-ki-saiyan", textColor: "text-ki-saiyan" },
];

// Marca vertical dentro de la barra en el % ideal, para comparar visualmente
// el real contra el objetivo sin necesitar una segunda gráfica.
export function FiftyThirtyTwentyBars({ result }: { result: FiftyThirtyTwentyResult }) {
  const amountByGroup: Record<GroupKey, number> = {
    necessity: result.necessityAmount,
    want: result.wantAmount,
    savings: result.savingsAmount,
  };
  const pctByGroup: Record<GroupKey, number> = {
    necessity: result.necessityPct,
    want: result.wantPct,
    savings: result.savingsPct,
  };

  return (
    <div className="space-y-6">
      {GROUPS.map((group) => {
        const actualPct = pctByGroup[group.key];
        return (
          <div key={group.key}>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">{group.label}</span>
              <span className={cn("font-mono text-sm", group.textColor)}>
                {Math.round(actualPct)}% <span className="text-ink-muted">· ideal {group.idealPct}%</span>
              </span>
            </div>
            <div className="relative mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-muted/15">
              <div
                className={cn("h-full rounded-full transition-all", group.barColor)}
                style={{ width: `${Math.min(actualPct, 100)}%` }}
              />
              <div
                aria-hidden="true"
                className="absolute top-0 h-full w-0.5 bg-ink"
                style={{ left: `${Math.min(group.idealPct, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink-muted">{currencyFormatter.format(amountByGroup[group.key])}</p>
          </div>
        );
      })}

      {result.unclassifiedAmount > 0 && (
        <p className="flex items-start gap-1.5 text-sm text-ki-survival">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {currencyFormatter.format(result.unclassifiedAmount)} ({Math.round(result.unclassifiedPct)}%) en
            categorías sin clasificar —{" "}
            <Link href="/categories" className="underline hover:no-underline">
              termina de clasificarlas
            </Link>{" "}
            para un cálculo más preciso.
          </span>
        </p>
      )}
    </div>
  );
}
