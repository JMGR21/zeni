"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil } from "lucide-react";
import { updateCategory, type UpdateCategoryActionState } from "@/app/(app)/categories/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const initialState: UpdateCategoryActionState = {};

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
        "Guardar cambios"
      )}
    </Button>
  );
}

export function EditCategoryDialog({ categoryId, categoryName }: { categoryId: string; categoryName: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(categoryName);
  const [state, formAction] = useActionState(updateCategory, initialState);

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
        if (next) setName(categoryName);
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label={`Editar categoría ${categoryName}`}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
          />
        }
      >
        <Pencil className="size-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            Editar
          </div>
          <DialogTitle>{categoryName}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={categoryId} />
          <Input
            name="name"
            autoFocus
            aria-label="Nombre de la categoría"
            aria-invalid={Boolean(state.error)}
            aria-describedby={state.error ? "edit-category-name-error" : undefined}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nombre de la categoría"
            className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
          />
          {state.error && (
            <p id="edit-category-name-error" className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <SaveButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}
