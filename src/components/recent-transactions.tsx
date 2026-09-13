"use client";

import { GiDragonHead } from "react-icons/gi";
import { AddTransactionDialog, type DragonOption, type TransactionCategory } from "@/components/add-transaction-dialog";
import { DeleteTransactionDialog } from "@/components/delete-transaction-dialog";

export type RecentTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  occurred_on: string;
  category_id: string | null;
  categories: { name: string } | null;
  dragon_id: string | null;
  dragons: { name: string } | null;
};

const currencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
});

export function RecentTransactions({
  transactions,
  categories,
  dragons = [],
  emptyMessage = "Sin movimientos todavía",
}: {
  transactions: RecentTransaction[];
  categories: TransactionCategory[];
  dragons?: DragonOption[];
  emptyMessage?: string;
}) {
  return (
    <table className="mt-4 w-full text-left text-sm">
      <thead>
        <tr className="border-b border-ink-muted/10 text-ink-muted">
          <th className="py-2 font-normal">Fecha</th>
          <th className="py-2 font-normal">Categoría</th>
          <th className="py-2 font-normal">Descripción</th>
          <th className="py-2 text-right font-normal">Monto</th>
          <th className="py-2 text-right font-normal">
            <span className="sr-only">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b border-ink-muted/10">
              <td className="py-3 text-ink-muted">
                {dateFormatter.format(new Date(`${transaction.occurred_on}T00:00:00`))}
              </td>
              <td className="py-3 text-ink-muted">{transaction.categories?.name ?? "Sin categoría"}</td>
              <td className="py-3 text-ink-muted">
                <div className="flex flex-col gap-0.5">
                  <span>{transaction.description || "—"}</span>
                  {transaction.dragons?.name && (
                    <span className="flex items-center gap-1 font-mono text-[11px] tracking-widest text-ink-muted/70 uppercase">
                      <GiDragonHead className="size-3" aria-hidden="true" />
                      {transaction.dragons.name}
                    </span>
                  )}
                </div>
              </td>
              <td
                className={`py-3 text-right font-mono ${
                  transaction.type === "income" ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}
                {currencyFormatter.format(transaction.amount)}
              </td>
              <td className="py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <AddTransactionDialog
                    categories={categories}
                    dragons={dragons}
                    mode="edit"
                    transaction={{
                      id: transaction.id,
                      type: transaction.type,
                      amount: transaction.amount,
                      category_id: transaction.category_id,
                      description: transaction.description,
                      occurred_on: transaction.occurred_on,
                      dragon_id: transaction.dragon_id,
                    }}
                  />
                  <DeleteTransactionDialog transactionId={transaction.id} />
                </div>
              </td>
            </tr>
          ))
        ) : (
          <tr className="border-b border-ink-muted/10">
            <td className="py-3 text-ink-muted">—</td>
            <td className="py-3 text-ink-muted">—</td>
            <td className="py-3 text-ink-muted">{emptyMessage}</td>
            <td className="py-3 text-right text-ink-muted">—</td>
            <td className="py-3" />
          </tr>
        )}
      </tbody>
    </table>
  );
}
