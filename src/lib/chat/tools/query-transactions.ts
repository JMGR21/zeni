import { z } from "zod";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({
  from: z.string().describe("Fecha inicial ISO (YYYY-MM-DD), inclusiva."),
  to: z.string().describe("Fecha final ISO (YYYY-MM-DD), exclusiva."),
  categoryId: z.string().uuid().optional().describe("Filtrar solo por esta categoría."),
  limit: z.number().int().min(1).max(100).optional().describe("Máximo de movimientos a devolver (por defecto 50)."),
});

type Row = {
  occurred_on: string;
  amount: number;
  type: "income" | "expense";
  category_id: string | null;
  categories: { name: string } | null;
};

export const queryTransactionsTool: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "query_transactions",
    description:
      "Lista movimientos (ingresos/gastos) del usuario en un rango de fechas, con monto, tipo y categoría. Nunca incluye la descripción libre del movimiento.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;
    const limit = input.limit ?? 50;

    let query = supabase
      .from("transactions")
      .select("occurred_on, amount, type, category_id, categories(name)")
      .eq("user_id", userId)
      .gte("occurred_on", input.from)
      .lt("occurred_on", input.to)
      .order("occurred_on", { ascending: false })
      .limit(limit);

    if (input.categoryId) {
      query = query.eq("category_id", input.categoryId);
    }

    const { data } = await query.returns<Row[]>();

    return {
      transactions: (data ?? []).map((row) => ({
        date: row.occurred_on,
        amount: row.amount,
        type: row.type,
        categoryName: row.categories?.name ?? null,
      })),
    };
  },
};
