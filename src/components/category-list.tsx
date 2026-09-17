"use client";

import { useTransition } from "react";
import { cn } from "cn";
import { toggleCategoryActive, updateCategoryBudgetGroup } from "@/app/(app)/categories/actions";
import { DeleteCategoryDialog } from "@/components/delete-category-dialog";
import { EditCategoryDialog } from "@/components/edit-category-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export type CategoryRow = {
  id: string;
  name: string;
  type: "income" | "expense";
  active: boolean;
  budget_group?: "necesidad" | "deseo" | null;
};

const BUDGET_GROUP_LABELS: Record<string, string> = {
  necesidad: "Necesidad",
  deseo: "Deseo",
  none: "Sin clasificar",
};

function BudgetGroupSelect({ category }: { category: CategoryRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={category.budget_group ?? "none"}
      disabled={isPending}
      onValueChange={(next) => {
        if (!next) return;
        const value = next === "none" ? null : (next as "necesidad" | "deseo");
        startTransition(() => updateCategoryBudgetGroup(category.id, value));
      }}
    >
      <SelectTrigger aria-label={`Grupo 50/30/20 de ${category.name}`} className="h-8 w-34 text-xs">
        <SelectValue>{(value: string) => BUDGET_GROUP_LABELS[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="necesidad">Necesidad</SelectItem>
        <SelectItem value="deseo">Deseo</SelectItem>
        <SelectItem value="none">Sin clasificar</SelectItem>
      </SelectContent>
    </Select>
  );
}

function CategoryRowItem({ category }: { category: CategoryRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-2 border-b border-ink-muted/10 py-3 last:border-b-0">
      <span className={cn("text-sm text-ink", !category.active && "text-ink-muted")}>{category.name}</span>
      <div className="flex items-center gap-1">
        {category.type === "expense" && <BudgetGroupSelect category={category} />}
        <EditCategoryDialog categoryId={category.id} categoryName={category.name} />
        <DeleteCategoryDialog categoryId={category.id} categoryName={category.name} />
        <Switch
          checked={category.active}
          disabled={isPending}
          aria-label={`${category.active ? "Desactivar" : "Activar"} categoría ${category.name}`}
          onCheckedChange={(checked) => startTransition(() => toggleCategoryActive(category.id, checked))}
        />
      </div>
    </div>
  );
}

export function CategoryGroup({ title, categories }: { title: string; categories: CategoryRow[] }) {
  return (
    <div>
      <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">{title}</h2>
      <div className="mt-4 rounded-xl border border-ink-muted/15 bg-void/40 px-4">
        {categories.length > 0 ? (
          categories.map((category) => <CategoryRowItem key={category.id} category={category} />)
        ) : (
          <p className="py-3 text-sm text-ink-muted">Sin categorías.</p>
        )}
      </div>
    </div>
  );
}
