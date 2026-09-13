import { AppHeader } from "@/components/app-header";
import { CategoryGroup, type CategoryRow } from "@/components/category-list";
import { CreateCategoryDialog } from "@/components/create-category-dialog";
import { createClient } from "@/lib/supabase/server";

function sortCategories(categories: CategoryRow[]) {
  return [...categories].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, "es-MX");
  });
}

export default async function CategoriesPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, type, active")
    .returns<CategoryRow[]>();

  const incomeCategories = sortCategories((categories ?? []).filter((category) => category.type === "income"));
  const expenseCategories = sortCategories((categories ?? []).filter((category) => category.type === "expense"));

  return (
    <div className="flex min-h-dvh flex-col bg-void text-ink">
      <AppHeader active="categories" />

      <section className="mx-auto w-full max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">Categorías</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Crea las tuyas o desactiva las que no uses — desactivarlas no borra su historial.
            </p>
          </div>
          <CreateCategoryDialog />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <CategoryGroup title="Ingresos" categories={incomeCategories} />
          <CategoryGroup title="Gastos" categories={expenseCategories} />
        </div>
      </section>
    </div>
  );
}
