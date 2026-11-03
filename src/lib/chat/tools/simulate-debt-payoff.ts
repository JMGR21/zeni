import { z } from "zod";
import { simulateDebtPayoff, type DebtPayoffInput } from "@/lib/debt-payoff-simulator";
import { isKueskiOrAplazo } from "@/lib/chat/kueski-aplazo-institutions";
import type { ExcludedDebt } from "@/lib/chat/tools/excluded-debt";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  strategy: z.enum(["avalanche", "snowball"]).describe("avalanche = ataca primero la tasa más alta; snowball = ataca primero el saldo más bajo."),
  extraPayment: z.number().min(0).optional().describe("Pago extra mensual adicional a simular, repartido como ya lo hace el motor existente. Si se omite, usa el pago extra ya configurado de cada deuda."),
});

type DragonRow = {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  interest_rate: number | null;
  minimum_payment: number | null;
  extra_payment: number;
  payment_schedule: "amortized" | "fixed_plan" | "fixed_weekly" | null;
  institution: string | null;
};

export const simulateDebtPayoffTool: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "simulate_debt_payoff",
    description:
      "Simula cuánto tardarían en liquidarse las deudas activas del usuario con la estrategia avalancha o bola de nieve: meses totales, interés total y orden de liquidación. Excluye deudas de plazo fijo semanal (sin tasa mensual comparable), préstamos tipo Kueski/Aplazo (no soportados en esta versión) y deudas sin pago definido — devuelve la lista de deudas excluidas con el motivo para que puedas avisarle al usuario que el cálculo no las contempla, en vez de presentarlo como si las incluyera.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;

    const { data: dragons } = await supabase
      .from("dragons")
      .select(
        "id, name, target_amount, current_amount, interest_rate, minimum_payment, extra_payment, payment_schedule, institution",
      )
      .eq("user_id", userId)
      .eq("type", "debt")
      .eq("status", "active")
      .returns<DragonRow[]>();

    const inputs: DebtPayoffInput[] = [];
    const excluded: ExcludedDebt[] = [];

    for (const dragon of dragons ?? []) {
      if (dragon.payment_schedule === "fixed_weekly") {
        excluded.push({ name: dragon.name, reason: "fixed_weekly_not_comparable" });
        continue;
      }
      if (isKueskiOrAplazo(dragon.institution)) {
        excluded.push({ name: dragon.name, reason: "kueski_aplazo_not_supported" });
        continue;
      }

      const minimumPayment = dragon.minimum_payment ?? 0;
      const extraPayment = input.extraPayment ?? dragon.extra_payment;
      if (minimumPayment + extraPayment <= 0) {
        excluded.push({ name: dragon.name, reason: "no_payment_defined" });
        continue;
      }

      inputs.push({
        id: dragon.id,
        name: dragon.name,
        pendingBalance: dragon.target_amount - dragon.current_amount,
        monthlyRate: dragon.interest_rate ? dragon.interest_rate / 100 / 12 : 0,
        minimumPayment,
        extraPayment,
      });
    }

    if (inputs.length < 2) {
      return { available: false, reason: "not_enough_comparable_debts", excluded };
    }

    const result = simulateDebtPayoff(inputs, input.strategy);
    return { available: true, strategy: input.strategy, result, excluded };
  },
};
