"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, RotateCcw } from "lucide-react";
import { cn } from "cn";
import { resetBudget, setBudget, type BudgetActionState } from "@/app/(app)/budget/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SuggestedBudget } from "@/lib/budget";

export type BudgetCategory = {
  id: string;
  name: string;
  spent: number;
  customAmount: number | null;
  suggestion: SuggestedBudget;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const initialState: BudgetActionState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      disabled={pending}
      className="h-8 gap-1.5 bg-ki-awakening text-void hover:bg-ki-awakening/90"
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : "Guardar"}
    </Button>
  );
}

export function BudgetCategoryCard({ category }: { category: BudgetCategory }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction] = useActionState(setBudget, initialState);
  const [isResetting, startReset] = useTransition();

  // Cierra el formulario tras un guardado exitoso, sin usar un efecto: se
  // detecta el cambio de `state` durante el render (patrón recomendado por
  // React para ajustar estado en respuesta a otro estado).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setEditing(false);
  }

  const isCustom = category.customAmount !== null;
  const budgeted = category.customAmount ?? (category.suggestion.available ? category.suggestion.amount : null);
  const overBudget = budgeted !== null && category.spent > budgeted;
  const progressRatio = budgeted ? category.spent / budgeted : 0;

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{category.name}</p>
          {budgeted !== null ? (
            <p className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg text-ink">{currencyFormatter.format(budgeted)}</span>
              <span
                className={cn(
                  "font-mono text-[11px] tracking-widest uppercase",
                  isCustom ? "text-ki-awakening" : "text-ink-muted",
                )}
              >
                {isCustom ? "Tu monto" : "Sugerido"}
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">Necesitas más historial</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isCustom && (
            <button
              type="button"
              aria-label="Volver a la sugerencia automática"
              disabled={isResetting}
              onClick={() => startReset(() => resetBudget(category.id))}
              className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:opacity-50"
            >
              <RotateCcw className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            aria-label={editing ? "Cancelar edición" : "Editar presupuesto"}
            onClick={() => setEditing((prev) => !prev)}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
          >
            <Pencil className="size-3.5" />
          </button>
        </div>
      </div>

      {editing ? (
        <form action={formAction} className="mt-3 space-y-2">
          <input type="hidden" name="category_id" value={category.id} />
          <div className="flex items-center gap-2">
            <Input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              autoFocus
              defaultValue={budgeted ?? undefined}
              placeholder="0.00"
              className="h-8 border-ink-muted/15 bg-void/40 font-mono text-sm text-ink placeholder:text-ink-muted/60"
            />
            <SaveButton />
          </div>
          {state.error && (
            <p className="text-xs text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </form>
      ) : (
        budgeted !== null && (
          <div className="mt-3">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-muted/15">
              <div
                className={cn("h-full rounded-full transition-all", overBudget ? "bg-ki-survival" : "bg-ki-awakening")}
                style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-xs text-ink-muted">
              <span>{currencyFormatter.format(category.spent)} gastado</span>
              <span className={overBudget ? "text-ki-survival" : undefined}>
                {Math.round(progressRatio * 100)}%
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
