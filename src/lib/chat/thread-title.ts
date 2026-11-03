const MAX_TITLE_LENGTH = 60;

/**
 * Título inicial de un hilo nuevo, derivado del primer mensaje del usuario
 * — editable después vía `PATCH /api/chat/threads/[id]`, mismo espíritu que
 * "Nueva conversación" (default de la columna) pero ya identificable en la
 * lista de historial sin tener que abrir cada hilo.
 */
export function deriveThreadTitle(message: string): string {
  const singleLine = message.replace(/\s+/g, " ").trim();
  if (!singleLine) return "Nueva conversación";
  return singleLine.length > MAX_TITLE_LENGTH ? `${singleLine.slice(0, MAX_TITLE_LENGTH - 1)}…` : singleLine;
}
