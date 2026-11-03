import { describe, expect, it, vi } from "vitest";
import { makeFakeSupabase } from "@/lib/chat/__tests__/supabase-mock";

vi.mock("@/lib/ki-engine", () => ({
  calculateKi: vi.fn(async () => ({
    score: 72,
    level: { label: "Super Saiyan", colorToken: "ki-saiyan", min: 66, max: 85 },
    breakdown: { saludActual: 70, momentum: 60, presupuesto: 80, constancia: 90 },
    safeguardApplied: false,
  })),
}));
vi.mock("@/lib/grant-xp", () => ({ getTotalXp: vi.fn(async () => 1234) }));
vi.mock("@/lib/fifty-thirty-twenty", () => ({ computeFiftyThirtyTwenty: vi.fn(async () => null) }));

const { buildChatSnapshot } = await import("@/lib/chat/snapshot");

const USER_ID = "user-1";

describe("buildChatSnapshot", () => {
  it("nunca incluye institution, description, correos ni ids de auth", async () => {
    const supabase = makeFakeSupabase({
      profiles: [{ id: USER_ID, name: "Goku", month_start_day: 1, initial_balance: 0 }],
      transactions: [
        { type: "expense", amount: 100, occurred_on: "2026-11-01", description: "secreto", dragons: null },
        { type: "income", amount: 500, occurred_on: "2026-11-01", description: "secreto", dragons: null },
      ],
      dragons: [
        {
          id: "dragon-1",
          user_id: USER_ID,
          name: "Fondo de emergencia",
          type: "savings",
          status: "active",
          current_amount: 500,
          target_amount: 1000,
          priority: null,
          payment_schedule: null,
          institution: "bbva",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      dragon_contributions: [],
    });

    const snapshot = await buildChatSnapshot(supabase as never, USER_ID, { pathname: "/dashboard", searchParams: {} });

    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain("institution");
    expect(serialized).not.toContain("secreto"); // description de las transacciones
    expect(serialized).not.toContain("bbva");

    expect(snapshot.dragons).toEqual([
      {
        id: "dragon-1",
        name: "Fondo de emergencia",
        type: "savings",
        status: "active",
        progressPct: 50,
        paymentSchedule: null,
        attackOrderRank: null,
      },
    ]);
  });

  it("incluye Dragones de deuda fixed_plan (Kueski/Aplazo) en la lista básica, sin institución ni detalle calculado", async () => {
    const supabase = makeFakeSupabase({
      profiles: [{ id: USER_ID, name: "Goku", month_start_day: 1, initial_balance: 0 }],
      transactions: [],
      dragons: [
        {
          id: "dragon-kueski",
          user_id: USER_ID,
          name: "Préstamo Kueski",
          type: "debt",
          status: "active",
          current_amount: 1000,
          target_amount: 5000,
          priority: null,
          payment_schedule: "fixed_plan",
          institution: "kueski",
          created_at: "2026-01-01T00:00:00Z",
        },
      ],
      dragon_contributions: [],
    });

    const snapshot = await buildChatSnapshot(supabase as never, USER_ID, { pathname: "/dashboard", searchParams: {} });

    // La lista básica no excluye Kueski/Aplazo — solo `get_dragon_detail` lo
    // hace para su detalle calculado. El snapshot nunca expone `institution`.
    expect(snapshot.dragons).toEqual([
      {
        id: "dragon-kueski",
        name: "Préstamo Kueski",
        type: "debt",
        status: "active",
        progressPct: 20,
        paymentSchedule: "fixed_plan",
        attackOrderRank: null,
      },
    ]);
    expect(JSON.stringify(snapshot)).not.toContain("institution");
  });
});
