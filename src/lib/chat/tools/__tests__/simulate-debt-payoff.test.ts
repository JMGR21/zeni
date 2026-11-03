import { describe, expect, it } from "vitest";
import { simulateDebtPayoffTool } from "@/lib/chat/tools/simulate-debt-payoff";
import { makeFakeSupabase } from "@/lib/chat/__tests__/supabase-mock";
import type { ToolContext } from "@/lib/chat/tools/types";

const USER_ID = "user-1";

function ctxWithDragons(dragons: Record<string, unknown>[]): ToolContext {
  const supabase = makeFakeSupabase({ dragons });
  return { supabase: supabase as never, userId: USER_ID, view: { pathname: "/dragons", searchParams: {} }, simulatorInput: null };
}

const amortizedDebt = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  user_id: USER_ID,
  name: id,
  type: "debt",
  status: "active",
  target_amount: 10000,
  current_amount: 2000,
  interest_rate: 36,
  minimum_payment: 500,
  extra_payment: 0,
  payment_schedule: "amortized",
  institution: null,
  ...overrides,
});

describe("simulate_debt_payoff", () => {
  it("excluye deudas fixed_weekly y deudas de Kueski/Aplazo del cálculo", async () => {
    const ctx = ctxWithDragons([
      amortizedDebt("d1"),
      amortizedDebt("d2", { interest_rate: 50 }),
      amortizedDebt("d3", { payment_schedule: "fixed_weekly" }),
      amortizedDebt("d4", { payment_schedule: "fixed_plan", institution: "kueski" }),
    ]);

    const result = (await simulateDebtPayoffTool.handler(ctx, { strategy: "avalanche" })) as {
      available: boolean;
      result: { payoffOrder: string[] };
      excluded: { name: string; reason: string }[];
    };

    expect(result.available).toBe(true);
    expect(result.result.payoffOrder.length).toBeLessThanOrEqual(2);
    expect(result.excluded).toEqual(
      expect.arrayContaining([
        { name: "d3", reason: "fixed_weekly_not_comparable" },
        { name: "d4", reason: "kueski_aplazo_not_supported" },
      ]),
    );
    expect(result.excluded).toHaveLength(2);
  });

  it("NO excluye una deuda fixed_plan que no sea de Kueski/Aplazo (el filtro es por institución, no por esquema)", async () => {
    const ctx = ctxWithDragons([
      amortizedDebt("d1"),
      amortizedDebt("d2", { payment_schedule: "fixed_plan", institution: "otra-institucion" }),
    ]);

    const result = (await simulateDebtPayoffTool.handler(ctx, { strategy: "avalanche" })) as {
      available: boolean;
      result: { payoffOrder: string[] };
      excluded: { name: string; reason: string }[];
    };

    expect(result.available).toBe(true);
    expect(result.result.payoffOrder.length).toBeLessThanOrEqual(2);
    expect(result.excluded).toEqual([]);
  });

  it("no corre la simulación si quedan menos de 2 deudas comparables, y reporta por qué se excluyó la otra", async () => {
    const ctx = ctxWithDragons([amortizedDebt("d1"), amortizedDebt("d2", { payment_schedule: "fixed_plan", institution: "aplazo" })]);

    const result = (await simulateDebtPayoffTool.handler(ctx, { strategy: "snowball" })) as {
      available: boolean;
      reason?: string;
      excluded: { name: string; reason: string }[];
    };
    expect(result.available).toBe(false);
    expect(result.reason).toBe("not_enough_comparable_debts");
    expect(result.excluded).toEqual([{ name: "d2", reason: "kueski_aplazo_not_supported" }]);
  });
});
