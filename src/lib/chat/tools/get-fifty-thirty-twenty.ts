import { z } from "zod";
import { computeFiftyThirtyTwenty, getFiftyThirtyTwentyHistory } from "@/lib/fifty-thirty-twenty";
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

export const getFiftyThirtyTwenty: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_fifty_thirty_twenty",
    description:
      "Regla 50/30/20 (Necesidad/Deseo/Ahorro-Deuda) de un mes calendario: montos y porcentajes contra el ingreso de ese mes, más un historial de los últimos 6 meses. `null` si el mes no tuvo ingreso.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx, input) {
    const { supabase, userId } = ctx;
    const monthStart = monthStartFromInput(input.month);

    const [current, history] = await Promise.all([
      computeFiftyThirtyTwenty(supabase, userId, monthStart),
      getFiftyThirtyTwentyHistory(supabase, userId, 6),
    ]);

    return { current, history };
  },
};
