"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Trash2 } from "lucide-react";
import { deleteCategory, type DeleteCategoryActionState } from "@/app/(app)/categories/actions";
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

const initialState: DeleteCategoryActionState = {};

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

function DeleteCategoryForm({ categoryId, onSuccess }: { categoryId: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteCategory, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={categoryId} />
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

export function DeleteCategoryDialog({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label={`Eliminar categoría ${categoryName}`}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {categoryName}</AlertDialogTitle>
          <AlertDialogDescription>
            Las transacciones y recurrentes que usan esta categoría se quedarán sin categoría; los límites de
            presupuesto asociados también se eliminarán. Esta acción no se puede deshacer, ¿seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && <DeleteCategoryForm categoryId={categoryId} onSuccess={() => setOpen(false)} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
