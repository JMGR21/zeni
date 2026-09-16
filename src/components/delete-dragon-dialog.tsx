"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteDragon, type DeleteDragonActionState } from "@/app/(app)/dragons/actions";
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

const initialState: DeleteDragonActionState = {};

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

function DeleteDragonForm({ dragonId, onSuccess }: { dragonId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteDragon, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={dragonId} />
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

export function DeleteDragonDialog({ dragonId, dragonName }: { dragonId: string; dragonName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label="Eliminar Dragón"
            className="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {dragonName}</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borrará el Dragón y todo su historial de abonos permanentemente. Esta acción no se puede deshacer,
            ¿seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && <DeleteDragonForm dragonId={dragonId} onSuccess={() => setOpen(false)} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
