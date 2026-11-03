import { z } from "zod";
import { projectDebt } from "@/lib/debt-projection";
import { computeFixedWeeklyTotals, deriveInstallmentsPaid } from "@/lib/fixed-weekly-debt";
import { isKueskiOrAplazo } from "@/lib/chat/kueski-aplazo-institutions";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  dragonId: z.string().uuid().describe("Id del Dragón a consultar."),
});

type DragonRow = {
  id: string;
  name: string;
  type: "savings" | "debt";
  status: "active" | "completed";
  target_amount: number;
  current_amount: number;
  institution: string | null;
  interest_rate: number | null;
  minimum_payment: number | null;
  extra_payment: number;
  payment_schedule: "amortized" | "fixed_plan" | "fixed_weekly" | null;
  principal_amount: number | null;
  weekly_payment: number | null;
  total_installments: number | null;
};

export const getDragonDetail: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_dragon_detail",
    description:
      "Detalle de un Dragón (meta de ahorro o deuda) del usuario, incluyendo institución y proyección (meses restantes/interés para deudas amortizadas, o totales de plazo fijo semanal). No disponible para préstamos de plazo fijo tipo Kueski/Aplazo en esta versión.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;

    const { data: dragon } = await supabase
      .from("dragons")
      .select(
        "id, name, type, status, target_amount, current_amount, institution, interest_rate, minimum_payment, extra_payment, payment_schedule, principal_amount, weekly_payment, total_installments",
      )
      .eq("id", input.dragonId)
      .eq("user_id", userId)
      .maybeSingle<DragonRow>();

    if (!dragon) {
      return { found: false };
    }

    const base = {
      found: true as const,
      id: dragon.id,
      name: dragon.name,
      type: dragon.type,
      status: dragon.status,
      targetAmount: dragon.target_amount,
      currentAmount: dragon.current_amount,
      institution: dragon.institution,
      progressPct: dragon.target_amount > 0 ? (dragon.current_amount / dragon.target_amount) * 100 : 0,
    };

    if (dragon.type === "savings") {
      return { ...base, supported: true as const };
    }

    if (isKueskiOrAplazo(dragon.institution)) {
      return { ...base, supported: false as const, reason: "not_supported_in_this_version" };
    }

    if (dragon.payment_schedule === "fixed_weekly" && dragon.weekly_payment !== null && dragon.total_installments !== null) {
      const installmentsPaid = deriveInstallmentsPaid(dragon.current_amount, dragon.weekly_payment);
      const totals = computeFixedWeeklyTotals({
        principalAmount: dragon.principal_amount ?? 0,
        weeklyPayment: dragon.weekly_payment,
        totalInstallments: dragon.total_installments,
        installmentsPaid,
      });
      return {
        ...base,
        supported: true as const,
        paymentSchedule: "fixed_weekly" as const,
        installmentsRemaining: totals.installmentsRemaining,
        totalInterest: totals.totalInterest,
      };
    }

    const pendingBalance = dragon.target_amount - dragon.current_amount;
    const projection = projectDebt({
      pendingBalance,
      annualRate: dragon.interest_rate,
      minimumPayment: dragon.minimum_payment,
      extraPayment: dragon.extra_payment,
    });

    return { ...base, supported: true as const, paymentSchedule: "amortized" as const, pendingBalance, projection };
  },
};
