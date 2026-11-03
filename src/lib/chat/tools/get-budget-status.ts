import { z } from "zod";
import { getSuggestedBudget, resolveBudgetedAmount, getCategorySpendingHistory, type BudgetCategory } from "@/lib/budget";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  month: z.string().optional().describe("Primer día del mes calendario a consultar (YYYY-MM-01). Si se omite, usa el mes en curso."),
});

function monthStartFromInput(month: string | undefined): Date {
  if (!month) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const parsed = new Date(`${month}T00:00:00`);
  return new Date(parsed.getFullYear(), parsed.getMonth(), 1);
}

export const getBudgetStatus: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_budget_status",
    description:
      "Estado del presupuesto por categoría de gasto de un mes calendario: cuánto se gastó, cuánto aplica como presupuesto (override manual o sugerencia por promedio) y de dónde viene ese monto. Incluye los últimos 3 meses de gasto total como tendencia.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;
    const monthStart = monthStartFromInput(input.month);
    const monthStartISO = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const monthEndISO = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-01`;

    const [{ data: categories }, { data: budgets }, { data: transactions }, history] = await Promise.all([
      supabase.from("categories").select("id, name").eq("user_id", userId).eq("type", "expense").eq("active", true),
      supabase.from("budgets").select("category_id, amount").eq("user_id", userId),
      supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("user_id", userId)
        .eq("type", "expense")
        .gte("occurred_on", monthStartISO)
        .lt("occurred_on", monthEndISO)
        .returns<{ category_id: string | null; amount: number }[]>(),
      getCategorySpendingHistory(supabase, userId),
    ]);

    const spentByCategory = new Map<string, number>();
    for (const row of transactions ?? []) {
      if (!row.category_id) continue;
      spentByCategory.set(row.category_id, (spentByCategory.get(row.category_id) ?? 0) + row.amount);
    }
    const budgetByCategory = new Map((budgets ?? []).map((row) => [row.category_id, row.amount]));

    const categoryStatuses = await Promise.all(
      (categories ?? []).map(async (category) => {
        const budgetCategory: BudgetCategory = {
          id: category.id,
          name: category.name,
          spent: spentByCategory.get(category.id) ?? 0,
          customAmount: budgetByCategory.get(category.id) ?? null,
          suggestion: await getSuggestedBudget(supabase, userId, category.id, monthStart),
        };
        const budgeted = resolveBudgetedAmount(budgetCategory);
        return {
          categoryId: category.id,
          categoryName: category.name,
          spent: budgetCategory.spent,
          budgeted,
          origin: budgetCategory.customAmount !== null ? "override" : budgeted !== null ? "suggestion" : "none",
        };
      }),
    );

    const recentMonths = history.month.slice(-3).map((bucket) => ({ month: bucket.label, total: bucket.total }));

    return { month: monthStartISO, categories: categoryStatuses, recentMonthsTotal: recentMonths };
  },
};
