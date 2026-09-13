import { CircleCheck, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { AttackOrderControls } from "@/components/attack-order-controls";
import { ContributeDragonDialog } from "@/components/contribute-dragon-dialog";
import { CreateDragonDialog } from "@/components/create-dragon-dialog";
import { DebtFinancingDialog } from "@/components/debt-financing-dialog";
import { DeleteDragonDialog } from "@/components/delete-dragon-dialog";
import { DragonMotif } from "@/components/dragon-motif";
import { SphereOrb } from "@/components/sphere-orb";
import { DRAGON_ACCENT_STYLES, getDragonAccent } from "@/lib/dragon-accent";
import { projectDebt } from "@/lib/debt-projection";
import type { AttackOrderInfo } from "@/lib/dragon-priority";
import { getInstitution } from "@/lib/institutions";
import { formatRelativeDays } from "@/lib/relative-time";
import { getSphereProgress } from "@/lib/spheres";

export type Dragon = {
  id: string;
  name: string;
  type: "savings" | "debt";
  target_amount: number;
  current_amount: number;
  status: "active" | "completed";
  institution: string | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  extra_payment: number;
  priority: number | null;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function DebtProjectionSummary({ dragon }: { dragon: Dragon }) {
  const pendingBalance = dragon.target_amount - dragon.current_amount;
  const projection = projectDebt({
    pendingBalance,
    annualRate: dragon.interest_rate,
    minimumPayment: dragon.minimum_payment,
    extraPayment: dragon.extra_payment,
  });

  if (projection.status === "no_payment") {
    return <p className="mt-2 text-xs text-ink-muted">Define un pago para proyectar cuándo la liquidas.</p>;
  }

  if (projection.status === "not_payable") {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ki-survival">
        <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
        Con tu pago actual, esta deuda no baja. Necesitas pagar al menos{" "}
        {currencyFormatter.format(projection.minimumExtraNeeded)} más al mes.
      </p>
    );
  }

  return (
    <p className="mt-2 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
      Te faltan <span className="text-ink">{projection.months}</span> meses · Intereses proyectados{" "}
      <span className="text-ink">{currencyFormatter.format(projection.totalInterest)}</span>
    </p>
  );
}

export function DragonCard({
  dragon,
  attackOrder,
  lastContributionAt,
}: {
  dragon: Dragon;
  attackOrder?: AttackOrderInfo | null;
  lastContributionAt?: string | null;
}) {
  const progressRatio = dragon.current_amount / dragon.target_amount;
  const completed = dragon.status === "completed";
  const remaining = dragon.target_amount - dragon.current_amount;
  const institution = getInstitution(dragon.institution);
  const spheres = getSphereProgress(dragon.current_amount, dragon.target_amount);
  const accent = DRAGON_ACCENT_STYLES[getDragonAccent(dragon)];

  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1", accent.bar)} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <DragonMotif size={36} color={accent.colorVar} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
              {dragon.type === "savings" ? "Ahorro" : "Deuda"}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{dragon.name}</p>
            {institution && <p className="text-xs text-ink-muted">{institution.name}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {completed && <CircleCheck className={cn("size-5", accent.text)} aria-hidden="true" />}
          <CreateDragonDialog
            mode="edit"
            dragon={{ id: dragon.id, type: dragon.type, name: dragon.name, target_amount: dragon.target_amount }}
          />
          <DeleteDragonDialog dragonId={dragon.id} dragonName={dragon.name} />
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
          <div
            className={cn("h-full rounded-full transition-all", accent.bar)}
            style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          <span>
            <span className="text-ink">{currencyFormatter.format(dragon.current_amount)}</span>{" "}
            / {currencyFormatter.format(dragon.target_amount)}
          </span>
          <span>{Math.min(Math.round(progressRatio * 100), 100)}%</span>
        </div>
        <p className="mt-1.5 text-xs text-ink-muted">
          {lastContributionAt ? `Último abono: ${formatRelativeDays(lastContributionAt)}` : "Sin abonos registrados"}
        </p>
        {dragon.type === "debt" && !completed && (
          <p className="mt-1.5 text-xs text-ink-muted">Saldo pendiente {currencyFormatter.format(remaining)}</p>
        )}
        {dragon.type === "debt" && !completed && <DebtProjectionSummary dragon={dragon} />}
        {dragon.type === "debt" && !completed && attackOrder && (
          <AttackOrderControls dragonId={dragon.id} order={attackOrder} />
        )}
      </div>

      <div className="mt-3 flex items-center gap-1">
        {spheres.map((sphereCompleted, index) => (
          <SphereOrb key={index} index={index + 1} completed={sphereCompleted} size={18} color={accent.colorVar} />
        ))}
      </div>

      {!completed && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <ContributeDragonDialog dragonId={dragon.id} dragonName={dragon.name} type={dragon.type} />
          {dragon.type === "debt" && (
            <DebtFinancingDialog
              dragonId={dragon.id}
              dragonName={dragon.name}
              pendingBalance={remaining}
              institution={dragon.institution}
              interestRate={dragon.interest_rate}
              minimumPayment={dragon.minimum_payment}
              extraPayment={dragon.extra_payment}
            />
          )}
        </div>
      )}
    </div>
  );
}
