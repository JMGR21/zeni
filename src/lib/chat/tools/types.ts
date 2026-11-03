import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ChatView } from "@/lib/chat/types";
import type { SimulatorInputOverrides } from "@/lib/chat/simulator-input-schema";

// `supabase`/`userId` siempre vienen del cierre (sesión autenticada) — ninguna
// herramienta los acepta como parte de su input, nunca se confía en lo que
// mande el modelo o el cliente para identificar al usuario.
export type ToolContext = {
  supabase: SupabaseClient;
  userId: string;
  view: ChatView;
  // Estado en vivo del simulador de flujo de efectivo (cashflow-simulator.tsx)
  // si está montado en el cliente al momento de enviar el mensaje. `null` si
  // el simulador no está abierto.
  simulatorInput: SimulatorInputOverrides | null;
};

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

export type ToolModule<TInput = unknown> = {
  definition: ToolDefinition;
  inputSchema: z.ZodType<TInput>;
  handler: (ctx: ToolContext, input: TInput) => Promise<unknown>;
};

/** JSON Schema para `tools[].input_schema` a partir de un schema zod, sin el campo `$schema` (innecesario para Anthropic). */
export function toToolInputSchema(schema: z.ZodType): Record<string, unknown> {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  const { $schema, ...rest } = jsonSchema;
  void $schema;
  return rest;
}
