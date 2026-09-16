"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil } from "lucide-react";
import { updatePayoffToday, type PayoffTodayActionState } from "@/app/(app)/dragons/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: PayoffTodayActionState = {};

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
        "Guardar saldo"
      )}
    </Button>
  );
}

export function UpdatePayoffTodayDialog({
  dragonId,
  dragonName,
  currentPayoffAmount,
}: {
  dragonId: string;
  dragonName: string;
  currentPayoffAmount: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, formAction] = useActionState(updatePayoffToday, initialState);

  // Cierra el modal tras un guardado exitoso, sin usar un efecto: se detecta
  // el cambio de `state` durante el render (mismo patrón de EditBudgetDialog).
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
        if (next) setAmount(currentPayoffAmount !== null ? currentPayoffAmount.toFixed(2) : "");
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-ink-muted/15 bg-void/40 px-2.5 py-1 text-[11px] font-medium text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5"
          />
        }
      >
        <Pencil className="size-3" aria-hidden="true" />
        Actualizar saldo
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            Liquidación anticipada
          </div>
          <DialogTitle>{dragonName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="dragon_id" value={dragonId} />
          <input type="hidden" name="amount" value={amount} />
          <AmountKeypad
            value={amount}
            onChange={setAmount}
            autoFocus
            ariaLabel={`Saldo de liquidación anticipada para ${dragonName}`}
          />
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
