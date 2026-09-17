"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";
import {
  createRecurringTransaction,
  updateRecurringTransaction,
  type RecurringActionState,
} from "@/app/(app)/recurring/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  WizardProgress,
  WizardStepHeader,
  WizardSummaryRow,
} from "@/components/wizard-controls";

export type RecurringCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type EditableRecurring = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  frequency: "weekly" | "biweekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  auto_apply: boolean;
};

type RecurringType = "income" | "expense";
type Frequency = "weekly" | "biweekly" | "monthly";

const STEP_LABELS = [
  "Tipo",
  "Nombre",
  "Monto",
  "Categoría",
  "Frecuencia",
  "Automatización",
  "Confirmar",
] as const;

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

const initialState: RecurringActionState = {};

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

function TypeStep({
  value,
  onSelect,
}: {
  value: RecurringType | null;
  onSelect: (type: RecurringType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect("income")}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
          value === "income" && "border-ki-awakening/60 bg-ki-awakening/10",
        )}
      >
        <TrendingUp className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Ingreso</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("expense")}
        className={cn(
          "flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
          value === "expense" && "border-ki-awakening/60 bg-ki-awakening/10",
        )}
      >
        <TrendingDown className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Gasto</span>
      </button>
    </div>
  );
}

function NameStep({
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
      <Input
        autoFocus
        aria-label="Nombre del movimiento recurrente"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ej. Renta, Nómina, Netflix"
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

function AmountStep({
  value,
  onChange,
  onNext,
}: {
  value: string;
  onChange: (next: string) => void;
  onNext: () => void;
}) {
  const amount = Number(value || "0");
  return (
    <div className="space-y-4">
      <AmountKeypad
        value={value}
        onChange={onChange}
        autoFocus
        ariaLabel="Monto del movimiento recurrente"
      />
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

function CategoryStep({
  categories,
  onSelect,
}: {
  categories: RecurringCategory[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className="rounded-lg border border-ink-muted/15 bg-void/40 py-3 text-sm text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5"
        >
          {category.name}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onSelect("")}
        className="col-span-2 rounded-lg border border-dashed border-ink-muted/20 py-3 text-sm text-ink-muted transition-colors hover:border-ink-muted/40 hover:text-ink"
      >
        Sin categoría
      </button>
    </div>
  );
}

function FrequencyStep({
  frequency,
  dayOfWeek,
  dayOfMonth,
  onFrequencyChange,
  onDayOfWeekChange,
  onDayOfMonthChange,
  onNext,
}: {
  frequency: Frequency;
  dayOfWeek: number;
  dayOfMonth: number;
  onFrequencyChange: (next: Frequency) => void;
  onDayOfWeekChange: (next: number) => void;
  onDayOfMonthChange: (next: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onFrequencyChange(option)}
            className={cn(
              "rounded-lg border border-ink-muted/15 bg-void/40 py-2.5 text-sm text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
              frequency === option &&
                "border-ki-awakening/60 bg-ki-awakening/10",
            )}
          >
            {FREQUENCY_LABELS[option]}
          </button>
        ))}
      </div>

      {frequency === "weekly" && (
        <div className="space-y-1.5">
          <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Día de la semana
          </label>
          <Select
            value={String(dayOfWeek)}
            onValueChange={(next) => onDayOfWeekChange(Number(next))}
          >
            <SelectTrigger
              aria-label="Día de la semana"
              className="h-10 w-full"
            >
              <SelectValue>
                {(value: string) => WEEKDAY_LABELS[Number(value)]}
              </SelectValue>
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
      )}

      {frequency === "monthly" && (
        <div className="space-y-1.5">
          <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Día del mes
          </label>
          <Input
            type="number"
            min={1}
            max={31}
            aria-label="Día del mes"
            value={dayOfMonth}
            onChange={(event) => onDayOfMonthChange(Number(event.target.value))}
            className="h-10 border-ink-muted/15 bg-void/40 text-sm text-ink"
          />
          <p className="text-xs text-ink-muted">
            Si el mes no tiene ese día, se usa el último día del mes.
          </p>
        </div>
      )}

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

function AutomationStep({
  autoApply,
  onChange,
  onNext,
}: {
  autoApply: boolean;
  onChange: (next: boolean) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-ink">
            Registro automático
          </span>
          <Switch
            checked={autoApply}
            onCheckedChange={onChange}
            aria-label="Registro automático"
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          {autoApply
            ? "Activo: se registrará solo cuando llegue su fecha, siempre que haya fondos suficientes."
            : "Inactivo: cada ocurrencia quedará pendiente de tu aprobación."}
        </p>
      </div>
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
  amount,
  categoryName,
  frequency,
  dayOfWeek,
  dayOfMonth,
  autoApply,
  error,
  submitLabel,
  onEditStep,
}: {
  type: RecurringType;
  name: string;
  amount: number;
  categoryName: string;
  frequency: Frequency;
  dayOfWeek: number;
  dayOfMonth: number;
  autoApply: boolean;
  error?: string;
  submitLabel: string;
  onEditStep: (step: number) => void;
}) {
  const frequencyDetail =
    frequency === "weekly"
      ? `${FREQUENCY_LABELS.weekly} · ${WEEKDAY_LABELS[dayOfWeek]}`
      : frequency === "monthly"
        ? `${FREQUENCY_LABELS.monthly} · Día ${dayOfMonth}`
        : FREQUENCY_LABELS.biweekly;

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow
          label="Tipo"
          value={type === "income" ? "Ingreso" : "Gasto"}
          onEdit={() => onEditStep(0)}
        />
        <WizardSummaryRow
          label="Nombre"
          value={name}
          onEdit={() => onEditStep(1)}
        />
        <WizardSummaryRow
          label="Monto"
          value={summaryCurrencyFormatter.format(amount)}
          onEdit={() => onEditStep(2)}
        />
        <WizardSummaryRow
          label="Categoría"
          value={categoryName}
          onEdit={() => onEditStep(3)}
        />
        <WizardSummaryRow
          label="Frecuencia"
          value={frequencyDetail}
          onEdit={() => onEditStep(4)}
        />
        <WizardSummaryRow
          label="Automatización"
          value={autoApply ? "Automático" : "Manual"}
          onEdit={() => onEditStep(5)}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SubmitButton label={submitLabel} />
    </div>
  );
}

function RecurringWizard({
  categories,
  onSuccess,
  mode = "create",
  recurring,
}: {
  categories: RecurringCategory[];
  onSuccess: () => void;
  mode?: "create" | "edit";
  recurring?: EditableRecurring;
}) {
  const isEdit = mode === "edit" && !!recurring;
  const [state, formAction] = useActionState(
    isEdit ? updateRecurringTransaction : createRecurringTransaction,
    initialState,
  );
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [type, setType] = useState<RecurringType | null>(
    recurring?.type ?? null,
  );
  const [name, setName] = useState(recurring?.name ?? "");
  const [amount, setAmount] = useState(
    recurring ? String(recurring.amount) : "",
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    recurring?.category_id ?? null,
  );
  const [frequency, setFrequency] = useState<Frequency>(
    recurring?.frequency ?? "monthly",
  );
  const [dayOfWeek, setDayOfWeek] = useState(
    recurring?.day_of_week ?? new Date().getDay(),
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    recurring?.day_of_month ?? new Date().getDate(),
  );
  const [autoApply, setAutoApply] = useState(recurring?.auto_apply ?? false);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  const filteredCategories = categories.filter(
    (category) => category.type === type,
  );
  const selectedCategory = categories.find(
    (category) => category.id === categoryId,
  );

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={recurring.id} />}
      <input type="hidden" name="type" value={type ?? ""} />
      <input type="hidden" name="name" value={name} />
      <input
        type="hidden"
        name="amount"
        value={Number(amount || "0").toFixed(2)}
      />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="frequency" value={frequency} />
      <input
        type="hidden"
        name="day_of_week"
        value={frequency === "weekly" ? dayOfWeek : ""}
      />
      <input
        type="hidden"
        name="day_of_month"
        value={frequency === "monthly" ? dayOfMonth : ""}
      />
      <input type="hidden" name="auto_apply" value={autoApply ? "on" : ""} />

      <WizardProgress
        steps={STEP_LABELS}
        step={step}
        maxReached={maxReached}
        onJump={goTo}
      />

      <WizardStepHeader
        label={STEP_LABELS[step]}
        step={step}
        onBack={() => goTo(step - 1)}
      />

      <div
        key={step}
        className="animate-in fade-in-0 slide-in-from-right-2 duration-200"
      >
        {step === 0 && (
          <TypeStep
            value={type}
            onSelect={(selected) => {
              setType(selected);
              setCategoryId(null);
              goTo(1);
            }}
          />
        )}
        {step === 1 && (
          <NameStep value={name} onChange={setName} onNext={() => goTo(2)} />
        )}
        {step === 2 && (
          <AmountStep
            value={amount}
            onChange={setAmount}
            onNext={() => goTo(3)}
          />
        )}
        {step === 3 && (
          <CategoryStep
            categories={filteredCategories}
            onSelect={(id) => {
              setCategoryId(id || null);
              goTo(4);
            }}
          />
        )}
        {step === 4 && (
          <FrequencyStep
            frequency={frequency}
            dayOfWeek={dayOfWeek}
            dayOfMonth={dayOfMonth}
            onFrequencyChange={setFrequency}
            onDayOfWeekChange={setDayOfWeek}
            onDayOfMonthChange={setDayOfMonth}
            onNext={() => goTo(5)}
          />
        )}
        {step === 5 && (
          <AutomationStep
            autoApply={autoApply}
            onChange={setAutoApply}
            onNext={() => goTo(6)}
          />
        )}
        {step === 6 && (
          <ReviewStep
            type={type ?? "expense"}
            name={name}
            amount={Number(amount || "0")}
            categoryName={selectedCategory?.name ?? "Sin categoría"}
            frequency={frequency}
            dayOfWeek={dayOfWeek}
            dayOfMonth={dayOfMonth}
            autoApply={autoApply}
            error={state.error}
            submitLabel={isEdit ? "Guardar cambios" : "Crear recurrente"}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function CreateRecurringDialog({
  categories,
  mode = "create",
  recurring,
}: {
  categories: RecurringCategory[];
  mode?: "create" | "edit";
  recurring?: EditableRecurring;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit" && !!recurring;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label="Editar movimiento recurrente"
              className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
            />
          }
        >
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-ki-awakening px-4 text-sm font-medium text-void transition-colors hover:bg-ki-awakening/90" />
          }
        >
          <Plus className="size-4" />
          Nuevo
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            {isEdit ? "Editar" : "Nuevo"}
          </div>
          <DialogTitle>
            {isEdit ? "Editar recurrente" : "Nuevo recurrente"}
          </DialogTitle>
        </DialogHeader>
        {open && (
          <RecurringWizard
            categories={categories}
            onSuccess={() => setOpen(false)}
            mode={mode}
            recurring={recurring}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
