export type AttackOrderInfo = {
  rank: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
};

export type PriorityAssignment = { id: string; priority: number };

// Asigna prioridad secuencial a los Dragones de deuda activos que aún no
// tienen una (nunca se han reordenado manualmente), respetando el orden de
// los que ya tienen prioridad y añadiendo los nuevos al final por fecha de
// creación — así el orden de ataque siempre existe sin sorprender al usuario
// reordenando algo que ya había ajustado a mano.
export function assignMissingPriorities(
  dragons: { id: string; priority: number | null; createdAt: string }[],
): PriorityAssignment[] {
  const maxPriority = dragons.reduce((max, dragon) => Math.max(max, dragon.priority ?? 0), 0);

  const missing = dragons
    .filter((dragon) => dragon.priority === null)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return missing.map((dragon, index) => ({ id: dragon.id, priority: maxPriority + index + 1 }));
}

// Deriva el orden de ataque (posición, total, vecinos para subir/bajar) a
// partir de Dragones de deuda activos ya ordenados por prioridad ascendente.
export function getAttackOrder(orderedDebtIds: string[]): Map<string, AttackOrderInfo> {
  const total = orderedDebtIds.length;
  return new Map(
    orderedDebtIds.map((id, index) => [
      id,
      {
        rank: index + 1,
        total,
        prevId: index > 0 ? orderedDebtIds[index - 1] : null,
        nextId: index < total - 1 ? orderedDebtIds[index + 1] : null,
      },
    ]),
  );
}
