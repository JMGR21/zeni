import { z } from "zod";

// Mismo shape que el estado de `cashflow-simulator.tsx` (horizonMonths + 4
// mapas por id + montos de ahorro por id) — usado tanto para validar el
// `simulatorInput` que manda el cliente en el body del chat como para el
// input de la tool `run_cashflow_simulation`.
export const simulatorInputOverridesSchema = z.object({
  horizonMonths: z.number().int().min(1).max(120).optional(),
  recurringEnabled: z.record(z.string(), z.boolean()).optional(),
  weeklyDebtEnabled: z.record(z.string(), z.boolean()).optional(),
  otherDebtEnabled: z.record(z.string(), z.boolean()).optional(),
  savingsEnabled: z.record(z.string(), z.boolean()).optional(),
  savingsAmount: z.record(z.string(), z.number()).optional(),
});

export type SimulatorInputOverrides = z.infer<typeof simulatorInputOverridesSchema>;
