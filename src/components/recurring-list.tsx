"use client";

import { useTransition } from "react";
import { cn } from "cn";
import { toggleRecurringActive, toggleRecurringAutoApply } from "@/app/(app)/recurring/actions";
import { CreateRecurringDialog, type EditableRecurring, type RecurringCategory } from "@/components/create-recurring-dialog";
import { DeleteRecurringDialog } from "@/components/delete-recurring-dialog";
import { Switch } from "@/components/ui/switch";

export type RecurringRow = EditableRecurring & {
  category_name: string | null;
  next_occurrence_date: string;
  active: boolean;
};

const amountFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

const FREQUENCY_LABELS: Record<RecurringRow["frequency"], string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
};

function formatNextDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function RecurringRowItem({ recurring, categories }: { recurring: RecurringRow; categories: RecurringCategory[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 border-b border-ink-muted/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium text-ink", !recurring.active && "text-ink-muted")}>
            {recurring.name}
          </span>
          <span
            className={cn(
              "font-mono text-xs tracking-widest uppercase",
              recurring.type === "income" ? "text-ki-saiyan" : "text-ki-warrior",
            )}
          >
            {amountFormatter.format(recurring.amount)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">
          {FREQUENCY_LABELS[recurring.frequency]} · {recurring.category_name ?? "Sin categoría"} · Próxima:{" "}
          {formatNextDate(recurring.next_occurrence_date)}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Auto</span>
          <Switch
            checked={recurring.auto_apply}
            disabled={isPending}
            aria-label={`${recurring.auto_apply ? "Desactivar" : "Activar"} registro automático de ${recurring.name}`}
            onCheckedChange={(checked) => startTransition(() => toggleRecurringAutoApply(recurring.id, checked))}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">Activo</span>
          <Switch
            checked={recurring.active}
            disabled={isPending}
            aria-label={`${recurring.active ? "Pausar" : "Reanudar"} ${recurring.name}`}
            onCheckedChange={(checked) => startTransition(() => toggleRecurringActive(recurring.id, checked))}
          />
        </div>
        <CreateRecurringDialog categories={categories} mode="edit" recurring={recurring} />
        <DeleteRecurringDialog id={recurring.id} name={recurring.name} />
      </div>
    </div>
  );
}

export function RecurringList({ items, categories }: { items: RecurringRow[]; categories: RecurringCategory[] }) {
  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 px-4">
      {items.length > 0 ? (
        items.map((item) => <RecurringRowItem key={item.id} recurring={item} categories={categories} />)
      ) : (
        <p className="py-6 text-sm text-ink-muted">Aún no tienes movimientos recurrentes.</p>
      )}
    </div>
  );
}
