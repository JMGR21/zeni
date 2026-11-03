import { z } from "zod";
import { computeProjection, type ProjectionLineInput } from "@/lib/projection/engine";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  scenarioId: z.string().uuid().optional().describe("Id del escenario de proyección a consultar. Si se omite, usa el de la pantalla actual o el más reciente."),
});

type ScenarioRow = { id: string; month: string; opening_balance: number; buffer_percent: number };
type LineRow = {
  kind: "income" | "expense";
  amount: number;
  actual_amount: number | null;
  expected_date: string;
  included: boolean;
};

export const getProjectionTool: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_projection",
    description:
      "Calcula la proyección de un escenario de /projection: totales de ingreso/gasto (presupuestado y real), saldo final proyectado, colchón, disponible, primer día en riesgo de quedar negativo o por debajo del colchón.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId, view } = ctx;

    const scenarioId = input.scenarioId ?? view.searchParams.scenario;

    let scenario: ScenarioRow | null = null;
    if (scenarioId) {
      const { data } = await supabase
        .from("projection_scenarios")
        .select("id, month, opening_balance, buffer_percent")
        .eq("id", scenarioId)
        .eq("user_id", userId)
        .maybeSingle<ScenarioRow>();
      scenario = data;
    }

    if (!scenario) {
      const now = new Date();
      const currentMonthISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data } = await supabase
        .from("projection_scenarios")
        .select("id, month, opening_balance, buffer_percent")
        .eq("user_id", userId)
        .eq("month", currentMonthISO)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ScenarioRow>();
      scenario = data;
    }

    if (!scenario) {
      const { data } = await supabase
        .from("projection_scenarios")
        .select("id, month, opening_balance, buffer_percent")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<ScenarioRow>();
      scenario = data;
    }

    if (!scenario) {
      return { found: false };
    }

    const { data: lineRows } = await supabase
      .from("projection_lines")
      .select("kind, amount, actual_amount, expected_date, included")
      .eq("scenario_id", scenario.id)
      .eq("user_id", userId)
      .returns<LineRow[]>();

    const lines: ProjectionLineInput[] = (lineRows ?? []).map((row) => ({
      kind: row.kind,
      amount: row.amount,
      actualAmount: row.actual_amount,
      expectedDate: new Date(`${row.expected_date}T00:00:00`),
      included: row.included,
    }));

    const month = new Date(`${scenario.month}T00:00:00`);
    const result = computeProjection({
      month,
      openingBalance: scenario.opening_balance,
      bufferPercent: scenario.buffer_percent,
      lines,
    });

    return {
      found: true,
      scenarioId: scenario.id,
      month: scenario.month,
      totalIncome: result.totalIncome,
      totalExpense: result.totalExpense,
      projectedFinal: result.projectedFinal,
      buffer: result.buffer,
      available: result.available,
      totalIncomeActual: result.totalIncomeActual,
      totalExpenseActual: result.totalExpenseActual,
      projectedFinalActual: result.projectedFinalActual,
      availableActual: result.availableActual,
      firstNegativeDate: result.firstNegativeDate?.toISOString().slice(0, 10) ?? null,
      firstBelowBufferDate: result.firstBelowBufferDate?.toISOString().slice(0, 10) ?? null,
      dailySpendAvailable: result.dailySpendAvailable,
    };
  },
};
