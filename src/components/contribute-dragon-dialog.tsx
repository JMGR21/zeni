"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { GiFireBowl } from "react-icons/gi";
import { contributeToDragon, type ContributeActionState } from "@/app/(app)/dragons/actions";
import { AmountKeypad } from "@/components/amount-keypad";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const initialState: ContributeActionState = {};

function SaveButton({ label }: { label: string }) {
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

export function ContributeDragonDialog({
  dragonId,
  dragonName,
  type,
}: {
  dragonId: string;
  dragonName: string;
  type: "savings" | "debt";
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [state, formAction] = useActionState(contributeToDragon, initialState);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.success) setOpen(false);
  }

  const label = type === "savings" ? "Agregar abono" : "Registrar pago";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setAmount("");
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            className="rounded-lg border border-ink-muted/15 bg-void/40 px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5"
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            <GiFireBowl className="size-3.5 text-ki-awakening" aria-hidden="true" />
            {label}
          </div>
          <DialogTitle>{dragonName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="dragon_id" value={dragonId} />
          <input type="hidden" name="amount" value={amount} />
          <AmountKeypad value={amount} onChange={setAmount} autoFocus />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <SaveButton label={label} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
