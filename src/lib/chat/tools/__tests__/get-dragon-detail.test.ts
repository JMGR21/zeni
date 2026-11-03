import { describe, expect, it } from "vitest";
import { getDragonDetail } from "@/lib/chat/tools/get-dragon-detail";
import { makeFakeSupabase } from "@/lib/chat/__tests__/supabase-mock";
import type { ToolContext } from "@/lib/chat/tools/types";

const USER_ID = "user-1";

function ctxWithDragons(dragons: Record<string, unknown>[]): ToolContext {
  const supabase = makeFakeSupabase({ dragons });
  return { supabase: supabase as never, userId: USER_ID, view: { pathname: "/dragons", searchParams: {} }, simulatorInput: null };
}

describe("get_dragon_detail", () => {
  it("no devuelve datos de un Dragón de otro usuario", async () => {
    const ctx = ctxWithDragons([
      { id: "dragon-1", user_id: "otro-usuario", type: "savings", status: "active", target_amount: 1000, current_amount: 100, institution: null, payment_schedule: null },
    ]);
    const result = await getDragonDetail.handler(ctx, { dragonId: "dragon-1" });
    expect(result).toEqual({ found: false });
  });

  it("trata las deudas fixed_plan (Kueski/Aplazo) como no soportadas", async () => {
    const ctx = ctxWithDragons([
      {
        id: "dragon-2",
        user_id: USER_ID,
        name: "Préstamo Kueski",
        type: "debt",
        status: "active",
        target_amount: 5000,
        current_amount: 1000,
        institution: "kueski",
        interest_rate: null,
        minimum_payment: 500,
        extra_payment: 0,
        payment_schedule: "fixed_plan",
        principal_amount: null,
        weekly_payment: null,
        total_installments: null,
      },
    ]);
    const result = (await getDragonDetail.handler(ctx, { dragonId: "dragon-2" })) as { supported: boolean; reason?: string };
    expect(result.supported).toBe(false);
    expect(result.reason).toBe("not_supported_in_this_version");
  });

  it("NO excluye una deuda fixed_plan que no sea de Kueski/Aplazo (el filtro es por institución, no por esquema)", async () => {
    const ctx = ctxWithDragons([
      {
        id: "dragon-2b",
        user_id: USER_ID,
        name: "Préstamo de otra institución",
        type: "debt",
        status: "active",
        target_amount: 5000,
        current_amount: 1000,
        institution: "otra-institucion",
        interest_rate: null,
        minimum_payment: 500,
        extra_payment: 0,
        payment_schedule: "fixed_plan",
        principal_amount: null,
        weekly_payment: null,
        total_installments: null,
      },
    ]);
    const result = (await getDragonDetail.handler(ctx, { dragonId: "dragon-2b" })) as { supported: boolean };
    expect(result.supported).toBe(true);
  });

  it("calcula el detalle de una deuda de plazo fijo semanal (no es Kueski/Aplazo)", async () => {
    const ctx = ctxWithDragons([
      {
        id: "dragon-3",
        user_id: USER_ID,
        name: "Préstamo Banco Azteca",
        type: "debt",
        status: "active",
        target_amount: 0,
        current_amount: 400,
        institution: "azteca",
        interest_rate: null,
        minimum_payment: null,
        extra_payment: 0,
        payment_schedule: "fixed_weekly",
        principal_amount: 1000,
        weekly_payment: 100,
        total_installments: 12,
      },
    ]);
    const result = (await getDragonDetail.handler(ctx, { dragonId: "dragon-3" })) as {
      supported: boolean;
      paymentSchedule: string;
      installmentsRemaining: number;
    };
    expect(result.supported).toBe(true);
    expect(result.paymentSchedule).toBe("fixed_weekly");
    expect(result.installmentsRemaining).toBe(8);
  });

  it("calcula la proyección de una deuda amortizada normal", async () => {
    const ctx = ctxWithDragons([
      {
        id: "dragon-4",
        user_id: USER_ID,
        name: "Tarjeta BBVA",
        type: "debt",
        status: "active",
        target_amount: 10000,
        current_amount: 2000,
        institution: "bbva",
        interest_rate: 59.5,
        minimum_payment: 1000,
        extra_payment: 0,
        payment_schedule: "amortized",
        principal_amount: null,
        weekly_payment: null,
        total_installments: null,
      },
    ]);
    const result = (await getDragonDetail.handler(ctx, { dragonId: "dragon-4" })) as { supported: boolean; paymentSchedule: string };
    expect(result.supported).toBe(true);
    expect(result.paymentSchedule).toBe("amortized");
  });
});
