import { z } from "zod";
import { computePeriodStart, periodRangeFromStart, toISODate } from "@/lib/period";
import { getTotalBalance, getAvailableBalanceAsOf } from "@/lib/total-balance";
import { computeNetBalanceWithCushion } from "@/lib/monthly-balance";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  date: z.string().optional().describe("Fecha ISO (YYYY-MM-DD) dentro del periodo a consultar. Si se omite, usa el periodo actual."),
});

function dayBefore(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export const getPeriodSummary: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_period_summary",
    description:
      "Resumen de ingresos/gastos/balance del periodo financiero del usuario (el periodo configurado, que puede no ser el mes calendario) que contiene la fecha dada, o el periodo actual si no se da fecha.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;
    const reference = input.date ? new Date(`${input.date}T00:00:00`) : new Date();

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("month_start_day")
      .eq("id", userId)
      .maybeSingle<{ month_start_day: number }>();
    const monthStartDay = profileRow?.month_start_day ?? 1;

    const periodStart = computePeriodStart(reference, monthStartDay);
    const { start, end } = periodRangeFromStart(periodStart, monthStartDay);
    const startISO = toISODate(start);
    const endISO = toISODate(end);

    const [{ data: transactions }, totalBalance, availableEndOfPreviousPeriod] = await Promise.all([
      supabase
        .from("transactions")
        .select("type, amount")
        .eq("user_id", userId)
        .gte("occurred_on", startISO)
        .lt("occurred_on", endISO)
        .returns<{ type: "income" | "expense"; amount: number }[]>(),
      getTotalBalance(supabase, userId),
      getAvailableBalanceAsOf(supabase, userId, dayBefore(start)),
    ]);

    const income = (transactions ?? []).filter((row) => row.type === "income").reduce((sum, row) => sum + row.amount, 0);
    const expenses = (transactions ?? [])
      .filter((row) => row.type === "expense")
      .reduce((sum, row) => sum + row.amount, 0);
    const rawBalance = income - expenses;
    const netBalance = computeNetBalanceWithCushion(rawBalance, availableEndOfPreviousPeriod);

    return {
      period: { start: startISO, end: endISO },
      income,
      expenses,
      rawBalance,
      cushionApplied: netBalance - rawBalance,
      netBalance,
      totalBalance: totalBalance.totalBalance,
      availableBalance: totalBalance.availableBalance,
      savedInDragons: totalBalance.savedInDragons,
    };
  },
};
