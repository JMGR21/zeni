export type LoopStopReason = "end_turn" | "tool_use" | "refusal" | "max_tokens" | "other";

/**
 * Decide si el loop de tool use del chat debe seguir iterando. Separada del
 * route handler para poder probarla sin red: el tope de iteraciones y los
 * `stop_reason` que cortan el loop son la parte con reglas, todo lo demás
 * (llamar al SDK, parsear streams) es solo glue.
 */
export function shouldContinueToolLoop(
  stopReason: LoopStopReason,
  iteration: number,
  maxIterations: number,
): boolean {
  if (stopReason !== "tool_use") return false;
  return iteration < maxIterations;
}
