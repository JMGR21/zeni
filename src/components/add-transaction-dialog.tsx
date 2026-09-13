"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus, TrendingDown, TrendingUp } from "lucide-react";
import {
  addTransaction,
  updateTransaction,
  type AddTransactionActionState,
} from "@/app/(app)/dashboard/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WizardProgress, WizardStepHeader, WizardSummaryRow } from "@/components/wizard-controls";

export type TransactionCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
};

export type DragonOption = {
  id: string;
  name: string;
};

export type EditableTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  description: string | null;
  occurred_on: string;
  dragon_id: string | null;
};

const NO_DRAGON = "none";

type TransactionType = "income" | "expense";

const STEP_LABELS = ["Tipo", "Monto", "Categoría", "Fecha", "Confirmar"] as const;

const initialState: AddTransactionActionState = {};

const summaryCurrencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 w-full gap-2 bg-ki-awakening text-void hover:bg-ki-awakening/90 focus-visible:ring-ki-awakening/40"
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

function TypeStep({ onSelect }: { onSelect: (type: TransactionType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onSelect("income")}
        className="flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5"
      >
        <TrendingUp className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Ingreso</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect("expense")}
        className="flex flex-col items-center gap-2 rounded-xl border border-ink-muted/15 bg-void/40 py-6 transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5"
      >
        <TrendingDown className="size-6 text-ink-muted" />
        <span className="text-sm font-medium text-ink">Gasto</span>
      </button>
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

function CategoryStep({
  categories,
  onSelect,
}: {
  categories: TransactionCategory[];
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

function DateStep({ selected, onSelect }: { selected: Date; onSelect: (date: Date) => void }) {
  return <Calendar selected={selected} onSelect={onSelect} />;
}

function ReviewStep({
  type,
  amount,
  categoryName,
  date,
  description,
  dragons,
  dragonId,
  onDragonChange,
  error,
  submitLabel,
  onEditStep,
}: {
  type: TransactionType;
  amount: number;
  categoryName: string;
  date: Date;
  description: string;
  dragons: DragonOption[];
  dragonId: string | null;
  onDragonChange: (next: string | null) => void;
  error?: string;
  submitLabel: string;
  onEditStep: (step: number) => void;
}) {
  const dateLabel = date.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Tipo" value={type === "income" ? "Ingreso" : "Gasto"} onEdit={() => onEditStep(0)} />
        <WizardSummaryRow
          label="Monto"
          value={summaryCurrencyFormatter.format(amount)}
          onEdit={() => onEditStep(1)}
        />
        <WizardSummaryRow label="Categoría" value={categoryName} onEdit={() => onEditStep(2)} />
        <WizardSummaryRow label="Fecha" value={dateLabel} onEdit={() => onEditStep(3)} />
      </div>
      <Input
        name="description"
        placeholder="Nota (opcional)"
        defaultValue={description}
        className="h-9 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
      />
      {type === "expense" && dragons.length > 0 && (
        <div className="space-y-1.5">
          <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            ¿Este pago va a un Dragón?
          </label>
          <Select
            value={dragonId ?? NO_DRAGON}
            onValueChange={(next) => onDragonChange(next && next !== NO_DRAGON ? next : null)}
          >
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Ninguno">
                {(value: string) =>
                  value === NO_DRAGON ? "Ninguno" : (dragons.find((dragon) => dragon.id === value)?.name ?? "Ninguno")
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DRAGON}>Ninguno</SelectItem>
              {dragons.map((dragon) => (
                <SelectItem key={dragon.id} value={dragon.id}>
                  {dragon.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SubmitButton label={submitLabel} />
    </div>
  );
}

function TransactionWizard({
  categories,
  dragons,
  onSuccess,
  mode = "create",
  transaction,
}: {
  categories: TransactionCategory[];
  dragons: DragonOption[];
  onSuccess: () => void;
  mode?: "create" | "edit";
  transaction?: EditableTransaction;
}) {
  const isEdit = mode === "edit" && !!transaction;
  const [state, formAction] = useActionState(isEdit ? updateTransaction : addTransaction, initialState);
  const [step, setStep] = useState(isEdit ? 4 : 0);
  const [maxReached, setMaxReached] = useState(isEdit ? 4 : 0);
  const [type, setType] = useState<TransactionType | null>(transaction?.type ?? null);
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [categoryId, setCategoryId] = useState<string | null>(transaction?.category_id ?? null);
  const [dragonId, setDragonId] = useState<string | null>(transaction?.dragon_id ?? null);
  const [date, setDate] = useState(() =>
    transaction ? new Date(`${transaction.occurred_on}T00:00:00`) : new Date(),
  );

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  const filteredCategories = categories.filter((category) => category.type === type);
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <form action={formAction} className="space-y-4">
      {isEdit && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type ?? ""} />
      <input type="hidden" name="amount" value={Number(amount || "0").toFixed(2)} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="occurred_on" value={toISODate(date)} />
      <input type="hidden" name="dragon_id" value={type === "expense" ? (dragonId ?? "") : ""} />

      <WizardProgress steps={STEP_LABELS} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={STEP_LABELS[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && (
          <TypeStep
            onSelect={(selected) => {
              setType(selected);
              setCategoryId(null);
              setDragonId(null);
              goTo(1);
            }}
          />
        )}
        {step === 1 && <AmountStep value={amount} onChange={setAmount} onNext={() => goTo(2)} />}
        {step === 2 && (
          <CategoryStep
            categories={filteredCategories}
            onSelect={(id) => {
              setCategoryId(id || null);
              goTo(3);
            }}
          />
        )}
        {step === 3 && (
          <DateStep
            selected={date}
            onSelect={(selected) => {
              setDate(selected);
              goTo(4);
            }}
          />
        )}
        {step === 4 && (
          <ReviewStep
            type={type ?? "expense"}
            amount={Number(amount || "0")}
            categoryName={selectedCategory?.name ?? "Sin categoría"}
            date={date}
            description={transaction?.description ?? ""}
            dragons={dragons}
            dragonId={dragonId}
            onDragonChange={setDragonId}
            error={state.error}
            submitLabel={isEdit ? "Guardar cambios" : "Guardar movimiento"}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function AddTransactionDialog({
  categories,
  dragons = [],
  mode = "create",
  transaction,
}: {
  categories: TransactionCategory[];
  dragons?: DragonOption[];
  mode?: "create" | "edit";
  transaction?: EditableTransaction;
}) {
  const [open, setOpen] = useState(false);
  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
        <DialogTrigger
          render={
            <button
              type="button"
              aria-label="Editar movimiento"
              className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
            />
          }
        >
          <Pencil className="size-4" />
        </DialogTrigger>
      ) : (
        <DialogTrigger
          render={
            <button
              aria-label="Agregar movimiento"
              className="fixed right-6 bottom-6 z-40 flex size-14 items-center justify-center rounded-full bg-ki-awakening text-void shadow-lg transition-transform hover:scale-105 active:scale-95"
            />
          }
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full border border-ki-awakening"
            style={{ animation: "scouter-pulse 2.4s ease-out infinite" }}
          />
          <Plus className="size-6" />
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-ki-awakening"
              style={{ animation: "scouter-blink 1.6s ease-in-out infinite" }}
            />
            {isEdit ? "Editar" : "Registro"}
          </div>
          <DialogTitle>{isEdit ? "Editar movimiento" : "Nuevo movimiento"}</DialogTitle>
        </DialogHeader>
        {open && (
          <TransactionWizard
            categories={categories}
            dragons={dragons}
            onSuccess={() => setOpen(false)}
            mode={mode}
            transaction={transaction}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
