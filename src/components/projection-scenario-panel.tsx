"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createProjectionScenario,
  deleteProjectionScenario,
  duplicateProjectionScenario,
  renameProjectionScenario,
  updateProjectionBufferPercent,
  updateProjectionOpeningBalance,
  type ProjectionActionState,
} from "@/app/(app)/projection/actions";
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "cn";

export type ProjectionScenarioRow = {
  id: string;
  month: string;
  name: string;
  opening_balance: number;
  buffer_percent: number;
};

const initialState: ProjectionActionState = {};

function selectScenario(router: ReturnType<typeof useRouter>, pathname: string, searchParams: URLSearchParams, id: string) {
  const params = new URLSearchParams(searchParams.toString());
  params.set("scenario", id);
  router.push(`${pathname}?${params.toString()}`);
}

function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      Crear
    </Button>
  );
}

function CreateScenarioForm({ monthISO, onSuccess }: { monthISO: string; onSuccess: (scenarioId: string) => void }) {
  const [state, formAction] = useActionState(createProjectionScenario, initialState);

  useEffect(() => {
    if (state.success && state.scenarioId) onSuccess(state.scenarioId);
  }, [state, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="month" value={monthISO} />
      <div className="space-y-1.5">
        <Label htmlFor="new-scenario-name" className="font-mono text-xs tracking-widest text-ink-muted uppercase">
          Nombre
        </Label>
        <Input id="new-scenario-name" name="name" placeholder="Ej. Plan conservador" autoFocus />
      </div>
      {state.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
        <CreateSubmitButton />
      </DialogFooter>
    </form>
  );
}

function CreateScenarioDialog({ monthISO }: { monthISO: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Nuevo escenario"
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink"
          />
        }
      >
        <Plus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo escenario</DialogTitle>
          <DialogDescription>El saldo inicial se toma de tu Saldo Disponible al cierre del mes anterior.</DialogDescription>
        </DialogHeader>
        {open && (
          <CreateScenarioForm
            monthISO={monthISO}
            onSuccess={(scenarioId) => {
              setOpen(false);
              selectScenario(router, pathname, searchParams, scenarioId);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteScenarioForm({ id, onSuccess }: { id: string; onSuccess: () => void }) {
  const [state, formAction] = useActionState(deleteProjectionScenario, initialState);

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <AlertDialogFooter>
        <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
        <Button type="submit" variant="destructive">
          Eliminar
        </Button>
      </AlertDialogFooter>
    </form>
  );
}

function DeleteScenarioButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label={`Eliminar escenario ${name}`}
            className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar {name}</AlertDialogTitle>
          <AlertDialogDescription>
            Esto borrará el escenario y todas sus líneas permanentemente. No afecta tus movimientos reales. ¿Seguro?
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open && (
          <DeleteScenarioForm
            id={id}
            onSuccess={() => {
              setOpen(false);
              const params = new URLSearchParams(searchParams.toString());
              params.delete("scenario");
              router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
            }}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

// `key={scenario.id}` en el llamador fuerza un remount al cambiar de
// escenario, así los campos locales arrancan con los valores correctos sin
// un efecto que los resincronice (evita setState síncrono dentro de un
// efecto, señalado por el linter de React Compiler).
function ScenarioSettings({ scenario }: { scenario: ProjectionScenarioRow }) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(scenario.name);
  const [openingBalance, setOpeningBalance] = useState(String(scenario.opening_balance));
  const [bufferPercent, setBufferPercent] = useState(String(scenario.buffer_percent));

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div>
        <Label htmlFor="scenario-name" className="font-mono text-xs tracking-widest text-ink-muted uppercase">
          Nombre
        </Label>
        <Input
          id="scenario-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => {
            if (name.trim() && name.trim() !== scenario.name) {
              startTransition(() => renameProjectionScenario(scenario.id, name));
            }
          }}
          className="mt-1.5"
        />
      </div>
      <div>
        <Label htmlFor="scenario-opening" className="font-mono text-xs tracking-widest text-ink-muted uppercase">
          Saldo inicial
        </Label>
        <Input
          id="scenario-opening"
          type="number"
          step="0.01"
          value={openingBalance}
          onChange={(event) => setOpeningBalance(event.target.value)}
          onBlur={() => {
            const parsed = Number(openingBalance);
            if (Number.isFinite(parsed) && parsed !== scenario.opening_balance) {
              startTransition(() => updateProjectionOpeningBalance(scenario.id, parsed));
            }
          }}
          className="mt-1.5 font-mono"
        />
      </div>
      <div>
        <Label htmlFor="scenario-buffer" className="font-mono text-xs tracking-widest text-ink-muted uppercase">
          Colchón (%)
        </Label>
        <Input
          id="scenario-buffer"
          type="number"
          step="1"
          min="0"
          value={bufferPercent}
          onChange={(event) => setBufferPercent(event.target.value)}
          onBlur={() => {
            const parsed = Number(bufferPercent);
            if (Number.isFinite(parsed) && parsed >= 0 && parsed !== scenario.buffer_percent) {
              startTransition(() => updateProjectionBufferPercent(scenario.id, parsed));
            }
          }}
          className="mt-1.5 font-mono"
        />
      </div>
    </div>
  );
}

export function ProjectionScenarioPanel({
  monthISO,
  scenarios,
  selectedId,
}: {
  monthISO: string;
  scenarios: ProjectionScenarioRow[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isDuplicating, startDuplicate] = useTransition();

  const selected = scenarios.find((scenario) => scenario.id === selectedId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            onClick={() => selectScenario(router, pathname, searchParams, scenario.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              scenario.id === selectedId ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
            )}
          >
            {scenario.name}
          </button>
        ))}
        <CreateScenarioDialog monthISO={monthISO} />
      </div>

      {scenarios.length === 0 && (
        <p className="mt-4 text-sm text-ink-muted">
          Sin escenarios para este mes todavía — crea el primero con el botón{" "}
          <Plus className="inline size-3.5 align-text-bottom" aria-hidden="true" /> de arriba.
        </p>
      )}

      {selected && (
        <div className="mt-6 rounded-xl border border-ink-muted/15 bg-void/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-mono text-xs tracking-widest text-ink-muted uppercase">Ajustes del escenario</h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Duplicar escenario ${selected.name}`}
                disabled={isDuplicating}
                onClick={() =>
                  startDuplicate(async () => {
                    const result = await duplicateProjectionScenario(selected.id);
                    if ("id" in result) selectScenario(router, pathname, searchParams, result.id);
                  })
                }
                className="flex size-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:opacity-40"
              >
                {isDuplicating ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
              </button>
              <DeleteScenarioButton id={selected.id} name={selected.name} />
            </div>
          </div>
          <div className="mt-4">
            <ScenarioSettings key={selected.id} scenario={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
