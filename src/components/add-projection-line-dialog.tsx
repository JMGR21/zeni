"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { addProjectionLine, type ProjectionActionState } from "@/app/(app)/projection/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WizardProgress, WizardStepHeader, WizardSummaryRow } from "@/components/wizard-controls";
import type { ProjectionCategoryOption } from "@/components/projection-lines-panel";

type LineKind = "income" | "expense";

const STEP_LABELS = ["Tipo", "Monto", "Categoría", "Fecha", "Confirmar"] as const;

const initialState: ProjectionActionState = {};

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
        "Agregar línea"
      )}
    </Button>
  );
}

function TypeStep({ onSelect }: { onSelect: (kind: LineKind) => void }) {
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
      <AmountKeypad value={value} onChange={onChange} autoFocus ariaLabel="Monto de la línea" />
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
  categories: ProjectionCategoryOption[];
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
  kind,
  amount,
  categoryName,
  date,
  label,
  onLabelChange,
  error,
  onEditStep,
}: {
  kind: LineKind;
  amount: number;
  categoryName: string;
  date: Date;
  label: string;
  onLabelChange: (next: string) => void;
  error?: string;
  onEditStep: (step: number) => void;
}) {
  const dateLabel = date.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-lg border border-ink-muted/10 bg-void/40 p-3">
        <WizardSummaryRow label="Tipo" value={kind === "income" ? "Ingreso" : "Gasto"} onEdit={() => onEditStep(0)} />
        <WizardSummaryRow
          label="Monto"
          value={summaryCurrencyFormatter.format(amount)}
          onEdit={() => onEditStep(1)}
        />
        <WizardSummaryRow label="Categoría" value={categoryName} onEdit={() => onEditStep(2)} />
        <WizardSummaryRow label="Fecha" value={dateLabel} onEdit={() => onEditStep(3)} />
      </div>
      <Input
        name="label"
        aria-label="Etiqueta"
        placeholder="Etiqueta (ej. Renta)"
        value={label}
        onChange={(event) => onLabelChange(event.target.value)}
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

function ProjectionLineWizard({
  scenarioId,
  categories,
  onSuccess,
}: {
  scenarioId: string;
  categories: ProjectionCategoryOption[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(addProjectionLine, initialState);
  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [kind, setKind] = useState<LineKind | null>(null);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [date, setDate] = useState(() => new Date());

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  function goTo(next: number) {
    setStep(next);
    setMaxReached((prev) => Math.max(prev, next));
  }

  const filteredCategories = categories.filter((category) => category.type === kind);
  const selectedCategory = categories.find((category) => category.id === categoryId);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="scenario_id" value={scenarioId} />
      <input type="hidden" name="kind" value={kind ?? ""} />
      <input type="hidden" name="amount" value={Number(amount || "0").toFixed(2)} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="expected_date" value={toISODate(date)} />

      <WizardProgress steps={STEP_LABELS} step={step} maxReached={maxReached} onJump={goTo} />

      <WizardStepHeader label={STEP_LABELS[step]} step={step} onBack={() => goTo(step - 1)} />

      <div key={step} className="animate-in fade-in-0 slide-in-from-right-2 duration-200">
        {step === 0 && (
          <TypeStep
            onSelect={(selected) => {
              setKind(selected);
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
              setLabel((current) => {
                if (current) return current;
                const category = categories.find((option) => option.id === id);
                return category?.name ?? current;
              });
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
            kind={kind ?? "expense"}
            amount={Number(amount || "0")}
            categoryName={selectedCategory?.name ?? "Sin categoría"}
            date={date}
            label={label}
            onLabelChange={setLabel}
            error={state.error}
            onEditStep={goTo}
          />
        )}
      </div>
    </form>
  );
}

export function AddProjectionLineDialog({
  scenarioId,
  categories,
}: {
  scenarioId: string;
  categories: ProjectionCategoryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" size="sm" className="gap-1.5 bg-ki-awakening text-void hover:bg-ki-awakening/90" />}>
        <Plus className="size-3.5" />
        Agregar línea
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
          <DialogTitle>Nueva línea de proyección</DialogTitle>
        </DialogHeader>
        {open && (
          <ProjectionLineWizard scenarioId={scenarioId} categories={categories} onSuccess={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
