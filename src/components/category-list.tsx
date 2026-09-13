"use client";

import { useTransition } from "react";
import { cn } from "cn";
import { toggleCategoryActive } from "@/app/(app)/categories/actions";
import { Switch } from "@/components/ui/switch";

export type CategoryRow = {
  id: string;
  name: string;
  type: "income" | "expense";
  active: boolean;
};

function CategoryRowItem({ category }: { category: CategoryRow }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between border-b border-ink-muted/10 py-3 last:border-b-0">
      <span className={cn("text-sm text-ink", !category.active && "text-ink-muted")}>{category.name}</span>
      <Switch
        checked={category.active}
        disabled={isPending}
        onCheckedChange={(checked) => startTransition(() => toggleCategoryActive(category.id, checked))}
      />
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
