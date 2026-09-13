"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus } from "lucide-react";
import { GiDragonHead, GiHandcuffs, GiPiggyBank } from "react-icons/gi";
import { cn } from "cn";
import {
  createDragon,
  updateDragon,
  type CreateDragonActionState,
  type UpdateDragonActionState,
} from "@/app/(app)/dragons/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WizardProgress, WizardStepHeader, WizardSummaryRow } from "@/components/wizard-controls";

const initialState: CreateDragonActionState = {};
const initialEditState: UpdateDragonActionState = {};

type DragonType = "savings" | "debt";

export type EditableDragon = {
  id: string;
  type: DragonType;
  name: string;
  target_amount: number;
};

const STEP_LABELS = ["Tipo", "Nombre", "Meta", "Inicial", "Confirmar"] as const;
const EDIT_STEP_LABELS = ["Nombre", "Meta", "Confirmar"] as const;

const summaryCurrencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function SubmitButton({ label }: { label: string }) {
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
        label
      )}
    </Button>
  );
}

function TypeStep({ value, onSelect }: { value: DragonType; onSelect: (type: DragonType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect("savings")}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
          value === "savings" && "border-ki-awakening/60 bg-ki-awakening/10",
        )}
      >
        <GiPiggyBank className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Ahorro</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("debt")}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
          value === "debt" && "border-ki-awakening/60 bg-ki-awakening/10",
        )}
      >
        <GiHandcuffs className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Deuda</span>
      </button>
    </div>
  );
}

function NameStep({
  type,
  value,
  onChange,
  onNext,
}: {
  type: DragonType;
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <Input
        autoFocus
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={type === "savings" ? "Ej. Fondo de emergencia" : "Ej. Tarjeta de crédito"}
        className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
      />
      <Button
        type="button"
        disabled={value.trim().length === 0}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function TargetAmountStep({
  type,
  value,
  onChange,
  onNext,
}: {
  type: DragonType;
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}) {
  const amount = Number(value || "0");
  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-ink-muted">
        {type === "savings" ? "Meta a alcanzar" : "Saldo original de la deuda"}
      </p>
      <AmountKeypad value={value} onChange={onChange} autoFocus />
      <Button
        type="button"
        disabled={amount <= 0}
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90 disabled:opacity-30"
      >
        Siguiente
      </Button>
    </div>
  );
}

function InitialAmountStep({
  type,
  value,
  onChange,
  onNext,
}: {
  type: DragonType;
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-center text-xs text-ink-muted">
        {type === "savings" ? "Monto inicial (opcional)" : "Ya pagado hasta ahora (opcional)"}
      </p>
      <AmountKeypad value={value} onChange={onChange} autoFocus />
      <Button
        type="button"
        onClick={onNext}
        className="h-11 w-full bg-ki-awakening text-void hover:bg-ki-awakening/90"
      >
        Siguiente
      </Button>
    </div>
  );
}

function ReviewStep({
  type,
  name,
  targetAmount,
  initialAmount,
  error,
  onEditStep,
}: {
  type: DragonType;
  name: string;
  targetAmount: number;
  initialAmount: number;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Tipo" value={type === "savings" ? "Ahorro" : "Deuda"} onEdit={() => onEditStep(0)} />
        <WizardSummaryRow label="Nombre" value={name} onEdit={() => onEditStep(1)} />
        <WizardSummaryRow
          label="Meta"
          value={summaryCurrencyFormatter.format(targetAmount)}
          onEdit={() => onEditStep(2)}
        />
        <WizardSummaryRow
          label="Inicial"
          value={summaryCurrencyFormatter.format(initialAmount)}
          onEdit={() => onEditStep(3)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SubmitButton label="Invocar Dragón" />
    </div>
  );
}

function CreateDragonWizard({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(createDragon, initialState);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [type, setType] = useState<DragonType>("savings");
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [initialAmount, setInitialAmount] = useState("");

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="target_amount" value={Number(targetAmount || "0").toFixed(2)} />
      <input type="hidden" name="initial_amount" value={Number(initialAmount || "0").toFixed(2)} />

      <WizardProgress steps={STEP_LABELS} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={STEP_LABELS[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && (
          <TypeStep
            value={type}
            onSelect={(selected) => {
              setType(selected);
              goTo(1);
            }}
          />
        )}
        {step === 1 && <NameStep type={type} value={name} onChange={setName} onNext={() => goTo(2)} />}
        {step === 2 && (
          <TargetAmountStep type={type} value={targetAmount} onChange={setTargetAmount} onNext={() => goTo(3)} />
        )}
        {step === 3 && (
          <InitialAmountStep type={type} value={initialAmount} onChange={setInitialAmount} onNext={() => goTo(4)} />
        )}
        {step === 4 && (
          <ReviewStep
            type={type}
            name={name}
            targetAmount={Number(targetAmount || "0")}
            initialAmount={Number(initialAmount || "0")}
            error={state.error}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

function EditReviewStep({
  name,
  targetAmount,
  error,
  onEditStep,
}: {
  name: string;
  targetAmount: number;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Nombre" value={name} onEdit={() => onEditStep(0)} />
        <WizardSummaryRow
          label="Meta"
          value={summaryCurrencyFormatter.format(targetAmount)}
          onEdit={() => onEditStep(1)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SubmitButton label="Guardar cambios" />
    </div>
  );
}

function EditDragonWizard({ dragon, onSuccess }: { dragon: EditableDragon; onSuccess: () => void }) {
  const [state, formAction] = useActionState(updateDragon, initialEditState);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [name, setName] = useState(dragon.name);
  const [targetAmount, setTargetAmount] = useState(String(dragon.target_amount));

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={dragon.id} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="target_amount" value={Number(targetAmount || "0").toFixed(2)} />

      <WizardProgress steps={EDIT_STEP_LABELS} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={EDIT_STEP_LABELS[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && <NameStep type={dragon.type} value={name} onChange={setName} onNext={() => goTo(1)} />}
        {step === 1 && (
          <TargetAmountStep type={dragon.type} value={targetAmount} onChange={setTargetAmount} onNext={() => goTo(2)} />
        )}
        {step === 2 && (
          <EditReviewStep
            name={name}
            targetAmount={Number(targetAmount || "0")}
            error={state.error}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function CreateDragonDialog({
  variant = "fab",
  mode = "create",
  dragon,
}: {
  variant?: "fab" | "inline";
  mode?: "create" | "edit";
  dragon?: EditableDragon;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit" && !!dragon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label="Editar Dragón"
              className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
            />
          }
        >
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : variant === "fab" ? (
        <DialogTrigger
          render={
            <button
              aria-label="Invocar Dragón"
              className="fixed right-6 bottom-6 z-40 flex size-14 items-center justify-center rounded-full bg-ki-awakening text-void shadow-lg transition-transform hover:scale-105 active:scale-95"
            />
          }
        >
          <Plus className="size-6" />
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <button className="inline-flex h-11 items-center gap-2 rounded-lg bg-ki-awakening px-5 text-sm font-medium text-void transition-colors hover:bg-ki-awakening/90" />
          }
        >
          <Plus className="size-4" />
          Invocar tu primer Dragón
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <GiDragonHead className="size-3.5 text-ki-awakening" aria-hidden="true" />
            {isEdit ? "Editar" : "Nueva meta"}
          </div>
          <DialogTitle>{isEdit ? "Editar Dragón" : "Invocar Dragón"}</DialogTitle>
        </DialogHeader>
        {open &&
          (isEdit ? (
            <EditDragonWizard dragon={dragon} onSuccess={() => setOpen(false)} />
          ) : (
            <CreateDragonWizard onSuccess={() => setOpen(false)} />
          ))}
      </DialogContent>
    </Dialog>
  );
}
