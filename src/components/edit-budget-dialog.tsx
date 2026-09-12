"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Dumbbell, Loader2, Pencil } from "lucide-react";
import { setBudget, type BudgetActionState } from "@/app/(app)/budget/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: BudgetActionState = {};

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
        "Guardar límite"
      )}
    </Button>
  );
}

export function EditBudgetDialog({
  categoryId,
  categoryName,
  initialAmount,
}: {
  categoryId: string;
  categoryName: string;
  initialAmount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, formAction] = useActionState(setBudget, initialState);

  // Cierra el modal tras un guardado exitoso, sin usar un efecto: se detecta
  // el cambio de `state` durante el render (patrón recomendado por React
  // para ajustar estado en respuesta a otro estado).
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAmount(initialAmount !== null ? initialAmount.toFixed(2) : "");
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Editar presupuesto"
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
          />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <Dumbbell className="size-3.5 text-ki-awakening" aria-hidden="true" />
            Ajuste de gravedad
          </div>
          <DialogTitle>{categoryName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="category_id" value={categoryId} />
          <input type="hidden" name="amount" value={amount} />
          <AmountKeypad value={amount} onChange={setAmount} autoFocus />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <SaveButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
