import { PiggyBank } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

// Tarjeta compacta para la franja superior del dashboard: el Saldo
// Disponible (lo líquido para gastar) como número principal, con el Saldo
// Total y lo apartado en Dragones de ahorro como línea secundaria —
// ninguno de los dos reemplaza el "Saldo del periodo" (StatTile), que
// sigue siendo income-expenses del periodo en curso para Ki/Presupuesto.
export function TotalBalanceStatTile({
  totalBalance,
  availableBalance,
  savedInDragons,
}: {
  totalBalance: number;
  availableBalance: number;
  savedInDragons: number;
}) {
  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2">
        <PiggyBank className="size-3.5 text-ki-awakening" aria-hidden="true" />
        <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Saldo disponible</span>
      </div>
      <p className="mt-2 font-mono text-2xl text-ink">{currencyFormatter.format(availableBalance)}</p>
      <p className="mt-1 text-xs text-ink-muted">
        Saldo total: {currencyFormatter.format(totalBalance)}
        {savedInDragons > 0 && `, de los cuales ${currencyFormatter.format(savedInDragons)} están en tus Dragones de ahorro`}
      </p>
    </div>
  );
}
