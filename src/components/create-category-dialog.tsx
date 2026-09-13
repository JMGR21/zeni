"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Plus } from "lucide-react";
import { cn } from "cn";
import { createCategory, type CreateCategoryActionState } from "@/app/(app)/categories/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type CategoryType = "income" | "expense";

const initialState: CreateCategoryActionState = {};

function SubmitButton() {
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
        "Crear categoría"
      )}
    </Button>
  );
}

function CreateCategoryForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(createCategory, initialState);
  const [type, setType] = useState<CategoryType>("expense");
  const [name, setName] = useState("");

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "rounded-lg border border-ink-muted/15 bg-void/40 py-2.5 text-sm text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
            type === "income" && "border-ki-awakening/60 bg-ki-awakening/10",
          )}
        >
          Ingreso
        </button>
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "rounded-lg border border-ink-muted/15 bg-void/40 py-2.5 text-sm text-ink transition-colors hover:border-ki-awakening/50 hover:bg-ki-awakening/5",
            type === "expense" && "border-ki-awakening/60 bg-ki-awakening/10",
          )}
        >
          Gasto
        </button>
      </div>
      <Input
        name="name"
        autoFocus
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Nombre de la categoría"
        className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
      />
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}

export function CreateCategoryDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-ki-awakening px-4 text-sm font-medium text-void transition-colors hover:bg-ki-awakening/90" />
        }
      >
        <Plus className="size-4" />
        Nueva categoría
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
            Nueva
          </div>
          <DialogTitle>Nueva categoría</DialogTitle>
        </DialogHeader>
        {open && <CreateCategoryForm onSuccess={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
