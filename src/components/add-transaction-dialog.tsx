"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "cn";
import { addTransaction, type AddTransactionActionState } from "@/app/(app)/dashboard/actions";
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

export type TransactionCategory = {
  id: string;
  name: string;
  type: "income" | "expense";
};

type TransactionType = "income" | "expense";

const STEP_LABELS = ["Tipo", "Monto", "Categoría", "Fecha", "Confirmar"] as const;
const WEEKDAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function monthGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: startWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function SubmitButton() {
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
        "Guardar movimiento"
      )}
    </Button>
  );
}

function StepProgress({
  step,
  maxReached,
  onJump,
}: {
  step: number;
  maxReached: number;
  onJump: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {STEP_LABELS.map((label, index) => {
        const reached = index <= maxReached;
        const active = index === step;
        return (
          <button
            key={label}
            type="button"
            disabled={!reached}
            onClick={() => onJump(index)}
            aria-label={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors disabled:cursor-not-allowed",
              active ? "bg-ki-awakening" : reached ? "bg-ki-awakening/40" : "bg-ink-muted/15",
            )}
          />
        );
      })}
    </div>
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
  const [viewDate, setViewDate] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const cells = monthGrid(viewDate);
  const monthLabel = viewDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect(today)}
          className="rounded-full border border-ink-muted/15 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ki-awakening/40 hover:text-ink"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onSelect(yesterday)}
          className="rounded-full border border-ink-muted/15 px-3 py-1 text-xs text-ink-muted transition-colors hover:border-ki-awakening/40 hover:text-ink"
        >
          Ayer
        </button>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Mes anterior"
          onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-display text-sm text-ink capitalize">{monthLabel}</span>
        <button
          type="button"
          aria-label="Mes siguiente"
          onClick={() => setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] text-ink-muted">
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <span key={index} />;
          const active = isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex h-9 items-center justify-center rounded-md text-sm text-ink transition-colors hover:bg-ink-muted/10",
                active && "bg-ki-awakening font-semibold text-void hover:bg-ki-awakening",
                isToday && !active && "ring-1 ring-ki-awakening/50 ring-inset",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-ink-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-ink">{value}</span>
        <button type="button" onClick={onEdit} className="text-xs text-ki-awakening hover:underline">
          Editar
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  type,
  amount,
  categoryName,
  date,
  error,
  onEditStep,
}: {
  type: TransactionType;
  amount: number;
  categoryName: string;
  date: Date;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  const dateLabel = date.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <SummaryRow label="Tipo" value={type === "income" ? "Ingreso" : "Gasto"} onEdit={() => onEditStep(0)} />
        <SummaryRow label="Monto" value={summaryCurrencyFormatter.format(amount)} onEdit={() => onEditStep(1)} />
        <SummaryRow label="Categoría" value={categoryName} onEdit={() => onEditStep(2)} />
        <SummaryRow label="Fecha" value={dateLabel} onEdit={() => onEditStep(3)} />
      </div>
      <Input
        name="description"
        placeholder="Nota (opcional)"
        className="h-9 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <SubmitButton />
    </div>
  );
}

function TransactionWizard({
  categories,
  onSuccess,
}: {
  categories: TransactionCategory[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(addTransaction, initialState);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [type, setType] = useState<TransactionType | null>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date());

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
      <input type="hidden" name="type" value={type ?? ""} />
      <input type="hidden" name="amount" value={Number(amount || "0").toFixed(2)} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="occurred_on" value={toISODate(date)} />

      <StepProgress step={step} maxReached={maxReached} onJump={goTo} />

      <div className="flex items-center gap-2">
        {step > 0 && (
          <button
            type="button"
            aria-label="Atrás"
            onClick={() => goTo(step - 1)}
            className="flex size-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
        <span className="text-xs font-medium tracking-widest text-ink-muted uppercase">
          {STEP_LABELS[step]}
        </span>
      </div>

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && (
          <TypeStep
            onSelect={(selected) => {
              setType(selected);
              setCategoryId(null);
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
            error={state.error}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function AddTransactionDialog({
  categories,
}: {
  categories: TransactionCategory[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-ki-awakening"
              style={{ animation: "scouter-blink 1.6s ease-in-out infinite" }}
            />
            Registro
          </div>
          <DialogTitle>Nuevo movimiento</DialogTitle>
        </DialogHeader>
        {open && <TransactionWizard categories={categories} onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
