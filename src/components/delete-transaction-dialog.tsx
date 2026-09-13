"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteTransaction, type DeleteTransactionActionState } from "@/app/(app)/dashboard/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const initialState: DeleteTransactionActionState = {};

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending} className="gap-2">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Eliminando...
        </>
      ) : (
        "Eliminar"
      )}
    </Button>
  );
}

function DeleteTransactionForm({ transactionId, onSuccess }: { transactionId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteTransaction, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={transactionId} />
      {state.error && (
        <p className="mb-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
        <DeleteSubmitButton />
      </AlertDialogFooter>
    </form>
  );
}

export function DeleteTransactionDialog({ transactionId }: { transactionId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label="Eliminar movimiento"
            className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar movimiento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. El movimiento se eliminará permanentemente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && <DeleteTransactionForm transactionId={transactionId} onSuccess={() => setOpen(false)} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
