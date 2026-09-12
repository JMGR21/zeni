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
import { getInstitution, getReferenceRate, INSTITUTIONS } from "@/lib/institutions";

const initialState: FinancingActionState = {};

const CUSTOM_NO_INTEREST = "custom_none";
const CUSTOM_WITH_INTEREST = "custom_rate";

const STEP_LABELS = ["Origen", "Detalles", "Extra", "Confirmar"] as const;

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function originLabel(originId: string) {
  const institution = getInstitution(originId);
  if (institution) return institution.name;
  return originId === CUSTOM_NO_INTEREST ? "Personalizada sin interés" : "Personalizada con interés";
}

function initialOrigin(institution: string | null, interestRate: number | null) {
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
        <SelectTrigger>
          <SelectValue placeholder="Selecciona el origen" />
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
            <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
              Monto total a pagar
            </label>
            <Input
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
            <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Plazo en meses</label>
            <Input
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
            <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
              Tasa de interés anual (%)
            </label>
            <Input
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
            <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
              Pago mínimo mensual
            </label>
            <Input
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
      <AmountKeypad value={value} onChange={onChange} autoFocus />
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
  onSuccess,
}: {
  dragonId: string;
  institution: string | null;
  interestRate: number | null;
  minimumPayment: number | null;
  extraPayment: number;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(updateDebtFinancing, initialState);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);

  const [origin, setOrigin] = useState(() => initialOrigin(institution, interestRate));
  const [rateValue, setRateValue] = useState<number | string>(() => interestRate ?? getReferenceRate(institution) ?? "");
  const [minimumPaymentValue, setMinimumPaymentValue] = useState<number | string>(minimumPayment ?? "");
  const [totalAmount, setTotalAmount] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [extraPaymentValue, setExtraPaymentValue] = useState(extraPayment ? String(extraPayment) : "");

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
      <input type="hidden" name="institution" value={originInstitution?.id ?? ""} />
      <input type="hidden" name="interest_rate" value={isCustomNoInterest ? "" : rateValue} />
      <input type="hidden" name="minimum_payment" value={minimumPaymentValue} />
      <input type="hidden" name="total_amount" value={totalAmount} />
      <input type="hidden" name="term_months" value={termMonths} />
      <input type="hidden" name="extra_payment" value={Number(extraPaymentValue || "0").toFixed(2)} />

      <WizardProgress steps={STEP_LABELS} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={STEP_LABELS[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && <OriginStep value={origin} onSelect={handleOriginSelect} />}
        {step === 1 && (
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
        {step === 2 && (
          <ExtraPaymentStep value={extraPaymentValue} onChange={setExtraPaymentValue} onNext={() => goTo(3)} />
        )}
        {step === 3 && (
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
  institution,
  interestRate,
  minimumPayment,
  extraPayment,
}: {
  dragonId: string;
  dragonName: string;
  pendingBalance: number;
  institution: string | null;
  interestRate: number | null;
  minimumPayment: number | null;
  extraPayment: number;
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
            onSuccess={() => setOpen(false)}
          />
        )}

        <ExtraPaymentSimulator
          pendingBalance={pendingBalance}
          annualRate={interestRate}
          minimumPayment={minimumPayment}
          savedExtraPayment={extraPayment}
        />
      </DialogContent>
    </Dialog>
  );
}
