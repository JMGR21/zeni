import type { ReactNode } from "react";
import { GiCrossedSwords, GiSnowflake1 } from "react-icons/gi";
import type { Dragon } from "@/components/dragon-card";
import { simulateDebtPayoff, type DebtPayoffInput, type DebtPayoffResult } from "@/lib/debt-payoff-simulator";

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function monthsLabel(months: number) {
  return `${months} ${months === 1 ? "mes" : "meses"}`;
}

function buildPayoffInputs(dragons: Dragon[]): DebtPayoffInput[] {
  return dragons
    .filter((dragon) => (dragon.minimum_payment ?? 0) + dragon.extra_payment > 0)
    .map((dragon) => ({
      id: dragon.id,
      name: dragon.name,
      pendingBalance: dragon.target_amount - dragon.current_amount,
      monthlyRate: dragon.interest_rate ? dragon.interest_rate / 100 / 12 : 0,
      minimumPayment: dragon.minimum_payment ?? 0,
      extraPayment: dragon.extra_payment,
    }));
}

function StrategyCard({
  icon,
  label,
  result,
}: {
  icon: ReactNode;
  label: string;
  result: DebtPayoffResult;
}) {
  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        {icon}
        {label}
      </div>

      {result.status === "not_converged" ? (
        <p className="mt-3 text-sm text-ink-muted">
          Con los montos actuales, esta estrategia no converge en un tiempo razonable.
        </p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Tiempo total</p>
              <p className="mt-1 font-mono text-lg text-ink">{monthsLabel(result.totalMonths)}</p>
            </div>
            <div>
              <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Interés total</p>
              <p className="mt-1 font-mono text-lg text-ink">{currencyFormatter.format(result.totalInterestPaid)}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Orden de liquidación</p>
            <p className="mt-1 text-sm text-ink-muted">{result.payoffOrder.join(" → ")}</p>
          </div>
        </>
      )}
    </div>
  );
}

function ComparisonHighlight({
  avalanche,
  snowball,
}: {
  avalanche: DebtPayoffResult;
  snowball: DebtPayoffResult;
}) {
  if (avalanche.status !== "converged" || snowball.status !== "converged") return null;

  const interestDiff = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const monthsDiff = snowball.totalMonths - avalanche.totalMonths;

  const lines: string[] = [];
  if (Math.abs(interestDiff) >= 1) {
    lines.push(
      interestDiff > 0
        ? `La avalancha te ahorra ${currencyFormatter.format(interestDiff)} en intereses.`
        : `La bola de nieve te ahorra ${currencyFormatter.format(Math.abs(interestDiff))} en intereses.`,
    );
  }
  if (monthsDiff !== 0) {
    lines.push(
      monthsDiff > 0
        ? `La avalancha te libera ${monthsLabel(monthsDiff)} antes.`
        : `La bola de nieve te libera ${monthsLabel(Math.abs(monthsDiff))} antes.`,
    );
  }

  if (lines.length === 0) {
    return <p className="mt-4 text-sm text-ink-muted">Con tus montos actuales, ambas estrategias salen igual.</p>;
  }

  return (
    <p className="mt-4 text-sm text-ink">
      {lines.map((line, index) => (
        <span key={index} className="block">
          {line}
        </span>
      ))}
    </p>
  );
}

export function DebtStrategyComparison({ dragons }: { dragons: Dragon[] }) {
  if (dragons.length < 2) return null;

  const inputs = buildPayoffInputs(dragons);
  if (inputs.length < 2) {
    return (
      <div className="mt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Comparador de estrategias
        </h2>
        <p className="mt-4 text-sm text-ink-muted">
          Define tasa/pago mínimo o pago extra en al menos 2 deudas para comparar avalancha vs. bola de nieve.
        </p>
      </div>
    );
  }

  const avalanche = simulateDebtPayoff(inputs, "avalanche");
  const snowball = simulateDebtPayoff(inputs, "snowball");

  return (
    <div className="mt-8">
      <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
        Comparador de estrategias
      </h2>
      <p className="mt-1 text-xs text-ink-muted">
        Informativo — no cambia tu orden de ataque. Ese lo sigues controlando tú con las flechas de arriba.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StrategyCard
          icon={<GiCrossedSwords className="size-3.5 text-ki-warrior" aria-hidden="true" />}
          label="Avalancha"
          result={avalanche}
        />
        <StrategyCard
          icon={<GiSnowflake1 className="size-3.5 text-ki-saiyan2" aria-hidden="true" />}
          label="Bola de nieve"
          result={snowball}
        />
      </div>

      <ComparisonHighlight avalanche={avalanche} snowball={snowball} />
    </div>
  );
}
