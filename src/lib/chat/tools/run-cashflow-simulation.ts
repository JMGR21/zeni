import { getSimulationBaseInput } from "@/lib/cashflow-simulation-data";
import { runCashflowSimulation, type SimulationInput } from "@/lib/cashflow-simulation";
import { simulatorInputOverridesSchema, type SimulatorInputOverrides } from "@/lib/chat/simulator-input-schema";
import { KUESKI_APLAZO_INSTITUTIONS } from "@/lib/chat/kueski-aplazo-institutions";
import type { ExcludedDebt } from "@/lib/chat/tools/excluded-debt";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const DEFAULT_HORIZON_MONTHS = 12;

function applyOverrides(base: Omit<SimulationInput, "horizonMonths">, overrides: SimulatorInputOverrides | null): SimulationInput {
  const recurringEnabled = overrides?.recurringEnabled ?? {};
  const weeklyDebtEnabled = overrides?.weeklyDebtEnabled ?? {};
  const otherDebtEnabled = overrides?.otherDebtEnabled ?? {};
  const savingsEnabled = overrides?.savingsEnabled ?? {};
  const savingsAmount = overrides?.savingsAmount ?? {};

  return {
    horizonMonths: overrides?.horizonMonths ?? DEFAULT_HORIZON_MONTHS,
    startingAvailableBalance: base.startingAvailableBalance,
    recurringItems: base.recurringItems.map((item) => ({
      ...item,
      enabled: recurringEnabled[item.id] ?? item.enabled,
    })),
    fixedWeeklyDebts: base.fixedWeeklyDebts.map((debt) => ({
      ...debt,
      enabled: weeklyDebtEnabled[debt.id] ?? debt.enabled,
    })),
    otherDebts: base.otherDebts.map((debt) => ({
      ...debt,
      enabled: otherDebtEnabled[debt.id] ?? debt.enabled,
    })),
    savingsDragons: base.savingsDragons.map((dragon) => ({
      ...dragon,
      enabled: savingsEnabled[dragon.id] ?? dragon.enabled,
      customMonthlyAmount: savingsAmount[dragon.id] ?? dragon.customMonthlyAmount,
    })),
  };
}

export const runCashflowSimulationTool: ToolModule<SimulatorInputOverrides> = {
  definition: {
    name: "run_cashflow_simulation",
    description:
      "Corre el simulador de flujo de efectivo (buckets de 30 días, hasta 120 meses) con los datos reales del usuario (recurrentes, deudas, Dragones de ahorro). Si el usuario tiene el simulador abierto en pantalla, usa su configuración actual como base; los parámetros de esta herramienta la sobrescriben. No persiste nada — es un escenario hipotético. Los préstamos tipo Kueski/Aplazo no se incluyen en esta versión — devuelve la lista de deudas excluidas con el motivo para que puedas avisarle al usuario que el escenario no las contempla.",
    input_schema: toToolInputSchema(simulatorInputOverridesSchema),
  },
  inputSchema: simulatorInputOverridesSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;
    const base = await getSimulationBaseInput(supabase, userId);

    // Kueski/Aplazo no se incluyen en esta versión del chat —
    // getSimulationBaseInput ya los agrupa dentro de otherDebts junto con el
    // resto de deudas amortizadas/sin interés, así que hay que sacarlos
    // explícitamente por institución (ver kueski-aplazo-institutions.ts).
    const { data: kueskiAplazoDragons } = await supabase
      .from("dragons")
      .select("id, name")
      .eq("user_id", userId)
      .eq("type", "debt")
      .in("institution", KUESKI_APLAZO_INSTITUTIONS)
      .returns<{ id: string; name: string }[]>();
    const excludedIds = new Set((kueskiAplazoDragons ?? []).map((row) => row.id));
    const excluded: ExcludedDebt[] = (kueskiAplazoDragons ?? []).map((row) => ({
      name: row.name,
      reason: "kueski_aplazo_not_supported",
    }));
    const filteredBase = { ...base, otherDebts: base.otherDebts.filter((debt) => !excludedIds.has(debt.id)) };

    const mergedOverrides: SimulatorInputOverrides = {
      ...(ctx.simulatorInput ?? {}),
      ...input,
    };

    const simulationInput = applyOverrides(filteredBase, mergedOverrides);
    const result = runCashflowSimulation(simulationInput);

    return {
      freeThisMonth: result.freeThisMonth,
      endingBalanceAtHorizon: result.endingBalanceAtHorizon,
      firstNegativeMonth: result.firstNegativeMonth
        ? { monthIndex: result.firstNegativeMonth.monthIndex, endingBalance: result.firstNegativeMonth.endingBalance }
        : null,
      monthsSimulated: result.months.length,
      excluded,
    };
  },
};
