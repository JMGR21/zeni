import {
  ProjectionLinesPanel,
  type ProjectionCategoryOption,
  type ProjectionLineRow,
  type ProjectionTransactionOption,
} from "@/components/projection-lines-panel";
import { ProjectionMonthNav } from "@/components/projection-month-nav";
import { ProjectionScenarioPanel, type ProjectionScenarioRow } from "@/components/projection-scenario-panel";
import { ProjectionSummary } from "@/components/projection-summary";
import { computeProjection, type ProjectionLineInput } from "@/lib/projection/engine";
import { parsePeriodISODate, toISODate } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";

type ProjectionLineRecord = {
  id: string;
  kind: "income" | "expense";
  label: string;
  amount: number;
  actual_amount: number | null;
  expected_date: string;
  category_id: string | null;
  source: "manual" | "budget" | "recurring" | "debt" | "transaction";
  source_ref: string | null;
  included: boolean;
  categories: { name: string } | null;
};

type TransactionRecord = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  occurred_on: string;
  categories: { name: string } | null;
};

function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export default async function ProjectionPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; scenario?: string }>;
}) {
  const params = await searchParams;
  const month = params.month ? firstDayOfMonth(parsePeriodISODate(params.month)) : firstDayOfMonth(new Date());
  const monthISO = toISODate(month);
  const monthEndISO = toISODate(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: scenarios }, { data: categories }] = await Promise.all([
    supabase
      .from("projection_scenarios")
      .select("id, month, name, opening_balance, buffer_percent")
      .eq("user_id", user.id)
      .eq("month", monthISO)
      .order("created_at")
      .returns<ProjectionScenarioRow[]>(),
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("active", true)
      .order("name")
      .returns<ProjectionCategoryOption[]>(),
  ]);

  const scenarioList = scenarios ?? [];
  const selected = scenarioList.find((scenario) => scenario.id === params.scenario) ?? scenarioList[0] ?? null;

  let lines: ProjectionLineRow[] = [];
  let importableTransactions: ProjectionTransactionOption[] = [];

  if (selected) {
    const [{ data: lineData }, { data: transactionData }] = await Promise.all([
      supabase
        .from("projection_lines")
        .select(
          "id, kind, label, amount, actual_amount, expected_date, category_id, source, source_ref, included, categories(name)",
        )
        .eq("scenario_id", selected.id)
        .order("expected_date")
        .order("sort_order")
        .returns<ProjectionLineRecord[]>(),
      supabase
        .from("transactions")
        .select("id, type, amount, description, occurred_on, categories(name)")
        .eq("user_id", user.id)
        .gte("occurred_on", monthISO)
        .lt("occurred_on", monthEndISO)
        .order("occurred_on")
        .returns<TransactionRecord[]>(),
    ]);

    lines = (lineData ?? []).map((line) => ({
      id: line.id,
      kind: line.kind,
      label: line.label,
      amount: line.amount,
      actual_amount: line.actual_amount,
      expected_date: line.expected_date,
      category_id: line.category_id,
      source: line.source,
      included: line.included,
      category_name: line.categories?.name ?? null,
    }));

    // Un movimiento ya importado a ESTE escenario no vuelve a ofrecerse —
    // dedupe por `source_ref`, que guarda el id de la transacción original.
    const alreadyImported = new Set(
      (lineData ?? []).filter((line) => line.source === "transaction" && line.source_ref).map((line) => line.source_ref),
    );
    importableTransactions = (transactionData ?? [])
      .filter((transaction) => !alreadyImported.has(transaction.id))
      .map((transaction) => ({
        id: transaction.id,
        kind: transaction.type,
        label: transaction.description || transaction.categories?.name || "Movimiento",
        amount: transaction.amount,
        expected_date: transaction.occurred_on,
      }));
  }

  const projection = selected
    ? computeProjection({
        month,
        openingBalance: selected.opening_balance,
        bufferPercent: selected.buffer_percent,
        lines: lines
          .filter((line) => line.included)
          .map(
            (line): ProjectionLineInput => ({
              kind: line.kind,
              amount: line.amount,
              actualAmount: line.actual_amount,
              expectedDate: new Date(`${line.expected_date}T00:00:00`),
              included: true,
            }),
          ),
      })
    : null;

  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Proyección</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Planea el mes antes de vivirlo: saldo final estimado, colchón y primera fecha en riesgo.
          </p>
        </div>
        <ProjectionMonthNav monthISO={monthISO} />
      </div>

      <div className="mt-8">
        <ProjectionScenarioPanel monthISO={monthISO} scenarios={scenarioList} selectedId={selected?.id ?? null} />
      </div>

      {selected && projection && (
        <>
          <div className="mt-6">
            <ProjectionSummary projection={projection} />
          </div>
          <div className="mt-6">
            <ProjectionLinesPanel
              scenarioId={selected.id}
              lines={lines}
              categories={categories ?? []}
              importableTransactions={importableTransactions}
            />
          </div>
        </>
      )}
    </section>
  );
}
