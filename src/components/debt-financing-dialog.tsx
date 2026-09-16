"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Gauge, Loader2 } from "lucide-react";
import { GiPayMoney } from "react-icons/gi";
import { cn } from "cn";
import { updateDebtFinancing, type FinancingActionState } from "@/app/(app)/dragons/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardProgress, WizardStepHeader, WizardSummaryRow } from "@/components/wizard-controls";
import { projectDebt } from "@/lib/debt-projection";
import { computeFixedWeeklyTotals, deriveInstallmentsPaid, WEEKDAY_LABELS } from "@/lib/fixed-weekly-debt";
import { getInstitution, getReferenceRate, INSTITUTIONS } from "@/lib/institutions";
import { useAchievementToasts } from "@/hooks/use-achievement-toasts";

const initialState: FinancingActionState = {};

const CUSTOM_NO_INTEREST = "custom_none";
const CUSTOM_WITH_INTEREST = "custom_rate";
const FIXED_WEEKLY_ORIGIN = "fixed_weekly";

const STEP_LABELS = ["Origen", "Detalles", "Extra", "Confirmar"] as const;
const FIXED_WEEKLY_STEP_LABELS = ["Origen", "Montos", "Plazo", "Calendario", "Saldo hoy", "Confirmar"] as const;

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

function originLabel(originId: string) {
  if (originId === FIXED_WEEKLY_ORIGIN) return "Plazo fijo semanal";
  const institution = getInstitution(originId);
  if (institution) return institution.name;
  return originId === CUSTOM_NO_INTEREST ? "Personalizada sin interés" : "Personalizada con interés";
}

function initialOrigin(paymentSchedule: string | null, institution: string | null, interestRate: number | null) {
  if (paymentSchedule === "fixed_weekly") return FIXED_WEEKLY_ORIGIN;
  if (institution) return institution;
  return interestRate !== null ? CUSTOM_WITH_INTEREST : CUSTOM_NO_INTEREST;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full gap-2 bg-ki-awakening text-void hover:bg-ki-awakening/90"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Guardando...
        </>
      ) : (
        "Guardar financiamiento"
      )}
    </Button>
  );
}

function ExtraPaymentSimulator({
  pendingBalance,
  annualRate,
  minimumPayment,
  savedExtraPayment,
}: {
  pendingBalance: number;
  annualRate: number | null;
  minimumPayment: number | null;
  savedExtraPayment: number;
}) {
  const [simulatedExtra, setSimulatedExtra] = useState(savedExtraPayment);

  const current = useMemo(
    () => projectDebt({ pendingBalance, annualRate, minimumPayment, extraPayment: savedExtraPayment }),
    [pendingBalance, annualRate, minimumPayment, savedExtraPayment],
  );
  const simulated = useMemo(
    () => projectDebt({ pendingBalance, annualRate, minimumPayment, extraPayment: simulatedExtra }),
    [pendingBalance, annualRate, minimumPayment, simulatedExtra],
  );

  return (
    <div className="space-y-3 rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
        <Gauge className="size-3.5 text-ki-awakening" aria-hidden="true" />
        ¿Y si pago extra?
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-ink-muted">$0</span>
        <input
          type="range"
          aria-label="Simular pago extra mensual"
          min={0}
          max={Math.max(pendingBalance, savedExtraPayment * 4, 1000)}
          step={50}
          value={simulatedExtra}
          onChange={(event) => setSimulatedExtra(Number(event.target.value))}
          className="h-1.5 flex-1 accent-ki-awakening"
        />
        <span className="w-20 shrink-0 text-right font-mono text-sm text-ink">
          {currencyFormatter.format(simulatedExtra)}
        </span>
      </div>

      {simulated.status === "no_payment" && (
        <p className="text-sm text-ink-muted">Define un pago mínimo o extra para simular.</p>
      )}

      {simulated.status === "not_payable" && (
        <p className="text-sm text-ki-survival">
          Con ese pago la deuda no baja. Necesitas al menos {currencyFormatter.format(simulated.minimumExtraNeeded)}{" "}
          más al mes.
        </p>
      )}

      {simulated.status === "payable" && current.status === "payable" && (
        <p className="text-sm text-ink">
          Terminarías en <span className="font-mono text-ki-awakening">{simulated.months}</span> meses
          {simulated.months !== current.months && (
            <>
              {" "}
              (<span className="font-mono">{Math.abs(current.months - simulated.months)}</span>{" "}
              {simulated.months < current.months ? "menos" : "más"})
            </>
          )}{" "}
          y {simulated.totalInterest <= current.totalInterest ? "ahorrarías" : "pagarías"}{" "}
          <span className="font-mono">
            {currencyFormatter.format(Math.abs(current.totalInterest - simulated.totalInterest))}
          </span>{" "}
          {simulated.totalInterest <= current.totalInterest ? "en intereses" : "de intereses extra"}.
        </p>
      )}

      {simulated.status === "payable" && current.status !== "payable" && (
        <p className="text-sm text-ink">
          Terminarías en <span className="font-mono text-ki-awakening">{simulated.months}</span> meses con{" "}
          <span className="font-mono">{currencyFormatter.format(simulated.totalInterest)}</span> de intereses.
        </p>
      )}
    </div>
  );
}

function OriginStep({ value, onSelect }: { value: string; onSelect: (origin: string) => void }) {
  const rateInstitutions = INSTITUTIONS.filter((item) => item.kind === "rate");
  const fixedPlanInstitutions = INSTITUTIONS.filter((item) => item.kind === "fixed_plan");

  return (
    <div className="space-y-1.5">
      <Select value={value} onValueChange={(next) => onSelect(next ?? CUSTOM_NO_INTEREST)}>
        <SelectTrigger aria-label="Origen del financiamiento">
          <SelectValue placeholder="Selecciona el origen">{(value: string) => originLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Instituciones</SelectLabel>
            {rateInstitutions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Planes de pago fijo</SelectLabel>
            {fixedPlanInstitutions.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.name}
              </SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Plazo fijo</SelectLabel>
            <SelectItem value={FIXED_WEEKLY_ORIGIN}>Plazo fijo semanal (ej. Banco Azteca)</SelectItem>
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>Personalizada</SelectLabel>
            <SelectItem value={CUSTOM_NO_INTEREST}>Sin interés</SelectItem>
            <SelectItem value={CUSTOM_WITH_INTEREST}>Con interés</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function DetailsStep({
  isFixedPlan,
  isCustomNoInterest,
  rateValue,
  onRateChange,
  minimumPaymentValue,
  onMinimumPaymentChange,
  totalAmount,
  onTotalAmountChange,
  termMonths,
  onTermMonthsChange,
  onNext,
}: {
  isFixedPlan: boolean;
  isCustomNoInterest: boolean;
  rateValue: number | string;
  onRateChange: (next: string) => void;
  minimumPaymentValue: number | string;
  onMinimumPaymentChange: (next: string) => void;
  totalAmount: string;
  onTotalAmountChange: (next: string) => void;
  termMonths: string;
  onTermMonthsChange: (next: string) => void;
  onNext: () => void;
}) {
  const canContinue = isFixedPlan ? Number(totalAmount) > 0 && Number(termMonths) > 0 : true;

  return (
    <div className="space-y-4">
      {isFixedPlan ? (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="financing-total-amount"
              className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
            >
              Monto total a pagar
            </label>
            <Input
              id="financing-total-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              autoFocus
              value={totalAmount}
              onChange={(event) => onTotalAmountChange(event.target.value)}
              className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="financing-term-months"
              className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
            >
              Plazo en meses
            </label>
            <Input
              id="financing-term-months"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              value={termMonths}
              onChange={(event) => onTermMonthsChange(event.target.value)}
              className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <label
              htmlFor="financing-rate"
              className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
            >
              Tasa de interés anual (%)
            </label>
            <Input
              id="financing-rate"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              autoFocus
              disabled={isCustomNoInterest}
              value={isCustomNoInterest ? "" : rateValue}
              onChange={(event) => onRateChange(event.target.value)}
              placeholder={isCustomNoInterest ? "Sin interés" : ""}
              className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60 disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="financing-minimum-payment"
              className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
            >
              Pago mínimo mensual
            </label>
            <Input
              id="financing-minimum-payment"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={minimumPaymentValue}
              onChange={(event) => onMinimumPaymentChange(event.target.value)}
              placeholder="Sin definir"
              className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
            />
          </div>
        </>
      )}

      <Button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function FixedWeeklyAmountsStep({
  principalAmount,
  onPrincipalAmountChange,
  weeklyPayment,
  onWeeklyPaymentChange,
  onNext,
}: {
  principalAmount: string;
  onPrincipalAmountChange: (next: string) => void;
  weeklyPayment: string;
  onWeeklyPaymentChange: (next: string) => void;
  onNext: () => void;
}) {
  const canContinue = Number(principalAmount) > 0 && Number(weeklyPayment) > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="financing-principal" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          Monto de disposición
        </label>
        <Input
          id="financing-principal"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          autoFocus
          value={principalAmount}
          onChange={(event) => onPrincipalAmountChange(event.target.value)}
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="financing-weekly-payment" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          Pago fijo semanal
        </label>
        <Input
          id="financing-weekly-payment"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0.01"
          value={weeklyPayment}
          onChange={(event) => onWeeklyPaymentChange(event.target.value)}
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
      </div>

      <Button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function FixedWeeklyTermStep({
  totalInstallments,
  onTotalInstallmentsChange,
  installmentsPaid,
  onInstallmentsPaidChange,
  onNext,
}: {
  totalInstallments: string;
  onTotalInstallmentsChange: (next: string) => void;
  installmentsPaid: string;
  onInstallmentsPaidChange: (next: string) => void;
  onNext: () => void;
}) {
  const canContinue =
    Number(totalInstallments) > 0 &&
    Number(installmentsPaid || "0") >= 0 &&
    Number(installmentsPaid || "0") <= Number(totalInstallments);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label
            htmlFor="financing-total-installments"
            className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
          >
            Plazo (semanas)
          </label>
          <Input
            id="financing-total-installments"
            type="number"
            inputMode="numeric"
            step="1"
            min="1"
            autoFocus
            value={totalInstallments}
            onChange={(event) => onTotalInstallmentsChange(event.target.value)}
            className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="financing-installments-paid"
            className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
          >
            Semanas ya pagadas
          </label>
          <Input
            id="financing-installments-paid"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            value={installmentsPaid}
            onChange={(event) => onInstallmentsPaidChange(event.target.value)}
            className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
          />
        </div>
      </div>

      <Button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function FixedWeeklyScheduleStep({
  paymentDayOfWeek,
  onPaymentDayOfWeekChange,
  disbursementDate,
  onDisbursementDateChange,
  onNext,
}: {
  paymentDayOfWeek: number;
  onPaymentDayOfWeekChange: (next: number) => void;
  disbursementDate: string;
  onDisbursementDateChange: (next: string) => void;
  onNext: () => void;
}) {
  const canContinue = disbursementDate !== "";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Día de pago</label>
        <Select value={String(paymentDayOfWeek)} onValueChange={(next) => onPaymentDayOfWeekChange(Number(next))}>
          <SelectTrigger aria-label="Día de pago" className="h-11 w-full">
            <SelectValue>{(value: string) => WEEKDAY_LABELS[Number(value)]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WEEKDAY_LABELS.map((label, index) => (
              <SelectItem key={label} value={String(index)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="financing-disbursement-date"
          className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
        >
          Fecha de disposición
        </label>
        <Input
          id="financing-disbursement-date"
          type="date"
          value={disbursementDate}
          onChange={(event) => onDisbursementDateChange(event.target.value)}
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink"
        />
      </div>

      <Button
        type="button"
        disabled={!canContinue}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function FixedWeeklyPayoffTodayStep({
  payoffTodayAmount,
  onPayoffTodayAmountChange,
  onNext,
}: {
  payoffTodayAmount: string;
  onPayoffTodayAmountChange: (next: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="financing-payoff-today"
          className="font-mono text-[11px] tracking-widest text-ink-muted uppercase"
        >
          Saldo de liquidación hoy (opcional)
        </label>
        <Input
          id="financing-payoff-today"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoFocus
          value={payoffTodayAmount}
          onChange={(event) => onPayoffTodayAmountChange(event.target.value)}
          placeholder="Se puede capturar después"
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
        <p className="text-xs text-ink-muted">El dato que consultas manualmente en tu banco. Puedes dejarlo vacío y capturarlo después.</p>
      </div>

      <Button type="button" onClick={onNext} className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90">
        Siguiente
      </Button>
    </div>
  );
}

function FixedWeeklyReviewStep({
  principalAmount,
  weeklyPayment,
  totalInstallments,
  installmentsPaid,
  paymentDayOfWeek,
  disbursementDate,
  payoffTodayAmount,
  error,
  onEditStep,
}: {
  principalAmount: string;
  weeklyPayment: string;
  totalInstallments: string;
  installmentsPaid: string;
  paymentDayOfWeek: number;
  disbursementDate: string;
  payoffTodayAmount: string;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  const totals = computeFixedWeeklyTotals({
    principalAmount: Number(principalAmount || "0"),
    weeklyPayment: Number(weeklyPayment || "0"),
    totalInstallments: Number(totalInstallments || "0"),
    installmentsPaid: Number(installmentsPaid || "0"),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Origen" value="Plazo fijo semanal" onEdit={() => onEditStep(0)} />
        <WizardSummaryRow
          label="Disposición"
          value={currencyFormatter.format(Number(principalAmount || "0"))}
          onEdit={() => onEditStep(1)}
        />
        <WizardSummaryRow
          label="Pago semanal"
          value={currencyFormatter.format(Number(weeklyPayment || "0"))}
          onEdit={() => onEditStep(1)}
        />
        <WizardSummaryRow
          label="Progreso"
          value={`${installmentsPaid || "0"} de ${totalInstallments || "0"} pagos`}
          onEdit={() => onEditStep(2)}
        />
        <WizardSummaryRow label="Día de pago" value={WEEKDAY_LABELS[paymentDayOfWeek]} onEdit={() => onEditStep(3)} />
        <WizardSummaryRow label="Disposición el" value={disbursementDate || "Sin definir"} onEdit={() => onEditStep(3)} />
        <WizardSummaryRow
          label="Saldo hoy"
          value={payoffTodayAmount ? currencyFormatter.format(Number(payoffTodayAmount)) : "Sin definir"}
          onEdit={() => onEditStep(4)}
        />
        <WizardSummaryRow label="Interés total" value={currencyFormatter.format(totals.totalInterest)} onEdit={() => onEditStep(1)} />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SaveButton />
    </div>
  );
}

function ExtraPaymentStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <AmountKeypad value={value} onChange={onChange} autoFocus ariaLabel="Pago extra mensual" />
      <Button type="button" onClick={onNext} className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90">
        Siguiente
      </Button>
    </div>
  );
}

function ReviewStep({
  origin,
  isFixedPlan,
  rateValue,
  minimumPaymentValue,
  totalAmount,
  termMonths,
  extraPayment,
  error,
  onEditStep,
}: {
  origin: string;
  isFixedPlan: boolean;
  rateValue: number | string;
  minimumPaymentValue: number | string;
  totalAmount: string;
  termMonths: string;
  extraPayment: number;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Origen" value={originLabel(origin)} onEdit={() => onEditStep(0)} />
        {isFixedPlan ? (
          <>
            <WizardSummaryRow
              label="Monto total"
              value={currencyFormatter.format(Number(totalAmount || "0"))}
              onEdit={() => onEditStep(1)}
            />
            <WizardSummaryRow label="Plazo" value={`${termMonths || "0"} meses`} onEdit={() => onEditStep(1)} />
          </>
        ) : (
          <>
            <WizardSummaryRow
              label="Tasa anual"
              value={rateValue === "" ? "Sin interés" : `${rateValue}%`}
              onEdit={() => onEditStep(1)}
            />
            <WizardSummaryRow
              label="Pago mínimo"
              value={minimumPaymentValue === "" ? "Sin definir" : currencyFormatter.format(Number(minimumPaymentValue))}
              onEdit={() => onEditStep(1)}
            />
          </>
        )}
        <WizardSummaryRow label="Pago extra" value={currencyFormatter.format(extraPayment)} onEdit={() => onEditStep(2)} />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SaveButton />
    </div>
  );
}

function DebtFinancingWizard({
  dragonId,
  institution,
  interestRate,
  minimumPayment,
  extraPayment,
  paymentSchedule,
  currentAmount,
  principalAmount: savedPrincipalAmount,
  weeklyPayment: savedWeeklyPayment,
  totalInstallments: savedTotalInstallments,
  paymentDayOfWeek: savedPaymentDayOfWeek,
  disbursementDate: savedDisbursementDate,
  payoffTodayAmount: savedPayoffTodayAmount,
  onSuccess,
}: {
  dragonId: string;
  institution: string | null;
  interestRate: number | null;
  minimumPayment: number | null;
  extraPayment: number;
  paymentSchedule: string | null;
  currentAmount: number;
  principalAmount: number | null;
  weeklyPayment: number | null;
  totalInstallments: number | null;
  paymentDayOfWeek: number | null;
  disbursementDate: string | null;
  payoffTodayAmount: number | null;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(updateDebtFinancing, initialState);
  useAchievementToasts(state.achievements);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  const [origin, setOrigin] = useState(() => initialOrigin(paymentSchedule, institution, interestRate));
  const [rateValue, setRateValue] = useState<number | string>(() => interestRate ?? getReferenceRate(institution) ?? "");
  const [minimumPaymentValue, setMinimumPaymentValue] = useState<number | string>(minimumPayment ?? "");
  const [totalAmount, setTotalAmount] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [extraPaymentValue, setExtraPaymentValue] = useState(extraPayment ? String(extraPayment) : "");

  const [principalAmount, setPrincipalAmount] = useState(savedPrincipalAmount ? String(savedPrincipalAmount) : "");
  const [weeklyPayment, setWeeklyPayment] = useState(savedWeeklyPayment ? String(savedWeeklyPayment) : "");
  const [totalInstallments, setTotalInstallments] = useState(
    savedTotalInstallments ? String(savedTotalInstallments) : "",
  );
  const [installmentsPaid, setInstallmentsPaid] = useState(() =>
    savedWeeklyPayment ? String(deriveInstallmentsPaid(currentAmount, savedWeeklyPayment)) : "",
  );
  const [paymentDayOfWeek, setPaymentDayOfWeek] = useState(savedPaymentDayOfWeek ?? 1);
  const [disbursementDate, setDisbursementDate] = useState(savedDisbursementDate ?? "");
  const [payoffTodayAmount, setPayoffTodayAmount] = useState(
    savedPayoffTodayAmount !== null ? String(savedPayoffTodayAmount) : "",
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  const originInstitution = getInstitution(origin);
  const isFixedPlan = originInstitution?.kind === "fixed_plan";
  const isCustomNoInterest = origin === CUSTOM_NO_INTEREST;
  const isFixedWeeklyOrigin = origin === FIXED_WEEKLY_ORIGIN;
  const stepLabels = isFixedWeeklyOrigin ? FIXED_WEEKLY_STEP_LABELS : STEP_LABELS;

  function handleOriginSelect(next: string) {
    setOrigin(next);
    const nextInstitution = getInstitution(next);
    if (nextInstitution?.kind === "rate") setRateValue(nextInstitution.referenceRate);
    if (next === CUSTOM_NO_INTEREST) setRateValue("");
    goTo(1);
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="dragon_id" value={dragonId} />
      <input type="hidden" name="schedule_mode" value={isFixedWeeklyOrigin ? "fixed_weekly" : ""} />
      {isFixedWeeklyOrigin ? (
        <>
          <input type="hidden" name="principal_amount" value={principalAmount} />
          <input type="hidden" name="weekly_payment" value={weeklyPayment} />
          <input type="hidden" name="total_installments" value={totalInstallments} />
          <input type="hidden" name="installments_paid" value={installmentsPaid} />
          <input type="hidden" name="payment_day_of_week" value={paymentDayOfWeek} />
          <input type="hidden" name="disbursement_date" value={disbursementDate} />
          <input type="hidden" name="payoff_today_amount" value={payoffTodayAmount} />
        </>
      ) : (
        <>
          <input type="hidden" name="institution" value={originInstitution?.id ?? ""} />
          <input type="hidden" name="interest_rate" value={isCustomNoInterest ? "" : rateValue} />
          <input type="hidden" name="minimum_payment" value={minimumPaymentValue} />
          <input type="hidden" name="total_amount" value={totalAmount} />
          <input type="hidden" name="term_months" value={termMonths} />
          <input type="hidden" name="extra_payment" value={Number(extraPaymentValue || "0").toFixed(2)} />
        </>
      )}

      <WizardProgress steps={stepLabels} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={stepLabels[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && <OriginStep value={origin} onSelect={handleOriginSelect} />}
        {isFixedWeeklyOrigin && step === 1 && (
          <FixedWeeklyAmountsStep
            principalAmount={principalAmount}
            onPrincipalAmountChange={setPrincipalAmount}
            weeklyPayment={weeklyPayment}
            onWeeklyPaymentChange={setWeeklyPayment}
            onNext={() => goTo(2)}
          />
        )}
        {isFixedWeeklyOrigin && step === 2 && (
          <FixedWeeklyTermStep
            totalInstallments={totalInstallments}
            onTotalInstallmentsChange={setTotalInstallments}
            installmentsPaid={installmentsPaid}
            onInstallmentsPaidChange={setInstallmentsPaid}
            onNext={() => goTo(3)}
          />
        )}
        {isFixedWeeklyOrigin && step === 3 && (
          <FixedWeeklyScheduleStep
            paymentDayOfWeek={paymentDayOfWeek}
            onPaymentDayOfWeekChange={setPaymentDayOfWeek}
            disbursementDate={disbursementDate}
            onDisbursementDateChange={setDisbursementDate}
            onNext={() => goTo(4)}
          />
        )}
        {isFixedWeeklyOrigin && step === 4 && (
          <FixedWeeklyPayoffTodayStep
            payoffTodayAmount={payoffTodayAmount}
            onPayoffTodayAmountChange={setPayoffTodayAmount}
            onNext={() => goTo(5)}
          />
        )}
        {isFixedWeeklyOrigin && step === 5 && (
          <FixedWeeklyReviewStep
            principalAmount={principalAmount}
            weeklyPayment={weeklyPayment}
            totalInstallments={totalInstallments}
            installmentsPaid={installmentsPaid}
            paymentDayOfWeek={paymentDayOfWeek}
            disbursementDate={disbursementDate}
            payoffTodayAmount={payoffTodayAmount}
            error={state.error}
            onEditStep={goTo}
          />
        )}
        {step === 1 && !isFixedWeeklyOrigin && (
          <DetailsStep
            isFixedPlan={isFixedPlan}
            isCustomNoInterest={isCustomNoInterest}
            rateValue={rateValue}
            onRateChange={setRateValue}
            minimumPaymentValue={minimumPaymentValue}
            onMinimumPaymentChange={setMinimumPaymentValue}
            totalAmount={totalAmount}
            onTotalAmountChange={setTotalAmount}
            termMonths={termMonths}
            onTermMonthsChange={setTermMonths}
            onNext={() => goTo(2)}
          />
        )}
        {step === 2 && !isFixedWeeklyOrigin && (
          <ExtraPaymentStep value={extraPaymentValue} onChange={setExtraPaymentValue} onNext={() => goTo(3)} />
        )}
        {step === 3 && !isFixedWeeklyOrigin && (
          <ReviewStep
            origin={origin}
            isFixedPlan={isFixedPlan}
            rateValue={rateValue}
            minimumPaymentValue={minimumPaymentValue}
            totalAmount={totalAmount}
            termMonths={termMonths}
            extraPayment={Number(extraPaymentValue || "0")}
            error={state.error}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function DebtFinancingDialog({
  dragonId,
  dragonName,
  pendingBalance,
  currentAmount,
  institution,
  interestRate,
  minimumPayment,
  extraPayment,
  paymentSchedule,
  principalAmount,
  weeklyPayment,
  totalInstallments,
  paymentDayOfWeek,
  disbursementDate,
  payoffTodayAmount,
}: {
  dragonId: string;
  dragonName: string;
  pendingBalance: number;
  currentAmount: number;
  institution: string | null;
  interestRate: number | null;
  minimumPayment: number | null;
  extraPayment: number;
  paymentSchedule: string | null;
  principalAmount: number | null;
  weeklyPayment: number | null;
  totalInstallments: number | null;
  paymentDayOfWeek: number | null;
  disbursementDate: string | null;
  payoffTodayAmount: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "rounded-lg border border-ink-muted/15 bg-void/40 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
            )}
          />
        }
      >
        Detalles de financiamiento
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <GiPayMoney className="size-3.5 text-ki-awakening" aria-hidden="true" />
            Financiamiento
          </div>
          <DialogTitle>{dragonName}</DialogTitle>
        </DialogHeader>

        {open && (
          <DebtFinancingWizard
            dragonId={dragonId}
            institution={institution}
            interestRate={interestRate}
            minimumPayment={minimumPayment}
            extraPayment={extraPayment}
            paymentSchedule={paymentSchedule}
            currentAmount={currentAmount}
            principalAmount={principalAmount}
            weeklyPayment={weeklyPayment}
            totalInstallments={totalInstallments}
            paymentDayOfWeek={paymentDayOfWeek}
            disbursementDate={disbursementDate}
            payoffTodayAmount={payoffTodayAmount}
            onSuccess={() => setOpen(false)}
          />
        )}

        {paymentSchedule !== "fixed_weekly" && (
          <ExtraPaymentSimulator
            pendingBalance={pendingBalance}
            annualRate={interestRate}
            minimumPayment={minimumPayment}
            savedExtraPayment={extraPayment}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
