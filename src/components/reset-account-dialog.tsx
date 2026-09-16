"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { resetAccount, type ResetAccountActionState } from "@/app/(app)/settings/actions";
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
import { Input } from "@/components/ui/input";

const initialState: ResetAccountActionState = {};

function ResetSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={disabled || pending} className="gap-2">
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Borrando todo...
        </>
      ) : (
        "Comenzar de cero"
      )}
    </Button>
  );
}

function ResetAccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction] = useActionState(resetAccount, initialState);
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="reset-password" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          Confirma tu contraseña
        </label>
        <Input
          id="reset-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Tu contraseña"
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
        <ResetSubmitButton disabled={!password} />
      </AlertDialogFooter>
    </form>
  );
}

export function ResetAccountDialog() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setOpen(false);
    toast.success("Tu cuenta fue reiniciada. Es como empezar de cero.");
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" />}>
        Comenzar de cero
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reiniciar tu cuenta por completo</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borrará permanentemente tus transacciones, Dragones, presupuesto, Ki, Nivel, logros y
            transacciones recurrentes. Tu cuenta, correo, nombre y moneda se conservan. Esta acción no se puede
            deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && <ResetAccountForm onSuccess={handleSuccess} />}
      </AlertDialogContent>
    </AlertDialog>
  );
}
