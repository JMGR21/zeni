"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { updateProfile, type UpdateProfileActionState } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const initialState: UpdateProfileActionState = {};

const CURRENCY_LABELS: Record<string, string> = {
  MXN: "Peso mexicano (MXN)",
};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 gap-2 bg-ki-awakening text-void hover:bg-ki-awakening/90"
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

export function SettingsForm({
  initialName,
  initialCurrency,
}: {
  initialName: string;
  initialCurrency: string;
}) {
  const [state, formAction] = useActionState(updateProfile, initialState);
  const [name, setName] = useState(initialName);
  const [currency, setCurrency] = useState(initialCurrency);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="currency" value={currency} />

      <div className="space-y-1.5">
        <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Nombre</label>
        <Input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Tu nombre"
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Moneda</label>
        <Select value={currency} onValueChange={(next) => setCurrency(next ?? "MXN")}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue>{(value: string) => CURRENCY_LABELS[value] ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MXN">Peso mexicano (MXN)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state.success && <p className="text-sm text-ki-awakening">Cambios guardados.</p>}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <SaveButton />
    </form>
  );
}
