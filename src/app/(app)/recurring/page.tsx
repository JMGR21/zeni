import { CreateRecurringDialog, type RecurringCategory } from "@/components/create-recurring-dialog";
import { RecurringList, type RecurringRow } from "@/components/recurring-list";
import { createClient } from "@/lib/supabase/server";

type RecurringTransactionRecord = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  frequency: "weekly" | "biweekly" | "monthly";
  day_of_week: number | null;
  day_of_month: number | null;
  next_occurrence_date: string;
  auto_apply: boolean;
  active: boolean;
  categories: { name: string } | null;
};

export default async function RecurringPage() {
  const supabase = await createClient();

  const [{ data: recurring }, { data: categories }] = await Promise.all([
    supabase
      .from("recurring_transactions")
      .select(
        "id, name, type, amount, category_id, frequency, day_of_week, day_of_month, next_occurrence_date, auto_apply, active, categories(name)",
      )
      .order("active", { ascending: false })
      .order("next_occurrence_date")
      .returns<RecurringTransactionRecord[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("active", true)
      .order("name")
      .returns<RecurringCategory[]>(),
  ]);

  const rows: RecurringRow[] = (recurring ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    type: item.type,
    amount: item.amount,
    category_id: item.category_id,
    category_name: item.categories?.name ?? null,
    frequency: item.frequency,
    day_of_week: item.day_of_week,
    day_of_month: item.day_of_month,
    next_occurrence_date: item.next_occurrence_date,
    auto_apply: item.auto_apply,
    active: item.active,
  }));

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Recurrentes</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Ingresos y gastos que se repiten — regístralos una vez y decide si se aplican solos o esperan tu
            aprobación.
          </p>
        </div>
        <CreateRecurringDialog categories={categories ?? []} />
      </div>

      <div className="mt-8">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-ink-muted">
          Tus movimientos recurrentes
        </h2>
        <div className="mt-4">
          <RecurringList items={rows} categories={categories ?? []} />
        </div>
      </div>
    </section>
  );
}
