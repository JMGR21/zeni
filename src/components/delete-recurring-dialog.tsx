"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteRecurringTransaction, type RecurringActionState } from "@/app/(app)/recurring/actions";
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

const initialState: RecurringActionState = {};

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

function DeleteRecurringForm({ id, onSuccess }: { id: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteRecurringTransaction, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
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

export function DeleteRecurringDialog({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label="Eliminar movimiento recurrente"
            className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {name}</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borrará esta definición recurrente permanentemente. Las transacciones ya generadas no se verán
            afectadas. Esta acción no se puede deshacer, ¿seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && <DeleteRecurringForm id={id} onSuccess={() => setOpen(false)} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
