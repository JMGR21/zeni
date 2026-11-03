import { describe, expect, it } from "vitest";
import { runCashflowSimulationTool } from "@/lib/chat/tools/run-cashflow-simulation";
import { makeFakeSupabase } from "@/lib/chat/__tests__/supabase-mock";
import type { ToolContext } from "@/lib/chat/tools/types";

const USER_ID = "user-1";

function ctxWithDragons(dragons: Record<string, unknown>[]): ToolContext {
  const supabase = makeFakeSupabase({ dragons, recurring_transactions: [], dragon_contributions: [] });
  return { supabase: supabase as never, userId: USER_ID, view: { pathname: "/instruments/cashflow", searchParams: {} }, simulatorInput: null };
}

const kueskiDebt = {
  id: "d1",
  user_id: USER_ID,
  name: "Préstamo Kueski",
  type: "debt",
  status: "active",
  target_amount: 5000,
  current_amount: 1000,
  interest_rate: null,
  minimum_payment: 500,
  extra_payment: 0,
  payment_schedule: "fixed_plan",
  weekly_payment: null,
  total_installments: null,
  payment_day_of_week: null,
  institution: "kueski",
};

describe("run_cashflow_simulation", () => {
  it("excluye las deudas de Kueski/Aplazo del escenario y las reporta en `excluded`", async () => {
    const ctx = ctxWithDragons([kueskiDebt]);

    const result = (await runCashflowSimulationTool.handler(ctx, {})) as {
      excluded: { name: string; reason: string }[];
    };

    expect(result.excluded).toEqual([{ name: "Préstamo Kueski", reason: "kueski_aplazo_not_supported" }]);
  });

  it("no reporta ninguna exclusión cuando no hay deudas de Kueski/Aplazo", async () => {
    const ctx = ctxWithDragons([]);
    const result = (await runCashflowSimulationTool.handler(ctx, {})) as { excluded: unknown[] };
    expect(result.excluded).toEqual([]);
  });
});
