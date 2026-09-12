"use client";

import { useState } from "react";
import { BarList } from "@tremor/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { GiHandcuffs, GiPiggyBank } from "react-icons/gi";
import type { Dragon } from "@/components/dragon-card";

function toBarListData(dragons: Dragon[]) {
  return dragons.map((dragon) => ({
    name: dragon.name,
    value: Math.min(Math.round((dragon.current_amount / dragon.target_amount) * 100), 100),
  }));
}

function percentFormatter(value: number) {
  return `${value}%`;
}

export function DragonsProgressChart({ dragons }: { dragons: Dragon[] }) {
  const [open, setOpen] = useState(false);

  if (dragons.length < 2) return null;

  const savings = toBarListData(dragons.filter((dragon) => dragon.type === "savings"));
  const debts = toBarListData(dragons.filter((dragon) => dragon.type === "debt"));

  return (
    <div className="rounded-xl border border-ink-muted/15 bg-void/40 p-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-mono text-xs tracking-widest text-ink-muted uppercase">Comparativa de progreso</span>
        {open ? (
          <ChevronUp className="size-4 text-ink-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-4 text-ink-muted" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {savings.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
                <GiPiggyBank className="size-3.5 text-ki-saiyan" aria-hidden="true" />
                Ahorro
              </div>
              <BarList data={savings} valueFormatter={percentFormatter} />
            </div>
          )}
          {debts.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2 font-mono text-[11px] tracking-widest text-ink-muted uppercase">
                <GiHandcuffs className="size-3.5 text-ki-warrior" aria-hidden="true" />
                Deuda
              </div>
              <BarList data={debts} valueFormatter={percentFormatter} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
