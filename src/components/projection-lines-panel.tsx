"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import {
  addProjectionLine,
  deleteProjectionLine,
  toggleProjectionLineIncluded,
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
  expected_date: string;
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

function LineRow({ line }: { line: ProjectionLineRow }) {
  const [isPending, startTransition] = useTransition();

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
      <div className="flex shrink-0 items-center gap-3">
        <span className={`font-mono text-sm ${line.kind === "income" ? "text-emerald-400" : "text-red-400"}`}>
          {line.kind === "income" ? "+" : "-"}
          {currencyFormatter.format(line.amount)}
        </span>
        <Switch
          checked={line.included}
          disabled={isPending}
          aria-label={`${line.included ? "Excluir" : "Incluir"} ${line.label}`}
          onCheckedChange={(checked) => startTransition(() => toggleProjectionLineIncluded(line.id, checked))}
        />
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

function LineGroup({ title, lines }: { title: string; lines: ProjectionLineRow[] }) {
  const total = lines.filter((line) => line.included).reduce((sum, line) => sum + line.amount, 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">{title}</h3>
        <span className="font-mono text-sm text-ink">{currencyFormatter.format(total)}</span>
      </div>
      <div className="mt-3 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
        {lines.length > 0 ? (
          lines.map((line) => <LineRow key={line.id} line={line} />)
        ) : (
          <p className="py-3 text-sm text-ink-muted">Sin líneas.</p>
        )}
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
      <LineGroup title="Ingresos" lines={incomeLines} />
      <LineGroup title="Gastos" lines={expenseLines} />
      <AddLineForm
        key={formKey}
        scenarioId={scenarioId}
        categories={categories}
        onAdded={() => setFormKey((k) => k + 1)}
      />
    </div>
  );
}
