"use client";

import { useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { swapDragonPriority } from "@/app/(app)/dragons/actions";
import type { AttackOrderInfo } from "@/lib/dragon-priority";

export function AttackOrderControls({ dragonId, order }: { dragonId: string; order: AttackOrderInfo }) {
  const [isPending, startTransition] = useTransition();

  if (order.total < 2) return null;

  return (
    <div className="mt-2 flex items-center justify-between">
      <span className="font-mono text-[11px] tracking-widest text-ink-muted uppercase">
        Orden de ataque #{order.rank} de {order.total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Subir en el orden de ataque"
          disabled={isPending || !order.prevId}
          onClick={() => {
            const prevId = order.prevId;
            if (prevId) startTransition(() => swapDragonPriority(dragonId, prevId));
          }}
          className="flex size-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronUp className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Bajar en el orden de ataque"
          disabled={isPending || !order.nextId}
          onClick={() => {
            const nextId = order.nextId;
            if (nextId) startTransition(() => swapDragonPriority(dragonId, nextId));
          }}
          className="flex size-6 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-ink-muted/10 hover:text-ink disabled:pointer-events-none disabled:opacity-30"
        >
          <ChevronDown className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
