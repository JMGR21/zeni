import type { Dragon } from "@/components/dragon-card";
import { projectDebt } from "@/lib/debt-projection";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function DragonsSummary({ dragons }: { dragons: Dragon[] }) {
  const activeSavings = dragons.filter((dragon) => dragon.type === "savings" && dragon.status === "active");
  const totalSaved = activeSavings.reduce((sum, dragon) => sum + dragon.current_amount, 0);

  const activeDebts = dragons.filter((dragon) => dragon.type === "debt" && dragon.status === "active");
  const totalDebtPending = activeDebts.reduce(
    (sum, dragon) => sum + (dragon.target_amount - dragon.current_amount),
    0,
  );

  let totalProjectedInterest = 0;
  let excludedDebts = 0;
  for (const dragon of activeDebts) {
    const projection = projectDebt({
      pendingBalance: dragon.target_amount - dragon.current_amount,
      annualRate: dragon.interest_rate,
      minimumPayment: dragon.minimum_payment,
      extraPayment: dragon.extra_payment,
    });
    if (projection.status === "payable") {
      totalProjectedInterest += projection.totalInterest;
    } else {
      excludedDebts += 1;
    }
  }

  if (activeSavings.length === 0 && activeDebts.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 p-5">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-ki-awakening/60" />

      <div className="grid grid-cols-1 gap-4 text-center sm:grid-cols-3">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Total ahorrado</p>
          <p className="mt-1 font-mono text-lg text-ki-saiyan">{currencyFormatter.format(totalSaved)}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Deuda total pendiente</p>
          <p className="mt-1 font-mono text-lg text-ki-warrior">{currencyFormatter.format(totalDebtPending)}</p>
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Interés total proyectado</p>
          <p className="mt-1 font-mono text-lg text-ink">{currencyFormatter.format(totalProjectedInterest)}</p>
          {excludedDebts > 0 && (
            <p className="mt-1 text-[11px] text-ink-muted">
              No incluye {excludedDebts} {excludedDebts === 1 ? "deuda" : "deudas"} sin pago definido o que no bajan
              al ritmo actual.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
