"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateInitialBalance } from "@/app/(app)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InitialBalanceField({ initialBalance }: { initialBalance: number }) {
  const [value, setValue] = useState(String(initialBalance));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return;
    startTransition(async () => {
      await updateInitialBalance(amount);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="initial-balance" className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
        Saldo inicial
      </label>
      <p className="text-sm text-ink-muted">
        Cuánto tenías antes de empezar a usar Zeni — solo se captura una vez, pero puedes corregirlo si te
        equivocaste.
      </p>
      <div className="flex gap-2">
        <Input
          id="initial-balance"
          type="number"
          inputMode="decimal"
          step="0.01"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
          className="h-11 border-ink-muted/15 bg-void/40 text-sm text-ink placeholder:text-ink-muted/60"
        />
        <Button
          type="button"
          disabled={isPending}
          onClick={save}
          className="h-11 gap-2 bg-ki-awakening text-void hover:bg-ki-awakening/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Guardar"}
        </Button>
      </div>
      {saved && !isPending && (
        <p className="text-sm text-ki-awakening" role="status">
          Cambios guardados.
        </p>
      )}
    </div>
  );
}
