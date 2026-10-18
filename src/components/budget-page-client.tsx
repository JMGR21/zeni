"use client";

import { useState } from "react";
import { cn } from "cn";
import { BudgetCategoriesView } from "@/components/budget-categories-view";
import { BudgetHistoryChart, type BudgetHistoryCategory } from "@/components/budget-history-chart";
import type { BudgetCategory, SpendingHistory } from "@/lib/budget";

const STORAGE_KEY = "zeni:budget:show-limits";

function readStoredShowLimits(): boolean {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === "true";
  } catch {
    return true;
  }
}

// Único dueño de la preferencia "mostrar límite" (persistida por viewer en
// localStorage, no en la base — es una conveniencia de presentación, no un
// dato del usuario), compartida entre el resumen+grid de categorías y el
// histórico de gasto para que ambos reaccionen juntos al mismo toggle.
export function BudgetPageClient({
  categories,
  history,
  historyCategories,
  budgetedByCategory,
  totalBudgeted,
}: {
  categories: BudgetCategory[];
  history: SpendingHistory;
  historyCategories: BudgetHistoryCategory[];
  budgetedByCategory: Record<string, number | null>;
  totalBudgeted: number;
}) {
  // Lazy initializer en vez de leer en un efecto: en el servidor
  // `window` no existe y cae a `true` (mismo default que el resto del
  // proyecto para preferencias sin guardar todavía); en el cliente lee la
  // preferencia real en el primer render, sin el cascading-render que
  // marca el lint de React Compiler para un `setState` dentro de un efecto.
  const [showLimits, setShowLimits] = useState(() =>
    typeof window === "undefined" ? true : readStoredShowLimits(),
  );

  function toggle(value: boolean) {
    setShowLimits(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value));
    } catch {}
  }

  return (
    <div>
      <div className="mt-8 flex items-center justify-end">
        <div className="flex gap-1 rounded-lg border border-ink-muted/15 bg-void/40 p-1">
          <button
            type="button"
            onClick={() => toggle(true)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
              showLimits ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
            )}
          >
            Con límite
          </button>
          <button
            type="button"
            onClick={() => toggle(false)}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
              !showLimits ? "bg-ki-awakening text-void" : "text-ink-muted hover:text-ink",
            )}
          >
            Solo gasto
          </button>
        </div>
      </div>

      <BudgetCategoriesView categories={categories} showLimits={showLimits} />

      <div className="mt-8">
        <BudgetHistoryChart
          history={history}
          categories={historyCategories}
          budgetedByCategory={budgetedByCategory}
          totalBudgeted={totalBudgeted}
          showLimits={showLimits}
        />
      </div>
    </div>
  );
}
