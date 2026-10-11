"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  addProjectionLine,
  deleteProjectionLine,
  toggleProjectionLineIncluded,
  updateProjectionLine,
  updateProjectionLineActualAmount,
  type ProjectionActionState,
} from "@/app/(app)/projection/actions";
import { AddFromTransactionsDialog, type ImportableTransaction } from "@/components/add-from-transactions-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type ProjectionLineRow = {
  id: string;
  kind: "income" | "expense";
  label: string;
  amount: number;
  actual_amount: number | null;
  expected_date: string;
  category_id: string | null;
  source: "manual" | "budget" | "recurring" | "debt" | "transaction";
  included: boolean;
  category_name: string | null;
};

export type ProjectionCategoryOption = { id: string; name: string; type: "income" | "expense" };
export type ProjectionTransactionOption = ImportableTransaction;

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });

const SOURCE_LABELS: Record<ProjectionLineRow["source"], string> = {
  manual: "Manual",
  budget: "Presupuesto",
  recurring: "Recurrente",
  debt: "Deuda",
  transaction: "Movimiento real",
};

const initialState: ProjectionActionState = {};

// Estado local inicializado desde `line` solo al montar — sin un efecto de
// resincronización (mismo motivo que `ScenarioSettings`): el llamador
// monta este componente con `key={line.id}` cuando entra a modo edición,
// así que un remount real ocurre si cambia de línea.
function LineEditRow({
  line,
  categories,
  onCancel,
  onSaved,
}: {
  line: ProjectionLineRow;
  categories: ProjectionCategoryOption[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(line.label);
  const [amount, setAmount] = useState(String(line.amount));
  const [expectedDate, setExpectedDate] = useState(line.expected_date);
  const [categoryId, setCategoryId] = useState<string | null>(line.category_id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const matchingCategories = categories.filter((category) => category.type === line.kind);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateProjectionLine(line.id, {
        label,
        amount: Number(amount),
        expectedDate,
        categoryId,
      });
      if (result.error) setError(result.error);
      else onSaved();
    });
  }

  return (
    <div className="border-b border-ink-muted/10 py-3 last:border-b-0">
      <div className="grid gap-2 sm:grid-cols-4">
        <Input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Etiqueta"
          className="h-8 text-sm"
        />
        <Input
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Monto"
          className="h-8 font-mono text-sm"
        />
        <Input
          type="date"
          value={expectedDate}
          onChange={(event) => setExpectedDate(event.target.value)}
          className="h-8 text-sm"
        />
        <Select value={categoryId ?? ""} onValueChange={(next) => setCategoryId(next || null)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            {matchingCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      <div className="mt-2 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" size="sm" disabled={isPending} onClick={handleSave} className="gap-1.5">
          {isPending && <Loader2 className="size-3.5 animate-spin" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}

// Input no controlado (defaultValue, no `value`) — se lee del DOM al perder
// el foco en vez de sincronizar estado en cada tecla. `key` ligada al valor
// guardado fuerza un remount (en vez de un efecto) cuando el servidor
// confirma el nuevo monto, mismo principio que el resto del archivo.
function ActualAmountField({ line }: { line: ProjectionLineRow }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function commit() {
    const raw = inputRef.current?.value ?? "";
    const parsed = raw.trim() === "" ? null : Number(raw);
    if (parsed === line.actual_amount) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProjectionLineActualAmount(line.id, parsed);
      if (result.error) setError(result.error);
    });
  }

  // Para gastos, gastar MÁS de lo presupuestado es malo (rojo); para
  // ingresos, recibir MÁS de lo esperado es bueno (verde) — mismo criterio
  // ya usado por `StatTile` (`higherIsBetter`/`lowerIsBetter`).
  const diff = line.actual_amount != null ? line.actual_amount - line.amount : 0;
  const diffIsBad = line.kind === "expense" ? diff > 0 : diff < 0;
  const valueColor = line.actual_amount == null || diff === 0 ? "text-ink" : diffIsBad ? "text-red-400" : "text-emerald-400";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="font-mono text-[10px] tracking-widest text-ink-muted uppercase">Real</span>
      <input
        key={line.actual_amount ?? "empty"}
        ref={inputRef}
        type="number"
        step="0.01"
        defaultValue={line.actual_amount ?? ""}
        placeholder="Real"
        disabled={isPending}
        onBlur={commit}
        aria-label={`Monto real de ${line.label}`}
        className={`h-6 w-20 rounded-md border border-ink-muted/15 bg-void/60 px-1.5 text-right font-mono text-xs outline-none focus-visible:border-ki-awakening disabled:opacity-50 ${valueColor}`}
      />
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

function LineRow({ line, categories }: { line: ProjectionLineRow; categories: ProjectionCategoryOption[] }) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <LineEditRow
        key={line.id}
        line={line}
        categories={categories}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b border-ink-muted/10 py-3 last:border-b-0 ${
        line.included ? "" : "opacity-50"
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{line.label}</p>
        <p className="mt-0.5 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          {dateFormatter.format(new Date(`${line.expected_date}T00:00:00`))} · {SOURCE_LABELS[line.source]}
          {line.category_name ? ` · ${line.category_name}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[10px] tracking-widest text-ink-muted uppercase">Presupuesto</span>
          <span className={`font-mono text-sm ${line.kind === "income" ? "text-emerald-400" : "text-red-400"}`}>
            {line.kind === "income" ? "+" : "-"}
            {currencyFormatter.format(line.amount)}
          </span>
        </div>
        <ActualAmountField line={line} />
        <Switch
          checked={line.included}
          disabled={isPending}
          aria-label={`${line.included ? "Excluir" : "Incluir"} ${line.label}`}
          onCheckedChange={(checked) => startTransition(() => toggleProjectionLineIncluded(line.id, checked))}
        />
        <button
          type="button"
          aria-label={`Editar ${line.label}`}
          disabled={isPending}
          onClick={() => setIsEditing(true)}
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:opacity-40"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={`Eliminar ${line.label}`}
          disabled={isPending}
          onClick={() => startTransition(() => deleteProjectionLine(line.id))}
          className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function LineGroup({
  title,
  lines,
  categories,
}: {
  title: string;
  lines: ProjectionLineRow[];
  categories: ProjectionCategoryOption[];
}) {
  const total = lines.filter((line) => line.included).reduce((sum, line) => sum + line.amount, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">{title}</h3>
        <span className="font-mono text-sm text-ink">{currencyFormatter.format(total)}</span>
      </div>
      <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
        {lines.length > 0 ? (
          lines.map((line) => <LineRow key={line.id} line={line} categories={categories} />)
        ) : (
          <p className="py-3 text-sm text-ink-muted">Sin líneas.</p>
        )}
      </div>
    </div>
  );
}

// Agrupa los gastos incluidos con categoría — "incluso por categorías de
// gastos" era parte explícita del pedido. `actual` suma `actual_amount ??
// 0` (no confirmado = $0 gastado todavía, no se asume el presupuesto).
function CategoryBreakdown({ lines }: { lines: ProjectionLineRow[] }) {
  const categorized = lines.filter((line) => line.kind === "expense" && line.included && line.category_name);
  if (categorized.length === 0) return null;

  const totals = new Map<string, { budget: number; actual: number }>();
  for (const line of categorized) {
    const entry = totals.get(line.category_name!) ?? { budget: 0, actual: 0 };
    entry.budget += line.amount;
    entry.actual += line.actual_amount ?? 0;
    totals.set(line.category_name!, entry);
  }

  const rows = Array.from(totals.entries())
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.budget - a.budget);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">Por categoría</h3>
        <div className="flex gap-3 font-mono text-[10px] tracking-widest text-ink-muted uppercase">
          <span className="w-20 text-right">Presup.</span>
          <span className="w-20 text-right">Real</span>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
        {rows.map((row) => {
          const diff = row.actual - row.budget;
          const valueColor = diff === 0 ? "text-ink" : diff > 0 ? "text-red-400" : "text-emerald-400";
          return (
            <div
              key={row.name}
              className="flex items-center justify-between gap-3 border-b border-ink-muted/10 py-3 last:border-b-0"
            >
              <span className="truncate text-sm text-ink">{row.name}</span>
              <div className="flex shrink-0 gap-3 font-mono text-sm">
                <span className="w-20 text-right text-ink-muted">{currencyFormatter.format(row.budget)}</span>
                <span className={`w-20 text-right ${valueColor}`}>{currencyFormatter.format(row.actual)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddLineSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} className="w-full gap-1.5 sm:w-auto">
      <Plus className="size-3.5" />
      Agregar línea
    </Button>
  );
}

function AddLineForm({
  scenarioId,
  categories,
  onAdded,
}: {
  scenarioId: string;
  categories: ProjectionCategoryOption[];
  onAdded: () => void;
}) {
  const [state, formAction] = useActionState(addProjectionLine, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onAdded();
    }
  }, [state.success, onAdded]);

  const matchingCategories = categories.filter((category) => category.type === kind);

  return (
    <form ref={formRef} action={formAction} className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <h3 className="font-mono text-xs tracking-widest text-ink-muted uppercase">Agregar línea manual</h3>
      <input type="hidden" name="scenario_id" value={scenarioId} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Tipo</Label>
          <Select value={kind} onValueChange={(next) => next && setKind(next as "income" | "expense")}>
            <SelectTrigger className="mt-1.5 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Gasto</SelectItem>
              <SelectItem value="income">Ingreso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="line-label" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Etiqueta
          </Label>
          <Input id="line-label" name="label" placeholder="Ej. Renta" className="mt-1.5 h-9 text-sm" />
        </div>
        <div>
          <Label htmlFor="line-amount" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Monto
          </Label>
          <Input
            id="line-amount"
            name="amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            className="mt-1.5 h-9 font-mono text-sm"
          />
        </div>
        <div>
          <Label htmlFor="line-date" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
            Fecha
          </Label>
          <Input id="line-date" name="expected_date" type="date" className="mt-1.5 h-9 text-sm" />
        </div>
        <div>
          <Label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Categoría</Label>
          <Select value={categoryId ?? ""} onValueChange={(next) => setCategoryId(next || null)}>
            <SelectTrigger className="mt-1.5 h-9 text-sm">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              {matchingCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : <span />}
        <AddLineSubmitButton />
      </div>
    </form>
  );
}

export function ProjectionLinesPanel({
  scenarioId,
  lines,
  categories,
  importableTransactions,
}: {
  scenarioId: string;
  lines: ProjectionLineRow[];
  categories: ProjectionCategoryOption[];
  importableTransactions: ProjectionTransactionOption[];
}) {
  const incomeLines = lines.filter((line) => line.kind === "income");
  const expenseLines = lines.filter((line) => line.kind === "expense");
  // Incrementar `formKey` remonta `AddLineForm`, lo que reinicia su estado
  // local (tipo/categoría) tras un alta exitosa sin resincronizarlo desde
  // un efecto (ver nota de `ScenarioSettings` en projection-scenario-panel).
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">Líneas</h2>
        <AddFromTransactionsDialog scenarioId={scenarioId} transactions={importableTransactions} />
      </div>
      <LineGroup title="Ingresos" lines={incomeLines} categories={categories} />
      <LineGroup title="Gastos" lines={expenseLines} categories={categories} />
      <CategoryBreakdown lines={expenseLines} />
      <AddLineForm
        key={formKey}
        scenarioId={scenarioId}
        categories={categories}
        onAdded={() => setFormKey((k) => k + 1)}
      />
    </div>
  );
}
