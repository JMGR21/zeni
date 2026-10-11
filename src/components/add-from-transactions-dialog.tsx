"use client";

import { useState, useTransition } from "react";
import { ListPlus, Loader2 } from "lucide-react";
import { addProjectionLinesFromTransactions } from "@/app/(app)/projection/actions";
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
import { Switch } from "@/components/ui/switch";

export type ImportableTransaction = {
  id: string;
  kind: "income" | "expense";
  label: string;
  amount: number;
  expected_date: string;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short" });

function TransactionPickRow({
  transaction,
  checked,
  onToggle,
}: {
  transaction: ImportableTransaction;
  checked: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink-muted/10 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="truncate text-sm text-ink">{transaction.label}</p>
        <p className="mt-0.5 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
          {dateFormatter.format(new Date(`${transaction.expected_date}T00:00:00`))}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`font-mono text-sm ${transaction.kind === "income" ? "text-emerald-400" : "text-red-400"}`}>
          {currencyFormatter.format(transaction.amount)}
        </span>
        <Switch checked={checked} onCheckedChange={onToggle} aria-label={`Incluir ${transaction.label}`} />
      </div>
    </div>
  );
}

export function AddFromTransactionsDialog({
  scenarioId,
  transactions,
}: {
  scenarioId: string;
  transactions: ImportableTransaction[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const incomeTransactions = transactions.filter((transaction) => transaction.kind === "income");
  const expenseTransactions = transactions.filter((transaction) => transaction.kind === "expense");

  function toggle(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await addProjectionLinesFromTransactions(scenarioId, Array.from(selected));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setSelected(new Set());
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setSelected(new Set());
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="gap-1.5" />}>
        <ListPlus className="size-3.5" />
        Agregar movimientos del mes
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar movimientos existentes</DialogTitle>
          <DialogDescription>
            Ingresos y gastos que ya registraste este mes. Elige cuáles quieres incluir en el escenario.
          </DialogDescription>
        </DialogHeader>

        {transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            No hay movimientos de este mes sin agregar todavía.
          </p>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto">
            {incomeTransactions.length > 0 && (
              <div>
                <h4 className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Ingresos</h4>
                <div className="mt-2 rounded-xl border border-ink-muted/15 bg-void/40 px-3">
                  {incomeTransactions.map((transaction) => (
                    <TransactionPickRow
                      key={transaction.id}
                      transaction={transaction}
                      checked={selected.has(transaction.id)}
                      onToggle={(checked) => toggle(transaction.id, checked)}
                    />
                  ))}
                </div>
              </div>
            )}
            {expenseTransactions.length > 0 && (
              <div>
                <h4 className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Gastos</h4>
                <div className="mt-2 rounded-xl border border-ink-muted/15 bg-void/40 px-3">
                  {expenseTransactions.map((transaction) => (
                    <TransactionPickRow
                      key={transaction.id}
                      transaction={transaction}
                      checked={selected.has(transaction.id)}
                      onToggle={(checked) => toggle(transaction.id, checked)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button type="button" disabled={selected.size === 0 || isPending} onClick={handleConfirm} className="gap-2">
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Agregar {selected.size > 0 ? `(${selected.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
