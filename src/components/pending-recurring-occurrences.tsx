"use client";

import { useState, useTransition } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { cn } from "cn";
import { approveRecurringOccurrence, rejectRecurringOccurrence } from "@/app/(app)/recurring/actions";
import { Button } from "@/components/ui/button";
import { useAchievementToasts } from "@/hooks/use-achievement-toasts";
import type { AchievementDefinition } from "@/lib/achievements";

export type PendingOccurrence = {
  id: string;
  scheduled_date: string;
  status: "pending" | "insufficient_funds";
  name: string;
  type: "income" | "expense";
  amount: number;
};

const amountFormatter = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });

function formatScheduledDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function OccurrenceRow({
  occurrence,
  onAchievements,
}: {
  occurrence: PendingOccurrence;
  onAchievements: (achievements: AchievementDefinition[]) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveRecurringOccurrence(occurrence.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        onAchievements(result.achievements);
      }
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectRecurringOccurrence(occurrence.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-3 border-b border-ink-muted/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{occurrence.name}</span>
          <span
            className={cn(
              "font-mono text-xs tracking-widest uppercase",
              occurrence.type === "income" ? "text-ki-saiyan" : "text-ki-warrior",
            )}
          >
            {amountFormatter.format(occurrence.amount)}
          </span>
        </div>
        <p className="mt-1 text-xs text-ink-muted">Programado: {formatScheduledDate(occurrence.scheduled_date)}</p>
        <p className="mt-1 text-xs text-ki-survival">
          {occurrence.status === "insufficient_funds"
            ? "No se registró solo: no había fondos suficientes ese día."
            : "Automatización desactivada — esperando tu aprobación."}
        </p>
        {error && (
          <p className="mt-1 text-xs text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="destructive" size="lg" disabled={isPending} onClick={handleReject}>
          Rechazar
        </Button>
        <Button type="button" size="lg" disabled={isPending} onClick={handleApprove} className="gap-2">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Aprobar
        </Button>
      </div>
    </div>
  );
}

export function PendingRecurringOccurrences({ occurrences }: { occurrences: PendingOccurrence[] }) {
  const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
  useAchievementToasts(achievements);

  if (occurrences.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-4xl px-6 pb-8">
      <div className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-widest text-ki-survival">
        <TriangleAlert className="size-4" aria-hidden="true" />
        Pendientes de revisión
      </div>
      <div className="mt-4 rounded-xl border border-ki-survival/30 bg-void/40 px-4">
        {occurrences.map((occurrence) => (
          <OccurrenceRow key={occurrence.id} occurrence={occurrence} onAchievements={setAchievements} />
        ))}
      </div>
    </section>
  );
}
