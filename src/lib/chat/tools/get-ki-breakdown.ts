import { z } from "zod";
import { calculateKi } from "@/lib/ki-engine";
import { toToolInputSchema, type ToolModule } from "@/lib/chat/tools/types";

const inputSchema = z.object({});

export const getKiBreakdown: ToolModule<z.infer<typeof inputSchema>> = {
  definition: {
    name: "get_ki_breakdown",
    description:
      "Devuelve el Ki (score de salud financiera 0-100) del usuario para el mes en curso: score, etiqueta de nivel, desglose (saludActual/momentum/presupuesto/constancia) y si se aplicó la salvaguarda.",
    input_schema: toToolInputSchema(inputSchema),
  },
  inputSchema,
  async handler(ctx) {
    const result = await calculateKi(ctx.userId);
    return {
      score: result.score,
      levelLabel: result.level.label,
      breakdown: result.breakdown,
      safeguardApplied: result.safeguardApplied,
    };
  },
};
